# Phase 1 engine I/O contracts (locked)

Source: [Grilling: Engine I/O contracts for the five-engine thin slice](https://github.com/etai83/agentic_trading_orchestration/issues/5).  
Vocabulary: `CONTEXT.md`, `docs/domain/phase1-entities.md`.  
Seams: HTTP Jesse adapter; no Finance Python imports; TV placeholder; vectorized screener in ATO; async APIs.

## Responsibility rules

| Rule | Decision |
|---|---|
| Lineage / ids | **CEO orchestrator** creates Experiment shells and Thesis ids; engines fill slices |
| Knowledge access | Orchestrator **injects** context strings/priors; engines do not query Knowledge store |
| LLM | Only **Research**, **Discovery**, **Evaluation** via shared `LLMProvider` |
| Data | Shared **DataProvider** for Research + vectorized path; Jesse uses HTTP + symbol identity mapping only |
| APIs | `async` for all engines + orchestrator |

## Happy-path cycle

```
cold start / re_research → Research
→ Discovery (new thesis or mutate)
→ Execution: vectorized screen → top-K → Jesse on survivors
→ Evaluation: pure score + regimes → LLM causal
→ optional Human gate
→ orchestrator decide_next (may follow or override Evaluation next_action)
```

- **Research** runs on Campaign start and when `next_action` / decision is `re_research`.
- Otherwise Discovery reuses prior Research brief / injected context (no mandatory re-research each loop).
- Campaign status enum and decide_next / gates: `phase1-orchestrator.md`.

## Research

| | |
|---|---|
| **In** | `Campaign`; optional knowledge context string (injected) |
| **Out** | `Research brief` |
| **Side effects** | None required (persist optional; orchestrator/store ticket) |
| **LLM** | Yes (synthesis) |

## Discovery

| | |
|---|---|
| **In** | `Campaign`; `Research brief`; optional thesis context; optional parent `Experiment` (mutate path) |
| **Out** | **New thesis path:** thesis fields (title, summary, …) + root Strategy config + hypothesis / why_generated texts. **Mutate path:** existing `thesis_id` + child Strategy config + mutation_delta + texts. Does **not** return a full Experiment |
| **LLM** | Yes (hypothesis / mutation) |

Orchestrator assigns `thesis_id` on new thesis, creates Experiment shell, attaches `strategy_config` and causal text fields Discovery produced.

## Execution

| | |
|---|---|
| **In** | `Strategy config`; asset list (from Campaign universe or brief); date/range constraints; `DataProvider`; Jesse adapter config; screen params (`screen_top_k` and/or `screen_top_fraction` from Campaign constraints) |
| **Out** | `results`: asset → { `vectorized` → Backtest result, optional `jesse` → Backtest result }; screen metadata (survivors, screened-out) |
| **Funnel** | Vectorized across universe → keep top-K / top fraction → Jesse only on survivors |
| **Partial failure** | Per-asset: vectorized may succeed while Jesse fails → store vectorized + null/error for Jesse; Evaluation may mark Experiment `incomplete` |
| **TV** | `tv_validate(...)` exists as placeholder; returns not-implemented / incomplete; **not** on happy path |
| **LLM** | No |

## Evaluation

| | |
|---|---|
| **In** | Experiment shell with `strategy_config` + `results`; Goal vector; optional thesis/knowledge context |
| **Out** | Same Experiment with `regime_tags` / `regime_performance`, `verdict`, `next_action`, `next_reasoning`, and remaining causal prose filled |
| **Steps** | (1) Pure Python `score_against_goals` + post-hoc regime tagging (2) LLM causal analysis proposing verdict/next_action; Python may reject illegal combos |
| **LLM** | Yes (causal only after deterministic score) |

## CEO orchestrator

| | |
|---|---|
| **In** | `Campaign` (and runtime config) |
| **Out** | Drives cycle; creates Thesis/Experiment ids; calls engines in order; opens **Human gate** when required; persists via Knowledge store (store API: knowledge ticket) |
| **decide_next** | Returns Decision (same action set as Next action); may override Evaluation; gate policy: `phase1-orchestrator.md` |

## Campaign constraints (engine-relevant)

| Field | Role |
|---|---|
| `screen_top_k` | Optional int: max assets promoted to Jesse |
| `screen_top_fraction` | Optional float: alternative/fractional screen |
| date range / max experiments | Passed through as needed |

Seed defaults and Goal vector schema: `phase1-goal-vector.md` (locked).

## Explicit non-goals (this ticket)

- Knowledge store method signatures
- Goal-vector field keys (see `phase1-goal-vector.md`)
- LLM prompt bodies

Human gates / campaign status (locked separately): `phase1-orchestrator.md`.

Strategy config ↔ Jesse mapping (locked separately): `docs/domain/phase1-strategy-mapping.md`.
