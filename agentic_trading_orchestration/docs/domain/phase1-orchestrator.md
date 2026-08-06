# Phase 1 CEO orchestrator — states, decide_next, human gates (locked)

Source: [Grilling: Orchestrator decisions and human gates](https://github.com/etai83/agentic_trading_orchestration/issues/9).  
Vocabulary: `CONTEXT.md`, `docs/domain/phase1-entities.md`.  
Cycle I/O: `docs/domain/phase1-engine-io.md`.  
Store: `docs/domain/phase1-knowledge-store.md`.  
Ops dashboard gate authority: `docs/domain/ops-dashboard-gates.md` (**store wins**; no UI file queue).  
Event emission requirements: `docs/domain/ops-dashboard-events.md`.

## Responsibility

The **CEO orchestrator** is the long-running Campaign state machine: creates Thesis/Experiment ids, sequences engines, persists via KnowledgeGraph, opens Human gates, runs `decide_next`, emits engine events for the ops stream.

## Campaign status (closed)

Stored on Campaign (`status` field). Emitted on `campaign_state_changed` (`from` / `to`).

| Status | Meaning |
|---|---|
| `idle` | Created; not started |
| `researching` | Research engine running |
| `discovering` | Discovery running |
| `executing` | Execution (vectorized → Jesse) |
| `evaluating` | Evaluation (score + causal) |
| `deciding` | `decide_next` (brief) |
| `awaiting_human` | Blocked on a **pending** Human gate |
| `completed` | Terminal success-or-stop (goals path, abort, budget, operator stop-after-reject) |
| `failed` | Unrecoverable orchestrator/engine failure |

**Not in Phase 1:** `paused`, generic `running`, extra plan labels (`hypothesizing`, `screening`, `backtesting` as separate campaign statuses).

### Typical transitions

```text
idle → researching → discovering → executing → evaluating → deciding
  → (auto) researching | discovering | …   # next cycle step
  → awaiting_human                         # gate opened
  → completed | failed

awaiting_human → deciding | discovering | researching | completed | failed
  # after store gate leaves pending (orchestrator observes KG)
```

Exact next cycle state after resume depends on Decision (below). Orchestrator **sets** Campaign status; ops-api does not.

## Decision (`decide_next`)

### Return type

`decide_next(experiment, evaluation_next_action, …) -> Decision`

| Field | Type |
|---|---|
| `action` | Same closed set as **Next action**: `mutate` \| `new_thesis` \| `promote` \| `abort` \| `re_research` \| `await_human` |
| `reasoning` | Free text (optional but recommended) |
| `override` | `bool` — true if `action` differs from Evaluation’s `next_action` |

**Retired names** (plan sketch only): `improve`, `invent`, `fill_gaps` — use `mutate` / `new_thesis` instead. Do not introduce a second Decision enum.

### Policy (Phase 1)

1. Default: **follow** Evaluation `next_action` when legal.
2. May **override** (e.g. force `await_human` or `abort` on budget/anomaly).
3. Illegal Evaluation combos may already be rejected in Evaluation; orchestrator still validates before acting.
4. Emit `cycle_decision` with `decision` = `action`.

### Mapping action → next work

| `action` | Next behavior (after any required gate) |
|---|---|
| `mutate` | Discovery mutate path under same thesis; new child Experiment |
| `new_thesis` | Discovery new-thesis path; new Thesis + root Experiment |
| `re_research` | Research then Discovery |
| `promote` | Gate required; on approve → thesis `promoted` intent + campaign toward `completed` (no paper trade) |
| `abort` | Gate `abort_confirm`; on approve → `completed` |
| `await_human` | Gate with explanatory payload; on approve → default continue `mutate` unless payload says otherwise |

## Human gates

### Authority

- Create gate: orchestrator → `upsert_human_gate` (`status=pending`), campaign → `awaiting_human`, emit `gate_opened`.
- Resolve: **store only** (ops dashboard / CLI via KG). Orchestrator **polls or watches** until `approved` \| `rejected`.
- **No required `pending_reviews/` file queue** in Phase 1. Optional debug Markdown is non-normative; **store wins**.

### Closed `reason` set (Phase 1)

| `reason` | When opened |
|---|---|
| `promote` | Decision/Evaluation path is promote |
| `await_human` | Explicit await_human |
| `abort_confirm` | Abort needs confirmation |
| `budget_exhausted` | Hit `constraints.max_experiments` (or equivalent hard budget) |
| `anomaly` | Anomaly rules (below) |

Payload JSON should include at least: `experiment_id` (when applicable), `decision` / suggested follow-up, short `summary` string for UI.

### When a gate is required

| Situation | Gate? |
|---|---|
| `promote` | **Yes** (`promote`) |
| `await_human` | **Yes** (`await_human`) |
| `abort` | **Yes** (`abort_confirm`) |
| `budget_exhausted` | **Yes** (`budget_exhausted`) |
| Anomaly triggered | **Yes** (`anomaly`) |
| `mutate` / `new_thesis` / `re_research` | **No** — auto-continue |

### Anomaly rules (minimal)

Campaign-wide counters (reset policy: implementer may reset on successful complete evaluation):

1. **≥ 3 consecutive** experiments that end in hard failure **or** Evaluation `verdict: incomplete` → open `anomaly` gate.  
2. No other metric-spike anomalies in Phase 1.

### Resume after resolve

| Gate reason | Approved | Rejected |
|---|---|---|
| `promote` | Thesis status → `promoted` (or equivalent intent); campaign → `completed` (Phase 1: no paper) | Continue research: Decision `mutate` (or `new_thesis` if payload prefers) |
| `abort_confirm` | Campaign → `completed` | Resume `mutate` |
| `budget_exhausted` | Campaign → `completed` | Campaign → `completed` (no UI budget bump in v1) |
| `anomaly` | Resume `mutate` | Campaign → `completed` |
| `await_human` | Resume `mutate` unless payload specifies `new_thesis` / `re_research` | Campaign → `completed` or resume mutate — **default `mutate`** if unspecified |

After resolve: emit path continues via ops-api `gate_resolved` and/or orchestrator observing store; orchestrator leaves `awaiting_human` for the next state in the table.

## Stop conditions → `completed`

- Promote approved  
- Abort confirmed  
- Budget exhausted (either resolution)  
- Anomaly / await_human **rejected** (stop)  
- Optional: Evaluation `meets_goals` + promote path already covered  

`failed` is reserved for crashes / unrecoverable infra (Jesse down with no recovery policy, etc.) — not normal dead_end experiments.

## Event emission (required for ops live stream)

Orchestrator **must** emit the closed event types at cycle points per `ops-dashboard-events.md` (research/discovery/execution/evaluation brackets, shell created, jesse per asset, gates it opens, cycle_decision, campaign_state_changed, errors). Prefer correct types + ids over silence.

## Explicit non-goals

- Paper trading / live order routing after promote  
- Required file-based pending_reviews protocol  
- Manual campaign pause from dashboard  
- Weighted multi-objective decide_next  
- Rich anomaly detection pack  
- Multi-campaign scheduler fairness beyond single long-running loop
