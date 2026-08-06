# Phase 1 domain entities (locked)

Source: wayfinder ticket [Grilling: Domain glossary and ExperimentRecord causal schema](https://github.com/etai83/agentic_trading_orchestration/issues/4).  
Vocabulary: repo-root `CONTEXT.md`. This file is the field surface for Phase 1 — not implementation code.

## Identity rules

| Rule | Decision |
|---|---|
| Experiment vs record | One entity: **Experiment** is the record |
| Experiment scope | One id covers multi-asset + multi-tier results |
| Thesis vs Experiment | Thesis = hypothesis family; mutations = child Experiments under that thesis |
| Thesis creation | Explicit by Discovery (`new_thesis` vs mutate under existing) |
| Campaign run | No separate run entity in Phase 1 |

## Campaign

| Field | Notes |
|---|---|
| `id` | UUID |
| `name` | Human label |
| `goal_vector` | Closed Phase 1 keys: `min_sharpe`, `min_win_rate`, `max_drawdown`, `min_trades` — see `phase1-goal-vector.md` |
| `constraints` | Operational: date window, `max_experiments`, `screen_top_k` / `screen_top_fraction`, optional compute budget |
| `asset_universe` | Bare ticker list (e.g. seed `OKLO`, `IONQ`, `NVDA`) |
| `status` | Closed: `idle` \| `researching` \| `discovering` \| `executing` \| `evaluating` \| `deciding` \| `awaiting_human` \| `completed` \| `failed` — `phase1-orchestrator.md` |
| `created_at` | Timestamp |

## Thesis

| Field | Notes |
|---|---|
| `id` | UUID |
| `campaign_id` | Owning Campaign |
| `title` | Short name |
| `summary` | Edge pattern in prose |
| `status` | `active` \| `exhausted` \| `abandoned` \| `promoted` |
| `created_at` | Timestamp |

## Experiment

| Field | Notes |
|---|---|
| `id` | UUID |
| `campaign_id` | Owning Campaign |
| `thesis_id` | Parent Thesis |
| `parent_experiment_id` | Optional mutation parent |
| `hypothesis` | What this run claims |
| `why_generated` | Why this config/mutation was chosen |
| `mutation_delta` | Change vs parent; empty if thesis root |
| `strategy_config` | Strategy config snapshot |
| `results` | Map: asset → { execution_tier → Backtest result } |
| `regime_tags` | Post-hoc labels; may be empty until Evaluation tags |
| `regime_performance` | Metrics by regime; may be empty early |
| `verdict` | `promising_mutable` \| `dead_end` \| `meets_goals` \| `incomplete` |
| `next_action` | `mutate` \| `new_thesis` \| `promote` \| `abort` \| `re_research` \| `await_human` |
| `next_reasoning` | Free text |
| `created_at` | Timestamp |

## Backtest result

Per execution tier × asset (or explicit aggregate rollup). Floor metrics:

- `sharpe`
- `win_rate`
- `max_drawdown`
- `total_return`
- `n_trades`
- `expectancy`

Null allowed when a tier cannot compute a field.

## Strategy config / Signal block

- **Strategy config**: ordered list of Signal blocks + composition rules (engine-agnostic). List order is ignored for Phase 1 execution semantics. Does not own timeframe, fees, assets, or date range.
- **Signal block types (closed)**: `entry_signal` \| `exit_signal` \| `filter` \| `risk_model` \| `position_sizing`.
- **Phase 1 thin-slice library (closed)**: `ema_crossover` (required entry), `atr_stop_loss` (required risk), `fixed_risk_pct` (required sizing), `rsi_filter` (optional filter), `session_window` (optional filter). Full param surface, compile rules, and Jesse handoff: `docs/domain/phase1-strategy-mapping.md`.

## Research brief

| Field | Notes |
|---|---|
| `id` | Optional |
| `campaign_id` | Owning Campaign |
| `summary` | Prose |
| `candidate_assets` | List |
| `observed_patterns` | Structured or prose list |
| `suggested_thesis_directions` | List |
| `created_at` | Timestamp |

Persistence may be in-memory or light; shape is domain.

## Human gate

| Field | Notes |
|---|---|
| `id` | UUID |
| `campaign_id` | Owning Campaign |
| `reason` | Closed Phase 1: `promote` \| `await_human` \| `abort_confirm` \| `budget_exhausted` \| `anomaly` |
| `payload` | Decision context |
| `status` | `pending` \| `approved` \| `rejected` |
| timestamps | created / resolved |

File-queue path is implementation; entity is domain.

## Owned elsewhere

- Goal vector comparison rules, aggregation, seed defaults → `phase1-goal-vector.md` (locked)
- Engine I/O type wiring → `phase1-engine-io.md`
- Knowledge store tables/Markdown templates → `docs/domain/phase1-knowledge-store.md`
- Campaign state machine, decide_next, gate policy → `phase1-orchestrator.md`
