# Research: Candle and symbol conventions (Finance Jesse)

**Ticket:** [#3](https://github.com/etai83/agentic_trading_orchestration/issues/3)  
**Branch:** `research/candle-symbol-conventions`  
**Primary sources:** `/Users/itaiharpaz/Code/Finance/jesse-app/test-bot/` (`import_*_candles.py`, strategy routes/optimizers, vectorized scanners) and related Finance raw CSVs under `/Users/itaiharpaz/Code/Finance/data/raw/`.  
**Scope:** Observed conventions only. No ATO product code. ATO must not import Finance packages.

Labels used below:

- **Observed fact** — directly present in primary sources.
- **Recommendation** — minimal CI/fixture design for ATO Phase 1 dual data path (not implemented here).

---

## Summary

Finance’s Jesse path treats **Postgres `candle` rows as continuous 1m OHLCV** keyed by `(exchange, symbol, timeframe, timestamp)`. Equity importers source yfinance or TradingView CSVs, expand coarser bars to 1m, and **gap-fill non-session minutes with flat OHLC and `volume=0`**. Strategies and vectorized scanners then **resample 1m → target TF** and usually **drop `volume == 0` bars** before indicators (TV parity).

Symbol convention for equities is **`{TICKER}-USD`** on a real-ish exchange string (`NYSE`, `NASDAQ`). Crypto/research macros use either native venues (`COINBASE` / `BTC-USD`, Binance perpetual `BTC-USDT`) or the **research multi-symbol hack: re-import external series under the primary exchange** (e.g. all under `NYSE` for IonqMacro1h).

Warm-up is consistently **`warm_up_candles: 240`** in Jesse research config (in **route timeframe** bars), with SQL fetch windows commonly **100–120 calendar days** (or multi-TF-aware windows) before the trading start.

For ATO Phase 1 dual path:

| Path | Shape | Source of truth in Finance |
|------|--------|----------------------------|
| Research + vectorized screening | yfinance-shaped frames / resampled active bars | Raw CSVs + scanners that filter `volume > 0` |
| Jesse simulation | continuous 1m in Postgres (or in-memory candles dict for `jesse.research.backtest`) | importers + optimizers |

CI can ship **tiny offline fixtures** in yfinance capital-OHLCV shape plus an optional Jesse-array fixture (`timestamp, open, close, high, low, volume`) without network or Postgres.

---

## Symbol / exchange / timeframe conventions

### Equity (primary Phase 1 assets) — **observed fact**

| Ticker (yfinance/TV) | Jesse `symbol` | Jesse `exchange` | Notes |
|----------------------|----------------|------------------|--------|
| OKLO | `OKLO-USD` | `NYSE` | Importers + optimizers (`optimize_OkloIntraday1h`, VwapWave, OkloMomentum, etc.) |
| IONQ | `IONQ-USD` | `NYSE` | IonqMomentum / IonqMacro1h |
| NVDA | `NVDA-USD` | `NASDAQ` | NVDA importers, NvdaHourlyMomentum, NvdaSwing, parity harness |

- **Pattern:** Jesse equity symbols are **not** bare tickers; they are **`{TICKER}-USD`** even though the assets are stocks, not crypto pairs.
- **TV labels differ:** e.g. `NYSE:OKLO`, `BATS:OKLO`, `NASDAQ:NVDA` — used for charting/Pine, not as Jesse DB keys.
- **RTH:** equity 5m importers keep bars with local time in **`[09:30, 16:00)` America/New_York**.

### Macro / multi-asset externals — **observed fact**

`import_external_macro_candles.py` `SYMBOL_MAP`:

| Key | CSV | Exchange | Symbol | TV note |
|-----|-----|----------|--------|---------|
| GLD | `GLD_1h.csv` | `AMEX` | `GLD-USD` | `AMEX:GLD` |
| TNX | `^TNX.csv` | `CBOE` | `TNX-USD` | proxy for `10Y1!` / `TVC:US10Y` |
| BTC | `BTC-USD_1h.csv` | `COINBASE` | `BTC-USD` | `COINBASE:BTCUSD` |

**Research single-exchange multi-symbol override** (IonqMacro1h): external series are also used as `NYSE` / `BTC-USD`, `NYSE` / `GLD-USD`, `NYSE` / `TNX-USD` so `get_candles(self.exchange, symbol, tf)` works under one exchange in Jesse research. Documented in `strategies/IonqMacro1h/SYMBOL_MAP.md`. Importer venue tags and research tags are **not always the same**.

Oklo multi-asset strategies load TV CSVs from disk (BATS_OKLO, BITSTAMP_BTCUSD, etc.) and do **not** always go through Jesse multi-symbol routes.

### Crypto native path — **observed fact**

CloudScalper optimizer:

- `EXCHANGE = "Binance Perpetual Futures"`
- `SYMBOL = "BTC-USDT"`
- route TF `5m`, data routes `1h` / `2h` / `4h`

### Timeframes — **observed fact**

| Layer | Convention |
|-------|------------|
| **DB storage** | Always **`timeframe = "1m"`** after import (even if source was 5m / 1h / 1d expanded) |
| **Strategy routes** | Common: `1h`, `30m`, `15m`, `5m` (equity); CloudScalper `5m` + HTF data routes |
| **Strategy `timeframe.txt`** | Often just `1h` for hourly equity strategies |
| **Resample** | From continuous 1m: open=first, high=max, low=min, close=last, volume=sum; then drop `volume == 0` for “active” bars |
| **TV equity 1h alignment** | TV RTH 1h often opens at **:30**; Jesse resamples on **clock hours**. `import_oklo_1h_candles.py` floors TV open to America/New_York clock-hour before expand so reconstructed Jesse 1h matches source OHLC |

### Candle dict key for Jesse research — **observed fact**

```text
key = f"{exchange}-{symbol}"   # e.g. "NYSE-OKLO-USD", "NASDAQ-NVDA-USD"
candles_dict[key] = {"exchange": ..., "symbol": ..., "candles": np.ndarray}
warmup_dict[key]  = {"exchange": ..., "symbol": ..., "candles": np.ndarray}
```

Routes:

```python
{"exchange": EXCHANGE, "symbol": SYMBOL, "timeframe": TIMEFRAME, "strategy": STRATEGY_NAME}
```

Data routes (extra series / HTF): same shape without `strategy`, e.g. external symbols or `1h`/`2h`/`4h`.

---

## Candle column schemas

### Postgres / Jesse model — **observed fact**

From `jesse.models.Candle` and all importers:

| Column | Type / notes |
|--------|----------------|
| `id` | UUID string (primary key) |
| `timestamp` | int64 **UTC milliseconds** |
| `open`, `close`, `high`, `low`, `volume` | float (**note DB insert order open, close, high, low**) |
| `exchange` | string |
| `symbol` | string |
| `timeframe` | string (`"1m"` in practice) |

Unique index: `(exchange, symbol, timeframe, timestamp)`.

SQL select used everywhere for research:

```sql
SELECT timestamp, open, close, high, low, volume
FROM candle
WHERE exchange = %s AND symbol = %s
  AND timestamp >= %s AND timestamp < %s
ORDER BY timestamp ASC
```

### Numpy / Jesse in-memory candle array — **observed fact**

Column order is **not** classic OHLCV:

```text
[timestamp, open, close, high, low, volume]
```

Strategies comment this explicitly (e.g. OkloIntraday1h: “Jesse candle: `[ts, open, close, high, low, volume]`”).  
`filter_active_candles` builds:

```python
pd.DataFrame(candles, columns=['timestamp', 'open', 'close', 'high', 'low', 'volume'])
df[df['volume'] > 0]
```

### yfinance / Finance raw CSV — **observed fact**

Under `Finance/data/raw/*`:

```text
Datetime,Close,High,Low,Open,Volume   # or Date for daily
```

- Capitalized OHLCV column names.
- Datetime often timezone-aware America/New_York (`...-04:00`) or naive.
- Column order is **Close, High, Low, Open, Volume** (yfinance default), not open-first.
- Importers normalize MultiIndex columns via `df.columns.get_level_values(0)` when needed.

### TradingView 1h export (OKLO path) — **observed fact**

`import_oklo_1h_candles.py` expects columns including `time` (unix **seconds**), `open`, `high`, `low`, `close`, `Volume` (case-insensitive match). Converted to ms timestamps for Jesse.

### Vectorized screening frames — **observed fact**

Scanners load 1m from DB (or could load CSV), set index to America/New_York, resample to strategy TF, **keep only `volume > 0`**, then compute indicators on lowercase `open/high/low/close/volume` columns.

---

## Warm-up / lookback practices

### Jesse config — **observed fact**

| Setting | Typical value | Meaning in Finance scripts |
|---------|---------------|----------------------------|
| `warm_up_candles` | **240** (dominant) | Bars of **route timeframe** for indicator warm-up; sometimes `"240"` string in history API payloads |
| | 100 | Used in some NVDA/OKLO history runners |
| | 2400 | Rare; CloudScalper-related minutes-style comments / mock |

### SQL / fetch lookback before trading start — **observed fact**

| Pattern | Where | Approx purpose |
|---------|--------|----------------|
| `START - 100 * 24h` | IonqMomentum, OkloMomentum, search_sub2_15m, fast_vectorized_scan | ~100 calendar days of 1m for warm-up split |
| `START - 120 * 24h` | OkloIntraday1h, NvdaHourlyMomentum, IonqMacro1h | ~120 days |
| `START - 240 * 4h` | CloudScalper | Cover `warm_up_candles=240` on 4h HTF |
| `START - 10 * 24h` | VwapWave optimizer | Shorter window for 30m strategy |
| `START - 240 * 1h` | IonqMacro1h_floor | 240 hours of 1m |

Split logic (universal):

```python
warmup_mask = all_candles[:, 0] < trading_start_ts
trading_mask = (all_candles[:, 0] >= trading_start_ts) & (all_candles[:, 0] < finish_ts)
```

### Strategy hyperparameter lookbacks — **observed fact**

Separate from engine warm-up: e.g. `pullback_lookback`, `breakout_lookback`, `lookback` (multi-asset composite lag 1–4), EMA periods up to ~200, z-window up to 200 on IonqMacro1h. Engine warm-up must exceed the longest indicator period on the **route TF after volume filtering**.

### Active-bar filtering and gap-fill — **observed fact**

1. Importers expand session/source bars to 1m and **reindex every minute** between min and max timestamp.
2. Missing minutes: `close` ffill; `open/high/low` filled from close; **`volume = 0`**.
3. Strategies’ `filter_active_candles` / scanners drop zero-volume bars so EMAs match TV session series.
4. Parity harness documents that **without** this filter Jesse can trade overnight flat bars and diverge from TV (`parity_compare/README.md`).

---

## How data is imported into Jesse Postgres

### Connection — **observed fact**

```text
host=localhost dbname=jesse_db user=jesse_user password=password
```

### Pipeline (equity importers) — **observed fact**

1. **Load source:** yfinance (`ticker`, period/interval) or local CSV under `Finance/data/raw` or Downloads TV export.
2. **Timezone:** America/New_York for equities (localize or convert).
3. **Session filter** (5m equity paths): RTH only before expand.
4. **Expand** coarser bar → N one-minute bars with linear open→close path; inject true high/low on selected sub-bars so max/min reconstruct.
5. **Continuous reindex** every 60_000 ms; gap-fill as above.
6. **Replace** existing rows: `DELETE FROM candle WHERE exchange = %s AND symbol = %s` then bulk `INSERT` (some use `ON CONFLICT DO NOTHING`).
7. Stored timeframe always **`1m`**.

### Source scripts — **observed fact**

| Script | Role |
|--------|------|
| `import_oklo_candles.py` | OKLO 5m yfinance/CSV → continuous 1m, NYSE/OKLO-USD |
| `import_oklo_1h_candles.py` | TV 1h CSV → ET-hour-aligned continuous 1m + OHLC parity verify |
| `import_ionq_candles.py` | IONQ 5m → continuous 1m, NYSE/IONQ-USD |
| `import_nvda_candles.py` | NVDA 1h CSV → continuous 1m, NASDAQ/NVDA-USD |
| `import_external_macro_candles.py` | GLD/TNX/BTC CSVs → continuous 1m on mapped venues |

Jesse can also import via MCP/native exchange drivers; Finance equity workflow above is the **custom** path used for stock research.

---

## Minimal CI fixture schema recommendation

### Recommendation (not observed as an existing ATO fixture)

Ship offline fixtures under e.g. `tests/fixtures/candles/` with **no network, no Postgres, no Jesse package required** for Research/vectorized unit tests.

#### A. Research / vectorized path (yfinance-shaped) — **recommendation**

Minimal CSV (or parquet) per asset:

| Column | Required | Notes |
|--------|----------|--------|
| `Datetime` | yes | ISO-8601; prefer timezone-aware America/New_York or UTC with documented tz |
| `Open` | yes | Capitalized to match Finance raw |
| `High` | yes | |
| `Low` | yes | |
| `Close` | yes | |
| `Volume` | yes | `> 0` for all fixture rows if representing “active” session bars only |

**Recommendation — size:** ~200–500 bars at the **screening TF** (e.g. 1h or 15m) for one synthetic symbol, enough for EMA(slow≈70) + RSI warm-up. Optionally a second file with intentional `Volume=0` rows if testing gap-fill filters.

**Recommendation — identity sidecar** (JSON next to CSV):

```json
{
  "ticker": "OKLO",
  "jesse_exchange": "NYSE",
  "jesse_symbol": "OKLO-USD",
  "source_timeframe": "1h",
  "session": "RTH",
  "tz": "America/New_York"
}
```

#### B. Jesse simulation path (array / continuous 1m) — **recommendation**

For tests that mock a DataProvider feeding Jesse-shaped arrays (still **without** importing Finance):

| Field | Type | Notes |
|-------|------|--------|
| `timestamp` | int64 | UTC ms, strictly increasing by 60_000 for continuous series |
| `open`, `close`, `high`, `low`, `volume` | float | **Array order** `[ts, open, close, high, low, volume]` |
| gap-fill | optional | include some `volume=0` flat bars if testing filter_active behavior |

**Recommendation:** CI default fixture can be **session-only active bars** (no gap-fill) for vectorized tests, and a **short continuous 1m** segment (e.g. 2–3 RTH days expanded or flat-filled) only where Jesse resample semantics are under test.

#### C. What not to require in CI — **recommendation**

- Live yfinance or TV downloads  
- Running Postgres / `jesse_db`  
- Finance package imports  
- Full multi-year continuous 1m (huge); generate continuous series only when a Jesse integration test needs it, preferably from the small active fixture via the same expand+ffill rules

---

## Implications for ATO DataProvider (no Finance imports)

**Locked constraint:** ATO defines a `DataProvider` Protocol; implementations live in ATO (or thin adapters), never `import` Finance modules.

### Dual path mapping — **recommendation** grounded in observed facts

| Capability | Protocol surface (suggested) | Backing for CI | Backing for local Jesse |
|------------|------------------------------|----------------|-------------------------|
| List universe | `symbol` + optional `exchange` + asset class | fixture sidecar | config |
| Load research frame | yfinance-like columns or normalized lowercase OHLCV + DatetimeIndex | fixture CSV | yfinance or cached CSV |
| Load Jesse candles | `np.ndarray` shape `(n, 6)` order `[ts, o, c, h, l, v]` + exchange/symbol | synthesized from fixture | Postgres query matching Finance SQL |
| Warm-up split | provider or caller splits at `start_ts` with documented lookback | fixture spans warm-up + test window | same 100–120d / 240 bars conventions |
| Active bars | `volume > 0` helper in ATO (do not depend on Finance `custom_indicators`) | fixture | same |

### Identity model — **recommendation**

Normalize internally to something like:

```text
AssetId: { exchange: str, symbol: str }  # Jesse keys, e.g. NYSE / OKLO-USD
Ticker: bare "OKLO" for yfinance
timeframe: "1m" | "5m" | "15m" | "30m" | "1h" | ...
```

Map `Ticker → (exchange, jesse_symbol)` explicitly; do not assume bare ticker equals Jesse symbol.

### Resample contract — **recommendation**

Document a single ATO helper matching Finance practice:

- From 1m continuous: OHLCV aggregate as above  
- Active filter: `volume > 0`  
- Equity research should not treat gap-fill bars as tradeable session bars  

### Multi-asset — **recommendation**

Phase 1 single-asset thin slice can ignore multi-exchange macros. If multi-asset is added later, support either:

1. True per-venue keys (AMEX/GLD-USD, …), or  
2. Research alias keys under primary exchange (IonqMacro convention)  

as an explicit provider policy, not silent magic.

### What ATO should **not** copy blindly — **observed risk**

- Storing equities as `*-USD` is a **Jesse research convention**, not market truth; adapters must preserve it for parity with existing Finance strategies when simulating those routes.
- Continuous 1m gap-fill changes indicator behavior vs pure RTH series; vectorized screening and Jesse must share the same active-bar policy or results will diverge (already seen in Finance parity harness).

---

## Sources

All under primary tree unless noted.

### Importers

- `/Users/itaiharpaz/Code/Finance/jesse-app/test-bot/import_oklo_candles.py`
- `/Users/itaiharpaz/Code/Finance/jesse-app/test-bot/import_oklo_1h_candles.py`
- `/Users/itaiharpaz/Code/Finance/jesse-app/test-bot/import_ionq_candles.py`
- `/Users/itaiharpaz/Code/Finance/jesse-app/test-bot/import_nvda_candles.py`
- `/Users/itaiharpaz/Code/Finance/jesse-app/test-bot/import_external_macro_candles.py`

### Routes / optimizers / history runners (symbol, exchange, warm-up)

- `optimize_OkloIntraday1h.py`, `optimize_IonqMomentum.py`, `optimize_IonqMacro1h.py`, `optimize_NvdaHourlyMomentum.py`, `optimize_VwapWave.py`, `optimize_cloudscalper.py`
- `search_sub2_15m.py`, `fast_vectorized_scan.py`
- `run_oklo_history_backtest.py`, `run_ionq_history_backtest.py`, `run_nvda_swing_history_backtest.py`

### Strategies / indicators

- `strategies/IonqMacro1h/SYMBOL_MAP.md`, `strategies/IonqMacro1h/__init__.py`, `strategies/IonqMacro1h/custom_indicators.py`
- `strategies/OkloIntraday1h/custom_indicators.py`, `strategies/*/custom_indicators.py` (`filter_active_candles`)
- `strategies/NvdaSwing/custom_indicators.py` (array column order)

### Vectorized path

- `fast_df_vectorized.py`, `fast_vectorized_optimizer.py`, `vectorized_vwap_scan.py`

### Schema / parity

- Jesse package model: `jesse/models/Candle.py` (site-packages in test-bot venv)
- `parity_compare/README.md` (gap-fill vs RTH vs TV)

### Raw CSV samples

- `/Users/itaiharpaz/Code/Finance/data/raw/OKLO_5m_fresh.csv`, `NVDA_1h.csv`, `GLD_1h.csv`, `^TNX.csv`, `BTC-USD_1h.csv`
