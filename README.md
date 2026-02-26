# Yantra Frontend Tech Test

A simple API serving trade data for you to build a frontend on top of. The backend is a FastAPI app backed by a pre-populated SQLite database -- no external services or credentials required.

## Getting Started

### Option A: Docker Compose (recommended)

```bash
docker compose up
```

The API will be available at **<http://localhost:8000>**. The `data/` directory is mounted as a volume, so any feedback you POST will persist across restarts.

### Option B: Run locally with uv

Requires [uv](https://docs.astral.sh/uv/) and Python 3.13+.

```bash
uv sync
uv run uvicorn src.main:app --reload
```

The API will be available at **<http://localhost:8000>**. The `--reload` flag enables hot-reloading on code changes.

## API Endpoints

Interactive docs are available at <http://localhost:8000/docs> once the server is running.

### `GET /api/trades`

Returns all trades. Supports optional status filtering via query parameters.

```
GET /api/trades
GET /api/trades?status=dispute
GET /api/trades?status=dispute&status=submitted
```

### `GET /api/trades/{trade_id}`

Returns a single trade by its UUID, including its associated **emails** and any **feedback** that has been submitted.

### `POST /api/trades/{trade_id}/feedback`

Submit feedback on a trade. Only trades in a **break status** (`dispute`) accept feedback. Returns `400` for non-broken trades.

```json
{ "content": "Contacted counterparty -- awaiting response." }
```

### `WS /ws/assistant`

A WebSocket endpoint that simulates a streaming AI assistant. Connect to `ws://localhost:8000/ws/assistant` and exchange JSON messages:

**Send:**

```json
{ "message": "What should I do about this trade break?" }
```

**Receive (streamed token by token):**

```json
{ "token": "Based " }
{ "token": "on " }
{ "token": "my " }
...
{ "done": true }
```

Each `token` frame contains one word (with trailing space). The final frame has `{"done": true}` to signal the response is complete. The connection stays open for multiple exchanges.

## Data Model

### Trade

| Field              | Type         | Description                                |
| ------------------ | ------------ | ------------------------------------------ |
| `id`               | UUID         | Unique identifier                          |
| `trade_id`         | string       | External trade ID (e.g. MarkitWire)        |
| `counterparty_name`| string       | Name of the counterparty                   |
| `status`           | TradeStatus  | Current status of the trade                |
| `currency_code`    | string       | ISO 4217 currency code                     |
| `notional_amount`  | float        | Notional amount of the trade               |
| `trade_date`       | date         | When the trade was executed                |
| `maturity_date`    | date or null | When the trade matures                     |
| `product_type`     | string       | Instrument type (e.g. Interest Rate Swap)  |
| `has_feedback`     | boolean      | Whether feedback has been submitted         |

### Trade Statuses

Trades fall into two categories:

**Break status** (requires attention, accepts feedback):

- `dispute` -- both parties have booked a trade but there are discrepancies in the details

**Non-break statuses:**
`submitted`, `confirmed`, `deleted`, `error`

### Email

Each trade has an associated email thread. Emails have a sender, recipients, CC list, subject, and plain-text body.

### Feedback

User-submitted notes on broken trades. Contains a `content` string and a `created_at` timestamp.

## Resetting the Database

The SQLite database ships pre-populated with test data. To reset it to its original state:

```bash
uv run python -m src.seed
```
