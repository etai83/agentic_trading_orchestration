# Phase 1 Goal vector and seed Campaign (locked)

Source: [Grilling: Goal-vector schema and seed campaign defaults](https://github.com/etai83/agentic_trading_orchestration/issues/7).  
Vocabulary: repo-root `CONTEXT.md`. Related: `docs/domain/phase1-entities.md`, `docs/domain/phase1-engine-io.md`.

## Goal vector — closed field set

Quality thresholds only. Not operational limits (those live on Campaign `constraints`).

| Field | Unit | Direction | Meaning |
|---|---|---|---|
| `min_sharpe` | dimensionless ratio | ≥ floor | Minimum acceptable Sharpe |
| `min_win_rate` | fraction `0..1` (not percent) | ≥ floor | Minimum win rate |
| `max_drawdown` | fraction `0..1`, **positive magnitude** (e.g. `0.20` = 20% DD) | ≤ ceiling | Maximum acceptable drawdown |
| `min_trades` | integer count | ≥ floor | Minimum trade count |

Phase 1 does **not** put `total_return` or `expectancy` on the Goal vector (they remain on Backtest result for causal / LLM use).

## Comparison rules (`score_against_goals`)

Deterministic pure Python. Runs **before** Evaluation’s LLM causal step.

### All-must-pass

- Compare each Goal vector field to the rolled-up actual (see aggregation).
- Experiment **meets goals** iff every field passes its floor/ceiling.
- **No** weighted scalar objective in Phase 1.

### Score object (domain shape)

| Element | Notes |
|---|---|
| Per-field | `{ actual, target, pass }` for each Goal vector key |
| Overall | `meets_goals: bool` |
| Slack (optional) | Per-field distance (e.g. `actual − floor` or ceiling − actual) for LLM / Discovery context — **not** a fitness weight |

### Null actuals

If any Goal vector field’s actual is `null` on the rolled-up metrics → score is **incomplete** (not a hard fail). Feeds Evaluation `verdict: incomplete`. Non-null fields may still be reported with slack.

### No scorable assets

If no asset contributes a scorable tier result → incomplete (same as null path), not a false fail.

## Multi-tier and multi-asset aggregation

### Tier preference (per asset)

1. Use **Jesse** Backtest result metrics when present for that asset.
2. Else use **vectorized**.
3. Else asset contributes nothing to the rollup.

### Multi-asset rollup

- Build one synthetic metric vector by taking the **median** across assets that have a scorable tier, field-by-field (`sharpe`, `win_rate`, `max_drawdown`, `n_trades`, … as needed for goals).
- Compare that median vector to the Goal vector under all-must-pass rules.

Adapter note: map engine-native drawdown sign into **positive magnitude** before comparison.

## Campaign field boundary

| Campaign field | Owns |
|---|---|
| `goal_vector` | The four quality thresholds above only |
| `constraints` | Operational limits: date window, `max_experiments`, `screen_top_k` / `screen_top_fraction`, optional compute/time budget |
| `asset_universe` | Symbol list (canonical **bare tickers**; venue/`{TICKER}-USD` mapping is DataProvider / Execution concern) |

`score_against_goals` is pure: rolled-up metrics vs `goal_vector` only.

## Seed Campaign defaults (`phase1-seed`)

Canonical Phase 1 example used to prove the full cycle. Spec values live here; runtime may load them from config without re-grilling.

| Field | Value |
|---|---|
| `name` | `phase1-seed` |
| `asset_universe` | `["OKLO", "IONQ", "NVDA"]` |
| `goal_vector.min_sharpe` | `0.5` |
| `goal_vector.min_win_rate` | `0.45` |
| `goal_vector.max_drawdown` | `0.25` |
| `goal_vector.min_trades` | `10` |
| `constraints.date_start` | `2024-01-01` |
| `constraints.date_end` | `2024-12-31` |
| `constraints.max_experiments` | `50` |
| `constraints.screen_top_k` | `2` |
| `constraints.screen_top_fraction` | omitted / `null` (seed uses K only) |

### CI vs live

- **Live / manual seed**: may use the date window and live (or Finance) data paths for the three tickers.
- **CI**: same Goal vector schema and Campaign shape; inject **fixture candles / fixture metrics** — no live network or Jesse required. Tests may force pass/fail/incomplete by injecting rolled-up actuals independent of live alpha.

## Explicit non-goals (this ticket)

- Weighted multi-objective fitness or portfolio optimization
- Per-campaign open-ended KPI bags
- Anomaly thresholds (orchestrator / human-gate ticket)
- CLI flag surface for `ato campaign create`
- Fixture file layout on disk (implementation)
