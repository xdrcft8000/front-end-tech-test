"""Seed script to populate data/trades.db with realistic test data.

Run with:  uv run python -m src.seed
"""

from __future__ import annotations

import json
import random
import uuid
from datetime import date, datetime, timedelta, timezone

from .database import DB_PATH, get_db
from .models import BREAK_STATUSES, TradeStatus

# ---------------------------------------------------------------------------
# Deterministic randomness so re-runs produce the same data
# ---------------------------------------------------------------------------
RNG = random.Random(42)

# ---------------------------------------------------------------------------
# Lookup tables
# ---------------------------------------------------------------------------

COUNTERPARTIES = [
    "Goldman Sachs",
    "JP Morgan Chase",
    "Morgan Stanley",
    "Barclays Capital",
    "Deutsche Bank",
    "UBS",
    "Citigroup",
    "HSBC",
    "BNP Paribas",
    "Credit Suisse",
    "Nomura",
    "Bank of America",
]

PRODUCT_TYPES = [
    "Interest Rate Swap",
    "Credit Default Swap",
    "FX Forward",
    "FX Option",
    "Equity Swap",
    "Commodity Swap",
    "Swaption",
    "Cross Currency Swap",
    "Total Return Swap",
    "Variance Swap",
]

CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD"]

STATUS_WEIGHTS: dict[TradeStatus, int] = {
    TradeStatus.DISPUTE: 8,
    TradeStatus.SUBMITTED: 4,
    TradeStatus.CONFIRMED: 5,
    TradeStatus.DELETED: 1,
    TradeStatus.ERROR: 2,
}

PEOPLE = [
    ("Ana Lucia Cortez", "alice.chen@bankco.com"),
    ("Benjamin Linus", "benjamin.linus@bankco.com"),
    ("Charlie Pace", "charlie.pace@bankco.com"),
    ("Desmond Hume", "desmond.hume@bankco.com"),
    ("Eko", "eko@bankco.com"),
    ("Frank Lapidus", "frank.lapidus@hedgeco.com"),
    ("Goodwin Stanhope", "goodwin.stanhope@hedgeco.com"),
    ("Hugo Reyes", "hugo.reyes@tradingltd.com"),
    ("Ilana Verdansky", "ilana.verdansky@tradingltd.com"),
    ("John Locke", "john.locke@clearinghouse.com"),
]


def _random_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=RNG.randint(0, delta))


def _random_datetime(base_date: date, offset_days: int = 0) -> str:
    dt = datetime(
        base_date.year,
        base_date.month,
        base_date.day,
        RNG.randint(7, 18),
        RNG.randint(0, 59),
        RNG.randint(0, 59),
        tzinfo=timezone.utc,
    ) + timedelta(days=offset_days)
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Email generation
# ---------------------------------------------------------------------------

BREAK_EMAIL_SUBJECTS = [
    "RE: Trade break - {trade_id} - action required",
    "RE: Discrepancy on trade {trade_id}",
    "FW: Unmatched trade {trade_id} - please review",
    "Trade {trade_id} - counterparty follow-up",
    "Urgent: Trade {trade_id} reconciliation needed",
]

NORMAL_EMAIL_SUBJECTS = [
    "Trade confirmation - {trade_id}",
    "RE: {product_type} booking - {trade_id}",
    "FW: {counterparty} trade {trade_id} - status update",
    "Trade {trade_id} - processing complete",
]

BREAK_EMAIL_BODIES = [
    (
        "Hi team,\n\nWe've identified a break on trade {trade_id} with {counterparty}. "
        "The {product_type} has a notional of {notional} {currency} and the counterparty's "
        "records don't match ours.\n\nCould someone please review and reach out to the "
        "counterparty to resolve?\n\nThanks,\n{sender}"
    ),
    (
        "Hi,\n\nFollowing up on the unmatched {product_type} trade {trade_id}. "
        "We booked this on {trade_date} but {counterparty} has no record of it. "
        "Please investigate and update the ticket when resolved.\n\nRegards,\n{sender}"
    ),
    (
        "Team,\n\nThe disputed fields on trade {trade_id} with {counterparty} are still "
        "outstanding. Key discrepancy is on the notional amount — we have {notional} {currency} "
        "and they're showing a different figure.\n\nLet's get this sorted before end of week.\n\n"
        "Best,\n{sender}"
    ),
    (
        "Hi all,\n\nJust a heads up — {counterparty} has alleged a {product_type} trade "
        "(their ref: {trade_id}) that we don't have on our books. Need someone to check whether "
        "this was booked under a different ID or if it's genuinely missing.\n\nCheers,\n{sender}"
    ),
    (
        "Hello,\n\nI've been looking into trade {trade_id} and it seems like the maturity "
        "dates don't align between our system and {counterparty}'s. Ours shows {maturity_date} "
        "but theirs is different.\n\nCan we schedule a call to discuss?\n\nThanks,\n{sender}"
    ),
]

NORMAL_EMAIL_BODIES = [
    (
        "Hi,\n\nConfirming that trade {trade_id} ({product_type}) with {counterparty} has been "
        "successfully processed. Notional: {notional} {currency}, trade date: {trade_date}.\n\n"
        "No further action needed.\n\nBest,\n{sender}"
    ),
    (
        "Team,\n\nThe {product_type} trade {trade_id} has been matched and confirmed with "
        "{counterparty}. All details are in order.\n\nRegards,\n{sender}"
    ),
    (
        "Hi,\n\nPlease note that trade {trade_id} has been submitted to {counterparty} for "
        "confirmation. We expect a response within the standard SLA.\n\nThanks,\n{sender}"
    ),
]

FEEDBACK_SAMPLES = [
    "Contacted {counterparty} operations desk — they're looking into it. Will follow up tomorrow.",
    "Checked our booking system; trade was entered correctly on our side. Discrepancy is on counterparty's end.",
    "Spoke with {counterparty} — they confirm they have no record. Likely a systems issue on their side.",
    "Escalated to senior trader. The notional amount needs to be verified against the term sheet.",
    "Counterparty says they booked under a different trade ID. Working to reconcile.",
    "Reviewed the original confirmation email — details match our booking. Sending comparison to {counterparty}.",
    "This looks like a duplicate allegation. Checking if it maps to an existing trade.",
    "Requested updated trade details from {counterparty}. Awaiting response.",
]


def _generate_emails(
    trade: dict,
    count: int,
) -> list[dict]:
    is_broken = TradeStatus(trade["status"]) in BREAK_STATUSES
    subjects = BREAK_EMAIL_SUBJECTS if is_broken else NORMAL_EMAIL_SUBJECTS
    bodies = BREAK_EMAIL_BODIES if is_broken else NORMAL_EMAIL_BODIES

    emails = []
    base_date = date.fromisoformat(trade["trade_date"])

    for i in range(count):
        sender = RNG.choice(PEOPLE)
        recipients = RNG.sample([p for p in PEOPLE if p != sender], k=RNG.randint(1, 3))
        cc = RNG.sample([p for p in PEOPLE if p != sender and p not in recipients], k=RNG.randint(0, 2))

        fmt_kwargs = {
            "trade_id": trade["trade_id"],
            "counterparty": trade["counterparty_name"],
            "product_type": trade["product_type"],
            "notional": f"{trade['notional_amount']:,.2f}",
            "currency": trade["currency_code"],
            "trade_date": trade["trade_date"],
            "maturity_date": trade.get("maturity_date", "N/A"),
            "sender": sender[0],
        }

        subject = RNG.choice(subjects).format(**fmt_kwargs)
        body = RNG.choice(bodies).format(**fmt_kwargs)

        emails.append({
            "trade_id": trade["id"],
            "from_name": sender[0],
            "from_address": sender[1],
            "to_recipients": json.dumps([{"name": r[0], "address": r[1]} for r in recipients]),
            "cc_recipients": json.dumps([{"name": c[0], "address": c[1]} for c in cc]),
            "subject": subject,
            "body": body,
            "sent_at": _random_datetime(base_date, offset_days=i),
        })

    return emails


EVENT_TEMPLATES: list[dict] = [
    {
        "action": "trade_booked",
        "actor_pool": "system",
        "summary": "Trade {trade_id} booked with {counterparty} — {product_type}, {notional} {currency}.",
    },
    {
        "action": "status_change",
        "actor_pool": "system",
        "summary": "Status changed to {status}.",
        "metadata_keys": ["old_status", "new_status"],
    },
    {
        "action": "counterparty_notified",
        "actor_pool": "people",
        "summary": "Counterparty {counterparty} notified about trade {trade_id}.",
    },
    {
        "action": "email_received",
        "actor_pool": "people",
        "summary": "Email received from {counterparty} regarding trade {trade_id}.",
    },
    {
        "action": "assigned",
        "actor_pool": "people",
        "summary": "Trade {trade_id} assigned to {actor} for review.",
    },
    {
        "action": "feedback_added",
        "actor_pool": "people",
        "summary": "Feedback submitted on trade {trade_id}.",
    },
    {
        "action": "escalated",
        "actor_pool": "people",
        "summary": "Trade {trade_id} escalated to senior operations.",
    },
]

PREVIOUS_STATUSES = ["submitted", "confirmed", "dispute", "error"]


def _generate_event_logs(trade: dict) -> list[dict]:
    base_date = date.fromisoformat(trade["trade_date"])
    status = trade["status"]

    events: list[dict] = []

    booked_template = EVENT_TEMPLATES[0]
    fmt = {
        "trade_id": trade["trade_id"],
        "counterparty": trade["counterparty_name"],
        "product_type": trade["product_type"],
        "notional": f"{trade['notional_amount']:,.2f}",
        "currency": trade["currency_code"],
        "status": status,
        "actor": "",
    }
    events.append({
        "trade_id": trade["id"],
        "timestamp": _random_datetime(base_date, offset_days=0),
        "actor": "system",
        "action": booked_template["action"],
        "summary": booked_template["summary"].format(**fmt),
        "metadata": json.dumps({}),
    })

    extra_count = RNG.randint(1, 4)
    for i in range(extra_count):
        template = RNG.choice(EVENT_TEMPLATES[1:])
        actor = (
            "system"
            if template["actor_pool"] == "system"
            else RNG.choice(PEOPLE)[0]
        )
        fmt["actor"] = actor

        meta = {}
        if template["action"] == "status_change":
            meta["old_status"] = RNG.choice(PREVIOUS_STATUSES)
            meta["new_status"] = status

        events.append({
            "trade_id": trade["id"],
            "timestamp": _random_datetime(base_date, offset_days=i + 1),
            "actor": actor,
            "action": template["action"],
            "summary": template["summary"].format(**fmt),
            "metadata": json.dumps(meta),
        })

    return events


def _generate_feedback(trade: dict, count: int) -> list[dict]:
    base_date = date.fromisoformat(trade["trade_date"])
    items = []
    for i in range(count):
        template = RNG.choice(FEEDBACK_SAMPLES)
        content = template.format(counterparty=trade["counterparty_name"])
        items.append({
            "trade_id": trade["id"],
            "content": content,
            "created_at": _random_datetime(base_date, offset_days=i + 1),
        })
    return items


# ---------------------------------------------------------------------------
# Main seed logic
# ---------------------------------------------------------------------------


def seed() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = get_db()

    statuses = list(STATUS_WEIGHTS.keys())
    weights = list(STATUS_WEIGHTS.values())

    trades: list[dict] = []
    all_emails: list[dict] = []
    all_feedback: list[dict] = []
    all_events: list[dict] = []

    for _ in range(40):
        status = RNG.choices(statuses, weights=weights, k=1)[0]
        trade_date = _random_date(date(2024, 1, 1), date(2025, 6, 30))

        has_maturity = RNG.random() > 0.15
        maturity_date = (
            _random_date(trade_date + timedelta(days=30), trade_date + timedelta(days=3650))
            if has_maturity
            else None
        )

        trade = {
            "id": str(uuid.UUID(int=RNG.getrandbits(128))),
            "trade_id": f"MW-{RNG.randint(100000, 999999)}",
            "counterparty_name": RNG.choice(COUNTERPARTIES),
            "status": status.value,
            "currency_code": RNG.choice(CURRENCIES),
            "notional_amount": round(RNG.uniform(100_000, 500_000_000), 2),
            "trade_date": trade_date.isoformat(),
            "maturity_date": maturity_date.isoformat() if maturity_date else None,
            "product_type": RNG.choice(PRODUCT_TYPES),
        }
        trades.append(trade)

        email_count = RNG.randint(2, 5)
        all_emails.extend(_generate_emails(trade, email_count))

        all_events.extend(_generate_event_logs(trade))

        if status in BREAK_STATUSES and RNG.random() > 0.4:
            feedback_count = RNG.randint(1, 3)
            all_feedback.extend(_generate_feedback(trade, feedback_count))

    conn.executemany(
        """INSERT INTO trades (id, trade_id, counterparty_name, status, currency_code,
           notional_amount, trade_date, maturity_date, product_type)
           VALUES (:id, :trade_id, :counterparty_name, :status, :currency_code,
           :notional_amount, :trade_date, :maturity_date, :product_type)""",
        trades,
    )

    conn.executemany(
        """INSERT INTO emails (trade_id, from_name, from_address, to_recipients,
           cc_recipients, subject, body, sent_at)
           VALUES (:trade_id, :from_name, :from_address, :to_recipients,
           :cc_recipients, :subject, :body, :sent_at)""",
        all_emails,
    )

    conn.executemany(
        "INSERT INTO feedback (trade_id, content, created_at) VALUES (:trade_id, :content, :created_at)",
        all_feedback,
    )

    conn.executemany(
        """INSERT INTO event_logs (trade_id, timestamp, actor, action, summary, metadata)
           VALUES (:trade_id, :timestamp, :actor, :action, :summary, :metadata)""",
        all_events,
    )

    conn.commit()
    conn.close()

    trade_count = len(trades)
    email_count = len(all_emails)
    feedback_count = len(all_feedback)
    event_count = len(all_events)
    broken_count = sum(1 for t in trades if TradeStatus(t["status"]) in BREAK_STATUSES)

    print(f"Seeded {trade_count} trades ({broken_count} broken), {email_count} emails, {feedback_count} feedback, {event_count} events")
    print(f"Database: {DB_PATH}")


if __name__ == "__main__":
    seed()
