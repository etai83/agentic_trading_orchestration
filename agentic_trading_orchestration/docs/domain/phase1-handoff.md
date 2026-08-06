# Phase 1 thin-slice — handoff & acceptance (locked)

Source: [Grilling: Phase 1 acceptance criteria and handoff artifact](https://github.com/etai83/agentic_trading_orchestration/issues/10).  
Map: [Map: Phase 1 thin-slice build-ready spec](https://github.com/etai83/agentic_trading_orchestration/issues/1).

## Destination

**Build-ready Phase 1 specification** for the agentic trading orchestration thin slice: one full five-engine cycle  
(research → discover → vectorized screen → Jesse backtest → evaluate + causal record → human gate),  
with interfaces and seams decided so an implementation agent can build without re-grilling.  
TV validation remains a **placeholder** interface only.

This map is **plan / decide**, not implement. Product code is a follow-on.

## Map vs product

| Milestone | Done when |
|---|---|
| **This wayfinder map** | All decision tickets closed; this handoff exists; domain + research assets linked |
| **Library / CI thin slice** | Automated bar below passes (fixtures/fakes; no live network/Jesse required) |
| **Full manual thin slice** | Live bar below (optional for merge; required to claim “ran seed end-to-end”) |

## Ordered reading list (implementer)

### Vocabulary & entities

1. Repo [`CONTEXT.md`](../../CONTEXT.md)  
2. [`phase1-entities.md`](./phase1-entities.md)  
3. [`phase1-goal-vector.md`](./phase1-goal-vector.md) — goals + **phase1-seed** defaults  

### Engines & strategy

4. [`phase1-engine-io.md`](./phase1-engine-io.md)  
5. [`phase1-strategy-mapping.md`](./phase1-strategy-mapping.md) — `ThinSliceMomentum`, compile → hp  

### Memory & control

6. [`phase1-knowledge-store.md`](./phase1-knowledge-store.md)  
7. [`phase1-orchestrator.md`](./phase1-orchestrator.md) — status, decide_next, gates  

### Research (primary facts)

8. Jesse HTTP: ticket findings — prefer `docs/research/jesse-http-backtest-api.md` if present on branch `research/jesse-http-backtest-api`; else Finance runners cited on issue #2  
9. [`docs/research/candle-symbol-conventions.md`](../research/candle-symbol-conventions.md)  

### Parallel product (not required for core Phase 1 DoD)

10. [`ops-dashboard-handoff.md`](./ops-dashboard-handoff.md) — ops UI; consumes orchestrator events + store gates  

## Seed campaign

Canonical defaults: **`phase1-seed`** in `phase1-goal-vector.md`  
(universe `OKLO`, `IONQ`, `NVDA`; goal floors; date window; `max_experiments` 50; `screen_top_k` 2).

## CI / automated verification bar (ship gate for library)

Must pass **without** live network or live Jesse:

| # | Check |
|---|---|
| 1 | Unit tests for domain shapes and pure `score_against_goals` (all-must-pass, median rollup, null → incomplete) |
| 2 | Strategy config validation + `compile_thin_slice` → `ThinSliceMomentum` hp map |
| 3 | KnowledgeGraph on temp `db_path` / `knowledge_root`: upsert/get/list; experiment dual-write Markdown; `list_human_gates_all` |
| 4 | Orchestrator (or cycle driver) with **fakes**: mock LLM for Research/Discovery/Evaluation; mock DataProvider fixtures; mock Jesse adapter **or** vectorized-only path in test |
| 5 | Assert lineage: Thesis + Experiment shell → results patch → evaluation fields; open Human gate → store resolve → resume path |
| 6 | Symbol/candle helpers respect conventions on **fixtures** (identity sidecar / `{TICKER}-USD` mapping where applicable) |
| 7 | No Docker required for the test suite |

Live Jesse in CI is **not** required.

## Live / manual verification bar (full thin slice)

| # | Check |
|---|---|
| 1 | Configure Jesse HTTP + candle path per research; install `ThinSliceMomentum` |
| 2 | Run seed (or equivalent) one full cycle: Research → Discovery → Execution funnel → Evaluation → persist |
| 3 | If gate opened: resolve via KG / ops dashboard; orchestrator leaves `awaiting_human` and continues or completes per `phase1-orchestrator.md` |
| 4 | Emit closed event types per `ops-dashboard-events.md` (for ops live stream) |

## Deferred fog (non-blocking for map close)

| Item | Notes |
|---|---|
| Exact LLM prompt bodies | Draft from engine I/O + context injectors |
| CLI flag surface (`ato campaign create` …) | Thin CLI OK; exact flags free within domain fields |
| TV placeholder method shape | Stub only; not on happy path |
| Compute-budget numbers beyond `max_experiments` | Optional constraint; anomaly floor is consecutive fail/incomplete ×3 |

## Explicit non-goals (Phase 1)

- Phase 2–4 product (deeper blocks, full TV automation, embeddings, Docker, paper trading)  
- Full retrospective migration of Finance `experiments/`  
- Runtime import of Finance Python packages  
- Full runtime `ComposableStrategy` interpreter or strategy codegen (config must not block them later)  
- Ops dashboard as a **required** deliverable of this map (separate map; cross-link only)  
- Weighted multi-objective fitness; multi-user hosted deploy  

## Suggested implementation order

1. Domain types + goal scoring pure functions  
2. KnowledgeGraph + Markdown dual-write  
3. Strategy compile + vectorized predicates (shared with later Jesse class)  
4. Execution: DataProvider fixtures + Jesse HTTP adapter  
5. Research / Discovery / Evaluation with LLM provider abstraction (prompts iterative)  
6. CEO orchestrator state machine + gates + event bus  
7. CI fakes green  
8. Optional: live seed + ops-api/web attach  

## Definition of “map complete”

- [x] Research: Jesse HTTP, candles/symbols  
- [x] Glossary, entities, goal vector + seed  
- [x] Engine I/O, strategy mapping, knowledge store  
- [x] Orchestrator states / decide_next / gates  
- [x] This handoff + acceptance criteria  

**Product complete** is separate: CI bar (then optional live bar).
