from __future__ import annotations

import asyncio
import random
import uuid
from contextlib import contextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import create_feedback, get_all_trades, get_db, get_trade_by_id
from .models import (
    Feedback,
    FeedbackCreate,
    Trade,
    TradeDetail,
    TradeStatus,
)

app = FastAPI(
    title="Yantra Trade API",
    description="A simple API serving trade data for the Yantra front-end tech test.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@contextmanager
def _db():
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()


@app.get("/api/trades", response_model=list[Trade])
def list_trades(
    status: Annotated[list[TradeStatus] | None, Query()] = None,
) -> list[Trade]:
    """List all trades, optionally filtered by one or more statuses."""
    with _db() as conn:
        return get_all_trades(conn, statuses=status)


@app.get("/api/trades/{trade_id}", response_model=TradeDetail)
def get_trade(trade_id: uuid.UUID) -> TradeDetail:
    """Get a single trade with its emails and feedback."""
    with _db() as conn:
        trade = get_trade_by_id(conn, trade_id)

    if trade is None:
        raise HTTPException(status_code=404, detail="Trade not found")

    return trade


@app.post(
    "/api/trades/{trade_id}/feedback",
    response_model=Feedback,
    status_code=201,
)
def submit_feedback(trade_id: uuid.UUID, body: FeedbackCreate) -> Feedback:
    """Submit feedback for a broken trade.

    Only trades with a break status (dispute) accept feedback.
    """
    with _db() as conn:
        try:
            return create_feedback(conn, trade_id=trade_id, content=body.content)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# WebSocket: simulated AI assistant
# ---------------------------------------------------------------------------

_CANNED_RESPONSES = [
    (
        "Based on my analysis of this trade, the most likely cause of the break is a mismatch "
        "in the notional amount between our booking and the counterparty's records. I'd recommend "
        "reaching out to their operations desk to confirm the agreed-upon terms from the original "
        "trade confirmation. In the meantime, you could check whether there were any amendments "
        "submitted after the initial booking that might explain the discrepancy."
    ),
    (
        "Looking at the trade details, this appears to be a timing issue. The counterparty may "
        "have booked the trade under a different value date, which would explain why our systems "
        "aren't matching. I'd suggest comparing the full trade economics side by side — "
        "particularly the effective date, maturity date, and payment frequency. If those align, "
        "the issue is likely in the trade ID mapping between systems."
    ),
    (
        "I've seen similar patterns with this counterparty before. Their system sometimes splits "
        "block trades into individual allocations before sending confirmations, which can cause "
        "alleged breaks on our side. You should check whether this trade was part of a larger "
        "block and whether the individual legs have been matched separately. If so, you can "
        "link them manually in the system."
    ),
    (
        "This break looks like it could be related to a currency mismatch. The trade was booked "
        "in USD on our side, but the counterparty may have it denominated in a different currency. "
        "This sometimes happens with cross-currency swaps where the two legs are booked separately. "
        "I'd recommend pulling up the original term sheet to verify the agreed currency pair and "
        "then reconciling with the counterparty's booking."
    ),
    (
        "From what I can see, the counterparty has acknowledged the trade but with different "
        "economic terms. The fixed rate on their side doesn't match ours, which is the primary "
        "source of the dispute. This typically needs to be escalated to the trader who executed "
        "the deal so they can confirm the correct rate. Once confirmed, the team with the "
        "incorrect booking should amend their entry."
    ),
    (
        "This trade has been in an alleged state for several days now. The recommended next step "
        "is to send a formal inquiry to the counterparty's middle office team. You should include "
        "the trade ID, trade date, product type, and notional amount so they can search their "
        "systems. If they can't locate it, we may need to cancel and rebook depending on the "
        "trader's instruction."
    ),
    (
        "I notice this trade has multiple feedback entries already, which suggests it's been "
        "looked at before without resolution. Based on the history, it seems like the main "
        "blocker is getting a response from the counterparty. I'd recommend escalating through "
        "your relationship manager to apply some pressure. For compliance purposes, make sure "
        "all communication attempts are documented in the feedback trail."
    ),
]


@app.websocket("/ws/assistant")
async def assistant_websocket(websocket: WebSocket) -> None:
    """Simulated AI assistant that streams back token-by-token responses.

    Protocol:
      1. Client sends a JSON message: {"message": "user's question"}
      2. Server streams back JSON frames: {"token": "word "} for each token
      3. Server sends a final frame: {"done": true} to signal end of response
    """
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            user_message = data.get("message", "")

            if not user_message:
                await websocket.send_json({"error": "No message provided"})
                continue

            response = random.choice(_CANNED_RESPONSES)
            tokens = response.split(" ")

            for i, token in enumerate(tokens):
                separator = " " if i < len(tokens) - 1 else ""
                await websocket.send_json({"token": token + separator})
                await asyncio.sleep(random.uniform(0.02, 0.08))

            await websocket.send_json({"done": True})

    except WebSocketDisconnect:
        pass
