# Phase 1 Strategy config → Jesse mapping (locked)

Source: [Grilling: StrategyConfig to hand-written Jesse strategy mapping](https://github.com/etai83/agentic_trading_orchestration/issues/6).  
Vocabulary: `CONTEXT.md`, `docs/domain/phase1-entities.md`.  
Related: `docs/domain/phase1-engine-io.md` (Execution funnel); candle/symbol research for session TZ and warm-up.

## Purpose

Phase 1 maps engine-agnostic **Strategy config** (blocks + composition rules) onto **one hand-written Jesse strategy class** via strategy name + hyperparameters. Runtime `ComposableStrategy` / codegen stay unblocked because the IR stays block-shaped.

## Strategy config shape

| Field | Phase 1 rule |
|---|---|
| `blocks` | Ordered list of Signal blocks. **Order is ignored** for execution semantics. |
| `composition_rules` | Required object. Filter mode is **AND only** (explicit or default). Any other filter mode → compile reject. |

Strategy config does **not** own: route timeframe, exchange, symbols, date range, warm-up candles, fees, leverage, balance, asset list.

## Thin-slice block library (closed)

| `block_id` | `block_type` | Presence | Parameters (configurable) |
|---|---|---|---|
| `ema_crossover` | `entry_signal` | **Required** | `fast_period` (int), `slow_period` (int); require `fast_period < slow_period` |
| `rsi_filter` | `filter` | Optional | `period`, `lower`, `upper` (ints); require `lower < upper` |
| `atr_stop_loss` | `risk_model` | **Required** | `atr_period` (int), `sl_mult` (float). **Stop only** — no take-profit, no trailing |
| `fixed_risk_pct` | `position_sizing` | **Required** | `risk_pct` (float) |
| `session_window` | `filter` | Optional | `start_minute`, `end_minute` (ints, minutes from midnight); require `end_minute > start_minute` (no overnight wrap) |

- Unknown `block_id`, duplicate id, missing required, type mismatch for a known id, or any block outside this five → **compile reject**.
- Optional `parameter_ranges` may appear on blocks for Discovery mutation bounds; **Execution compile ignores them**. Domain owns ranges; Jesse `hyperparameters()` min/max should align but are not the source of truth for Discovery.

### Fixed wiring (not separate blocks)

| Behavior | Rule |
|---|---|
| Direction | **Long-only** (`should_short` always false) |
| Entry | Fast EMA **crosses above** slow EMA **and** every present filter (AND) |
| Exit | Reverse EMA cross (fast crosses below slow) **or** ATR stop. Exits allowed outside session. |
| Session | Gates **entries only** when `session_window` present. Bar clock in session TZ (default **America/New_York** for equities seed). Half-open `[start_minute, end_minute)`. |
| Sizing | `risk_to_qty` (or equivalent) using `risk_pct` and distance from entry to ATR stop |

## Compile path

Pure function (name illustrative):

```text
compile_thin_slice(strategy_config) → CompiledStrategy
```

| Field | Value |
|---|---|
| `strategy_name` | `"ThinSliceMomentum"` |
| `profile` | `"thin_slice_v1"` |
| `enabled_blocks` | List of present `block_id`s |
| `hyperparameters` | Flattened map (below) |

Invalid config → **hard validation error** (no silent half-run, no partial Jesse call).

`CompiledStrategy` is an adapter/compile artifact. The Experiment stores the original **Strategy config** snapshot; persisting compiled form is optional (knowledge-store concern, not required here).

## Hyperparameter map (Jesse + vectorized)

| Key | Type | Source |
|---|---|---|
| `fast_period` | int | `ema_crossover` |
| `slow_period` | int | `ema_crossover` |
| `use_rsi` | 0 \| 1 | 1 iff `rsi_filter` present |
| `rsi_period` | int | `rsi_filter` (defaults filled if absent) |
| `rsi_lower` | int | `rsi_filter` |
| `rsi_upper` | int | `rsi_filter` |
| `atr_period` | int | `atr_stop_loss` |
| `sl_mult` | float | `atr_stop_loss` |
| `risk_pct` | float | `fixed_risk_pct` |
| `use_session` | 0 \| 1 | 1 iff `session_window` present |
| `session_start_minute` | int | `session_window` |
| `session_end_minute` | int | `session_window` |

When an optional block is absent, set `use_*=0` and still populate related keys with defaults so Jesse’s hyperparameter schema is complete.

## Jesse HTTP handoff

1. Ship/install **one** hand-written strategy class **`ThinSliceMomentum`** under the configured jesse-app `strategies/` tree (path from ATO config; typically Finance jesse-app). Install is a deploy/setup step — **not** runtime file write.
2. Execution does **not** import Finance or Jesse strategy code.
3. HTTP: `routes[].strategy = "ThinSliceMomentum"` and request body `hyperparameters` = compiled map (Finance runners already try this field; adapter documents fallback if a Jesse build ignores it).
4. No codegen and no per-run strategy module generation in Phase 1.

## Vectorized screener

- Same block **predicates and parameters** as Jesse for this profile (shared pure helpers encouraged).
- **Coarser execution** allowed (e.g. bar-close signals, simplified fills).
- Screen ranks survivors for the funnel; **not** trade-for-trade parity with Jesse.

## Future-safe seams

| Later path | How IR stays open |
|---|---|
| Runtime `ComposableStrategy` | Same Strategy config; different compile/runtime backend |
| Codegen | Emit strategy modules from the same blocks + rules |
| More blocks / OR filters | Expand library and honor `composition_rules`; Phase 1 rejects both |

## Explicit non-goals (this ticket)

- Implementing `ThinSliceMomentum` or the vectorized helpers
- Default numeric seed values for every parameter (implementation may pick; ranges optional on blocks)
- Goal-vector keys, knowledge store schema, orchestrator gates
- TV strategy mapping
- Multi-timeframe or short-selling in Phase 1
