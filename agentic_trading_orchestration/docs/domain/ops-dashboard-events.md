# Phase 1 ops dashboard — engine event stream (locked)

Source: [Grilling: Engine event stream schema and producers](https://github.com/etai83/agentic_trading_orchestration/issues/16).  
Map: [Map: Phase 1 orchestration ops dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/11).  
Transport: `docs/domain/ops-dashboard-api.md` (SSE + poll).  
Cycle context: `docs/domain/phase1-engine-io.md`.  
Campaign status strings: closed in `phase1-orchestrator.md` (`idle` … `failed`).

## Purpose

Operator-facing **progress feed** for a campaign workspace dock. Not a full observability/metrics product.

## Producers

| Producer | Emits |
|---|---|
| **CEO orchestrator** | All cycle lifecycle events (research → discovery → execution → evaluation → decide_next → gates it opens) |
| **ops-api** (gate resolve) | `gate_resolved` when dashboard `POST .../gates/{id}/resolve` succeeds |

Engines do **not** publish to the stream directly. Dashboard does **not** invent a parallel progress model by scraping SQLite as the primary design (mock may synthesize events).

## Envelope (restated)

```json
{
  "type": "string",
  "ts": "iso8601",
  "campaign_id": "uuid",
  "payload": {}
}
```

### Payload rules

| Rule | |
|---|---|
| Common optional keys | `experiment_id`, `thesis_id`, `gate_id`, `message` (short UI line) |
| Type-specific | Small structured fields only (ids, status strings, counts, `ok` bool, one-line errors) |
| Forbidden on stream | Full `strategy_config`, full `results` maps, Markdown bodies, LLM transcripts |

UI uses `message` + id deep-links; detail comes from GET experiment/campaign routes.

## Closed `type` set (Phase 1 producers)

Producers **must only emit** these types in Phase 1. Consumers **may** ignore unknown types for forward-compat.

| `type` | When | Payload minima (beyond envelope) |
|---|---|---|
| `campaign_state_changed` | Campaign status changes | `from`, `to` (strings); optional `message` |
| `research_started` | Research begins | optional `message` |
| `research_finished` | Research brief ready | optional `message` |
| `discovery_started` | Discovery begins | optional `message` |
| `discovery_finished` | Discovery produced config/texts | optional `thesis_id`, `message` |
| `thesis_created` | New thesis id assigned | `thesis_id`, optional title in `message` |
| `experiment_shell_created` | Orchestrator creates Experiment shell | `experiment_id`, `thesis_id`, optional `parent_experiment_id` |
| `execution_started` | Execution starts for experiment | `experiment_id` |
| `vectorized_finished` | Vectorized screen done | `experiment_id`, `survivor_assets` (list), optional screened-out count |
| `jesse_submitted` | Jesse batch/run started | `experiment_id`, optional `assets` list |
| `jesse_finished` | **Per asset** Jesse outcome | `experiment_id`, `asset`, `ok` (bool), optional metric gist (`sharpe`, …), optional `error` |
| `execution_finished` | Execution slice complete | `experiment_id`, optional `partial` (bool), `message` |
| `evaluation_finished` | Evaluation wrote verdict/next | `experiment_id`, `verdict`, `next_action`, optional `message` |
| `gate_opened` | Human gate created pending | `gate_id`, optional `experiment_id`, `reason`, `message` |
| `gate_resolved` | Gate approved/rejected | `gate_id`, `status` (`approved`\|`rejected`), optional `experiment_id` |
| `cycle_decision` | Orchestrator `decide_next` | `decision` (string; align with next_action / orchestrator when locked), optional `experiment_id`, `message` |
| `error` | Step failed; stream continues | `step` (e.g. `execution`, `jesse`), optional ids, `message` (required) |

### Happy-path emission order (illustrative)

```text
campaign_state_changed
research_started → research_finished
discovery_started → thesis_created? → discovery_finished
experiment_shell_created
execution_started → vectorized_finished
  → jesse_submitted → jesse_finished* → execution_finished
evaluation_finished
gate_opened? → (human) → gate_resolved?
cycle_decision
campaign_state_changed?
```

## Jesse granularity

- **`jesse_finished` is per asset** on multi-asset experiments.
- One **`jesse_submitted`** when the Jesse wave starts (batch or first submit) is enough; not per asset required.
- No per-trade events.

## Retention / bus

| Decision | |
|---|---|
| Storage | **In-process ring buffer per `campaign_id`** (target capacity **~200–500** events; exact constant implementer-chosen) |
| Persist to SQLite | **No** Phase 1 events table |
| SSE connect | May **replay** current buffer then live-tail |
| Poll `since` | Served from the same buffer |
| Live topology | Prefer orchestrator + ops-api sharing one bus (same process or localhost publish). Contract is the buffer + types, not a specific IPC library |

Lost history across process restart is acceptable in Phase 1.

## Orchestrator requirement (trading-spec map)

Phase 1 **CEO orchestrator must emit** this closed set at the cycle points above (stubs with correct `type` + ids are better than silence).  
Missing emission = incomplete live dashboard stream.  
Mock mode synthesizes the same types for demos.

Use `phase1-orchestrator.md` status / Decision action strings in `campaign_state_changed` / `cycle_decision` without changing this event type set.

## Consumer notes (ops UI)

- Dock shows reverse-chronological events; style `gate_*` and `error` distinctly (IA mock already does).
- `gate_opened` should align with badge/banner (IA); client may also refresh gate list on that type.
- Graph pending style can use `experiment_shell_created` … `evaluation_finished` gap plus null verdict from API.

## Explicit non-goals

- Distributed tracing / OpenTelemetry as the dashboard feed
- Engine-direct publishers
- Full result payloads on the stream
- Durable event log / audit warehouse
- WebSocket (transport remains SSE per API ticket)
