from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import (
    BREAK_STATUSES,
    Email,
    EmailRecipient,
    Feedback,
    Trade,
    TradeDetail,
    TradeStatus,
)

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "trades.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS trades (
    id              TEXT PRIMARY KEY,
    trade_id        TEXT NOT NULL,
    counterparty_name TEXT NOT NULL,
    status          TEXT NOT NULL,
    currency_code   TEXT NOT NULL,
    notional_amount REAL NOT NULL,
    trade_date      TEXT NOT NULL,
    maturity_date   TEXT,
    product_type    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emails (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id        TEXT NOT NULL REFERENCES trades(id),
    from_name       TEXT NOT NULL,
    from_address    TEXT NOT NULL,
    to_recipients   TEXT NOT NULL,  -- JSON array
    cc_recipients   TEXT NOT NULL DEFAULT '[]',  -- JSON array
    subject         TEXT,
    body            TEXT,
    sent_at         TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id        TEXT NOT NULL REFERENCES trades(id),
    content         TEXT NOT NULL,
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id        TEXT NOT NULL REFERENCES trades(id),
    timestamp       TEXT NOT NULL,
    actor           TEXT NOT NULL,
    action          TEXT NOT NULL,
    summary         TEXT NOT NULL,
    metadata        TEXT NOT NULL DEFAULT '{}'  -- JSON object
);
"""


def get_db() -> sqlite3.Connection:
    """Open a connection to the SQLite database, creating tables if needed."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA)
    return conn


def _parse_recipients(raw: str) -> list[EmailRecipient]:
    return [EmailRecipient(**r) for r in json.loads(raw)]


def _row_to_email(row: sqlite3.Row) -> Email:
    return Email(
        id=row["id"],
        from_name=row["from_name"],
        from_address=row["from_address"],
        to=_parse_recipients(row["to_recipients"]),
        cc=_parse_recipients(row["cc_recipients"]),
        subject=row["subject"],
        body=row["body"],
        sent_at=row["sent_at"],
    )


def _row_to_feedback(row: sqlite3.Row) -> Feedback:
    return Feedback(
        id=row["id"],
        trade_id=uuid.UUID(row["trade_id"]),
        content=row["content"],
        created_at=row["created_at"],
    )


def _row_to_trade(row: sqlite3.Row, *, has_feedback: bool) -> Trade:
    return Trade(
        id=uuid.UUID(row["id"]),
        trade_id=row["trade_id"],
        counterparty_name=row["counterparty_name"],
        status=TradeStatus(row["status"]),
        currency_code=row["currency_code"],
        notional_amount=row["notional_amount"],
        trade_date=row["trade_date"],
        maturity_date=row["maturity_date"],
        product_type=row["product_type"],
        has_feedback=has_feedback,
    )


def get_all_trades(
    conn: sqlite3.Connection,
    *,
    statuses: list[TradeStatus] | None = None,
) -> list[Trade]:
    """Return all trades, optionally filtered by status."""
    query = """
        SELECT t.*,
               EXISTS(SELECT 1 FROM feedback f WHERE f.trade_id = t.id) AS has_feedback
        FROM trades t
    """
    params: list[Any] = []

    if statuses:
        placeholders = ",".join("?" for _ in statuses)
        query += f" WHERE t.status IN ({placeholders})"
        params.extend(s.value for s in statuses)

    query += " ORDER BY t.trade_date DESC"

    rows = conn.execute(query, params).fetchall()
    return [_row_to_trade(r, has_feedback=bool(r["has_feedback"])) for r in rows]


def get_trade_by_id(conn: sqlite3.Connection, trade_id: uuid.UUID) -> TradeDetail | None:
    """Return a single trade with its emails and feedback, or None if not found."""
    row = conn.execute(
        """
        SELECT t.*,
               EXISTS(SELECT 1 FROM feedback f WHERE f.trade_id = t.id) AS has_feedback
        FROM trades t WHERE t.id = ?
        """,
        (str(trade_id),),
    ).fetchone()

    if row is None:
        return None

    email_rows = conn.execute(
        "SELECT * FROM emails WHERE trade_id = ? ORDER BY sent_at ASC",
        (str(trade_id),),
    ).fetchall()

    feedback_rows = conn.execute(
        "SELECT * FROM feedback WHERE trade_id = ? ORDER BY created_at DESC",
        (str(trade_id),),
    ).fetchall()

    return TradeDetail(
        id=uuid.UUID(row["id"]),
        trade_id=row["trade_id"],
        counterparty_name=row["counterparty_name"],
        status=TradeStatus(row["status"]),
        currency_code=row["currency_code"],
        notional_amount=row["notional_amount"],
        trade_date=row["trade_date"],
        maturity_date=row["maturity_date"],
        product_type=row["product_type"],
        has_feedback=bool(row["has_feedback"]),
        emails=[_row_to_email(e) for e in email_rows],
        feedback=[_row_to_feedback(f) for f in feedback_rows],
    )


def create_feedback(
    conn: sqlite3.Connection,
    *,
    trade_id: uuid.UUID,
    content: str,
) -> Feedback:
    """Insert feedback for a trade and return the created record.

    Raises ValueError if the trade does not exist or is not in a broken status.
    """
    row = conn.execute("SELECT status FROM trades WHERE id = ?", (str(trade_id),)).fetchone()

    if row is None:
        raise ValueError(f"Trade {trade_id} not found")

    status = TradeStatus(row["status"])
    if status not in BREAK_STATUSES:
        raise ValueError(
            f"Feedback can only be submitted for trades in a broken status "
            f"({', '.join(s.value for s in BREAK_STATUSES)}), but this trade is '{status.value}'"
        )

    now = datetime.now(tz=timezone.utc).isoformat()
    cursor = conn.execute(
        "INSERT INTO feedback (trade_id, content, created_at) VALUES (?, ?, ?)",
        (str(trade_id), content, now),
    )
    conn.commit()

    return Feedback(
        id=cursor.lastrowid,  # type: ignore[arg-type]
        trade_id=trade_id,
        content=content,
        created_at=now,  # type: ignore[arg-type]
    )
