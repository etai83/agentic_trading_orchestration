# Agentic Trading Orchestration

Autonomous research system that discovers abstract trading edges, tests them across assets, and grows a body of quantitative knowledge under human checkpoints.

## Language

**Campaign**:
A bounded research effort defined by a goal vector, constraints, and an asset universe. Phase 1 envelope: id, name, goal vector, constraints, asset universe, status, created_at. No separate Campaign-run entity. Phase 1 status (closed): `idle` | `researching` | `discovering` | `executing` | `evaluating` | `deciding` | `awaiting_human` | `completed` | `failed` — see `docs/domain/phase1-orchestrator.md`.
_Avoid_: Job, run, project, session, Campaign run

**Goal vector**:
A closed Phase 1 set of quality thresholds on a Campaign: `min_sharpe`, `min_win_rate`, `max_drawdown` (positive fraction magnitude), `min_trades`. Evaluation’s pure `score_against_goals` is all-must-pass on a Jesse-preferred, multi-asset median rollup — not a weighted scalar objective.
_Avoid_: Objective function (unless referring to a single scalarized score), KPI bag

**Thesis**:
A family of related hypotheses about an edge pattern; a first-class node in the thesis forest that groups Experiments. Created intentionally when Discovery starts a new hypothesis family (not lazily from the first run). Phase 1 fields: id, campaign_id, title, summary, status (`active` | `exhausted` | `abandoned` | `promoted`), created_at.
_Avoid_: Strategy, idea, theory

**Experiment**:
One testable instance of a Strategy config under a Thesis: lineage (campaign, thesis, optional parent Experiment), config, multi-asset multi-tier Backtest results, and causal fields. One Experiment spans the assets in its run and the execution tiers used — not one id per asset or per tier. The Experiment *is* the record (no separate experiment-record entity).
_Avoid_: Trial, trial run, backtest (use Backtest result for the metrics artifact), Experiment record

**Strategy config**:
A composition of signal blocks plus composition rules that fully describes a testable strategy without engine-specific code. Phase 1: closed thin-slice block set, filters AND-only; compiles to a named Jesse strategy plus hyperparameters (see `docs/domain/phase1-strategy-mapping.md`). Does not include timeframe, fees, assets, or dates.
_Avoid_: Strategy (ambiguous with live trading strategy), params file, hyperparameter map (that is a compile output)

**Signal block**:
A single composable component of a strategy with parameters and optional parameter ranges. Phase 1 block types: `entry_signal` | `exit_signal` | `filter` | `risk_model` | `position_sizing`. Thin-slice ids: `ema_crossover`, `rsi_filter`, `atr_stop_loss`, `fixed_risk_pct`, `session_window`.
_Avoid_: Indicator, feature, module

**Backtest result**:
Metrics for one execution tier on one asset (or an explicit aggregate rollup), nested under an Experiment — independent of causal interpretation. Phase 1 floor fields: sharpe, win_rate, max_drawdown, total_return, n_trades, expectancy (nullable when a tier cannot compute a field).
_Avoid_: Experiment, score

**Verdict**:
A closed outcome label on an Experiment after evaluation: `promising_mutable` | `dead_end` | `meets_goals` | `incomplete`.
_Avoid_: Status (use Campaign state for orchestrator position), result

**Next action**:
A closed suggestion on an Experiment for what to do after evaluation: `mutate` | `new_thesis` | `promote` | `abort` | `re_research` | `await_human`. Paired with free-text next reasoning; the CEO orchestrator may still override or require a Human gate.
_Avoid_: improve, invent, fill_gaps (retired plan names), recommendation (too vague)

**Decision**:
The CEO orchestrator’s chosen next step after evaluation (and any gates): same closed action set as Next action, plus optional reasoning and whether it overrode Evaluation. Produced by `decide_next`.
_Avoid_: Next action (that is Evaluation’s suggestion), improve/invent/fill_gaps

**Mutation delta**:
Prose describing what changed in this Experiment’s Strategy config relative to its parent Experiment; empty when the Experiment is the root of a Thesis.
_Avoid_: Diff, changelog

**Research brief**:
Structured Research-engine output used as domain input to Discovery: campaign_id, summary, candidate_assets, observed_patterns, suggested_thesis_directions, created_at (id optional). Shape is domain; Phase 1 may keep it in-memory or lightly persist.
_Avoid_: Report, market summary

**Regime**:
A post-hoc label on a time period (e.g. trending, ranging, volatile) used to slice performance after the fact — not a live detector that gates entries in Phase 1.
_Avoid_: Market state (unless synonym is needed), filter regime

**Knowledge store**:
Hybrid memory behind a single KnowledgeGraph façade: SQLite for metrics, lineage, and dual-written short causal fields; Markdown for long-form causal reasoning readable by humans and LLMs. Only the CEO orchestrator reads and writes it.
_Avoid_: Database, memory bank, RAG store, SQLite store (as the public name), reasoning store (as the public name)

**Human gate**:
A first-class pause requiring human approval before the CEO orchestrator continues. Phase 1 entity: id, campaign_id, reason, payload, status (`pending` | `approved` | `rejected`), timestamps. Store is authoritative for resolution; no required file queue. Phase 1 reasons: `promote` | `await_human` | `abort_confirm` | `budget_exhausted` | `anomaly` — see `docs/domain/phase1-orchestrator.md`.
_Avoid_: Checkpoint, pending_reviews file (non-normative), approval ticket

**CEO orchestrator**:
The long-running campaign state machine that sequences engines, records results, and enforces human gates.
_Avoid_: Agent, daemon (implementation detail), supervisor

**Execution tier**:
One of three backtest fidelity levels: vectorized screening, Jesse simulation, TradingView validation (Phase 1 implements the first two; TV is a placeholder interface).
_Avoid_: Stage, step (use Campaign state for orchestrator steps)
