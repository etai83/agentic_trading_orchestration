# Phase 1 ops dashboard — HTTP API and mock/live (locked)

Source: [Grilling: Dashboard HTTP API and mock/live modes](https://github.com/etai83/agentic_trading_orchestration/issues/15).  
Map: [Map: Phase 1 orchestration ops dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/11).  
Related: IA `ops-dashboard-ia.md`, graph `ops-dashboard-graph.md`, store `phase1-knowledge-store.md`, stack research `docs/research/ops-dashboard-stack-patterns.md`.  
Deferred interiors: event payload vocabulary → events ticket; gate authority vs file-queue → gates ticket.

## Architecture rules

| Rule | Decision |
|---|---|
| Transport | Next.js same-origin **`/api/*`** rewrite → FastAPI on `127.0.0.1` |
| Prefix | **`/api/v1`** on the Python app |
| Format | JSON request/response (SSE is text/event-stream with JSON data lines) |
| Domain access | **Only** via `KnowledgeGraph` or a mock that implements the **same async method surface** — no ad-hoc SQL, no Markdown-as-primary query |
| Auth | Loopback + optional shared secret header on writes (e.g. `X-ATO-Ops-Token`); no multi-user auth |
| SPA mode switch | **None** — mode is server-side only |

## Mock vs live

| Setting | Meaning |
|---|---|
| `OPS_DATA_MODE=mock` | In-memory (or fixture) double of KnowledgeGraph methods + canned campaigns |
| `OPS_DATA_MODE=live` | Real `KnowledgeGraph(db_path, knowledge_root)` from pydantic-settings |

- Paths `OPS_DB_PATH` / `OPS_KNOWLEDGE_ROOT` (names illustrative) required for live; ignored for mock.
- SPA always calls the same `/api/v1` routes.

## KnowledgeGraph façade gap (required for v1)

Store currently: `list_human_gates(campaign_id, *, status=None)`.

**Add:**

```text
list_human_gates_all(*, status: str | None = None) -> list[HumanGate]
```

- Optional filter by `status` (e.g. `pending`).
- Used by global Gates inbox and pending badge.
- Dashboard must not N+1 `list_campaigns` + per-campaign gates as the long-term design (mock may cheat until method exists).

Document this addition in `phase1-knowledge-store.md` when implementing the store.

## Read routes

| Method | Path | Backing / notes |
|---|---|---|
| GET | `/api/v1/campaigns` | `list_campaigns` |
| GET | `/api/v1/campaigns/{campaign_id}` | `get_campaign` → 404 if missing |
| GET | `/api/v1/campaigns/{campaign_id}/theses` | `list_theses` |
| GET | `/api/v1/campaigns/{campaign_id}/experiments` | `list_experiments(campaign_id=)` |
| GET | `/api/v1/campaigns/{campaign_id}/graph` | **Convenience DTO** for graph UI (see below) |
| GET | `/api/v1/experiments/{experiment_id}` | `get_experiment` |
| GET | `/api/v1/experiments/{experiment_id}/markdown-path` | Resolved path string under `knowledge_root` (no file body) |
| GET | `/api/v1/campaigns/{campaign_id}/gates` | Query `status` optional → `list_human_gates` |
| GET | `/api/v1/gates` | Query `status` optional → `list_human_gates_all` |
| GET | `/api/v1/gates/{gate_id}` | `get_human_gate` |

### Graph DTO (`GET .../graph`)

Shape sufficient for `ops-dashboard-graph.md`:

```json
{
  "campaign_id": "uuid",
  "theses": [
    {
      "id": "uuid",
      "title": "string",
      "status": "active|exhausted|abandoned|promoted",
      "created_at": "iso8601"
    }
  ],
  "experiments": [
    {
      "id": "uuid",
      "thesis_id": "uuid",
      "parent_experiment_id": "uuid|null",
      "title_or_hypothesis": "string",
      "verdict": "promising_mutable|dead_end|meets_goals|incomplete|null",
      "next_action": "string|null",
      "created_at": "iso8601",
      "summary_metrics": { "sharpe": "number|null" }
    }
  ],
  "pending_gate_experiment_ids": ["uuid"]
}
```

- `pending_gate_experiment_ids`: experiments referenced by pending gates for this campaign (for human badge).
- Server may derive `title_or_hypothesis` from hypothesis/title fields available on Experiment.
- SPA **may** ignore this route and compose from list endpoints; implementers should still provide it.

### Markdown path

```json
{
  "experiment_id": "uuid",
  "thesis_id": "uuid",
  "path": "/abs/or/configured/knowledge/{thesis_id}/{experiment_id}.md"
}
```

Do **not** stream Markdown body over HTTP in v1 (local file open is unreliable in browser; path is for display/copy).

### List/detail DTO principle

- Responses are **JSON projections** of domain entities (field names aligned with `phase1-entities.md` / store columns).
- Omit huge blobs when listing if needed; **detail** routes return full experiment including `strategy_config` and `results`.
- Exact OpenAPI can be generated at implement time; this doc is the contract source of truth for v1 scope.

## Write routes

| Method | Path | Body | Behavior |
|---|---|---|---|
| POST | `/api/v1/gates/{gate_id}/resolve` | `{ "status": "approved" \| "rejected" }` | Load gate; if not `pending` → **409 conflict**; else set status, `resolved_at`, `upsert_human_gate`. Require ops token header if configured. |

No other writes in v1 (no campaign create, no experiment edit).

Authority vs orchestrator file-queue: **locked** in `docs/domain/ops-dashboard-gates.md` — store is authoritative; file queue optional/not required for UI; resolve idempotency rules there.

## Event stream (transport)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/campaigns/{campaign_id}/events/stream` | **SSE**; each event data = JSON envelope |
| GET | `/api/v1/campaigns/{campaign_id}/events` | Optional **poll**: query `since` (iso or cursor); returns `{ "events": [ ... ] }` for mock/smoke |

### Envelope

```json
{
  "type": "string",
  "ts": "iso8601",
  "campaign_id": "uuid",
  "payload": {}
}
```

Closed `type` set, producers, payload rules, retention: **`docs/domain/ops-dashboard-events.md`** (locked).

Mock mode: SSE may replay fixture ticks or accept poll-only.

## Errors

HTTP status + body:

```json
{
  "error": {
    "code": "not_found | validation | conflict | unauthorized | internal",
    "message": "human readable"
  }
}
```

| code | Typical status |
|---|---|
| `not_found` | 404 |
| `validation` | 400 |
| `conflict` | 409 (e.g. resolve non-pending gate) |
| `unauthorized` | 401 (bad/missing ops token on write) |
| `internal` | 500 |

## Explicit non-goals

- GraphQL
- Client-selected mock mode
- Returning Markdown file contents
- Control-plane writes beyond gate resolve
- WebSocket (unless later need bidirectional control)
- Final closed set of `type` strings for engine events (events ticket)
