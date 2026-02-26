from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, Field


class TradeStatus(enum.StrEnum):
    """The status of a trade."""

    DISPUTE = enum.auto()
    SUBMITTED = enum.auto()
    CONFIRMED = enum.auto()
    DELETED = enum.auto()
    ERROR = enum.auto()


BREAK_STATUSES: frozenset[TradeStatus] = frozenset({
    TradeStatus.DISPUTE,
})


class EmailRecipient(BaseModel):
    name: str
    address: str | None = None


class Email(BaseModel):
    """A single email associated with a trade."""

    id: int
    from_name: Annotated[str, Field(description="Display name of the sender.")]
    from_address: Annotated[str, Field(description="Email address of the sender.")]
    to: Annotated[list[EmailRecipient], Field(description="To recipients.")]
    cc: Annotated[list[EmailRecipient], Field(default_factory=list, description="CC recipients.")]
    subject: Annotated[str | None, Field(description="Subject line.")]
    body: Annotated[str | None, Field(description="Plain-text body.")]
    sent_at: Annotated[datetime | None, Field(description="When the email was sent.")]


class Feedback(BaseModel):
    """User-submitted feedback on a broken trade."""

    id: int
    trade_id: uuid.UUID
    content: Annotated[str, Field(description="The feedback text.")]
    created_at: datetime


class FeedbackCreate(BaseModel):
    """Request body for submitting feedback."""

    content: Annotated[str, Field(min_length=1, max_length=5000, description="The feedback text.")]


class EventLog(BaseModel):
    """An event in a trade's activity history."""

    id: int
    trade_id: uuid.UUID
    timestamp: datetime
    actor: Annotated[str, Field(description="Who or what triggered the event (user name or system).")]
    action: Annotated[str, Field(description="Short label for the action, e.g. 'status_change', 'feedback_added'.")]
    summary: Annotated[str, Field(description="Human-readable description of what happened.")]
    metadata: Annotated[dict[str, str], Field(default_factory=dict, description="Arbitrary key-value pairs with extra context.")]


class Trade(BaseModel):
    """Summary representation of a trade."""

    id: uuid.UUID
    trade_id: Annotated[str, Field(description="External trade identifier (e.g. MarkitWire ID).")]
    counterparty_name: str
    status: TradeStatus
    currency_code: Annotated[str, Field(description="ISO 4217 currency code.")]
    notional_amount: float
    trade_date: date
    maturity_date: date | None = None
    product_type: str
    has_feedback: Annotated[bool, Field(description="Whether any feedback has been submitted for this trade.")]


class TradeDetail(Trade):
    """Full trade representation including emails and feedback."""

    emails: list[Email] = []
    feedback: list[Feedback] = []
