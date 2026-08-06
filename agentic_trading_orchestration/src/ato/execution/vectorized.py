"""Coarse vectorized screener using shared ThinSliceMomentum hyperparameters."""

from __future__ import annotations

from ato.domain.types import BacktestResult, StrategyConfig
from ato.execution.data_provider import CandleBar
from ato.strategy.compile import compile_thin_slice


def _ema(values: list[float], period: int) -> list[float | None]:
    if period <= 0 or not values:
        return [None] * len(values)
    k = 2 / (period + 1)
    out: list[float | None] = [None] * len(values)
    # seed with SMA
    if len(values) < period:
        return out
    sma = sum(values[:period]) / period
    out[period - 1] = sma
    prev = sma
    for i in range(period, len(values)):
        prev = values[i] * k + prev * (1 - k)
        out[i] = prev
    return out


def vectorized_backtest(
    bars: list[CandleBar], strategy_config: StrategyConfig
) -> BacktestResult:
    """Bar-close EMA cross long-only with simplified fills."""
    compiled = compile_thin_slice(strategy_config)
    hp = compiled.hyperparameters
    closes = [b.close for b in bars]
    fast = _ema(closes, int(hp["fast_period"]))
    slow = _ema(closes, int(hp["slow_period"]))

    position = 0
    entry = 0.0
    wins = 0
    losses = 0
    rets: list[float] = []
    peak = closes[0] if closes else 0.0
    max_dd = 0.0
    equity = 1.0

    for i in range(1, len(closes)):
        if fast[i] is None or slow[i] is None or fast[i - 1] is None or slow[i - 1] is None:
            continue
        cross_up = fast[i - 1] <= slow[i - 1] and fast[i] > slow[i]
        cross_dn = fast[i - 1] >= slow[i - 1] and fast[i] < slow[i]
        if position == 0 and cross_up:
            position = 1
            entry = closes[i]
        elif position == 1 and cross_dn:
            r = (closes[i] - entry) / entry
            rets.append(r)
            if r >= 0:
                wins += 1
            else:
                losses += 1
            equity *= 1 + r
            position = 0
        peak = max(peak, equity)
        dd = (peak - equity) / peak if peak else 0.0
        max_dd = max(max_dd, dd)

    n = wins + losses
    if n == 0:
        return BacktestResult(
            sharpe=0.0, win_rate=0.0, max_drawdown=max_dd, total_return=0.0, n_trades=0
        )
    avg = sum(rets) / n
    var = sum((r - avg) ** 2 for r in rets) / n
    std = var**0.5
    sharpe = (avg / std) * (n**0.5) if std > 1e-12 else 0.0
    return BacktestResult(
        sharpe=float(sharpe),
        win_rate=wins / n,
        max_drawdown=float(max_dd),
        total_return=float(equity - 1.0),
        n_trades=n,
        expectancy=float(avg),
    )


async def vectorized_screen(
    assets: list[str],
    strategy_config: StrategyConfig,
    data_provider,
    *,
    top_k: int | None = None,
    top_fraction: float | None = None,
) -> tuple[list[str], dict[str, BacktestResult], list[str]]:
    scores: list[tuple[str, BacktestResult]] = []
    for asset in assets:
        bars = await data_provider.get_ohlcv(asset)
        bt = vectorized_backtest(bars, strategy_config)
        scores.append((asset, bt))
    scores.sort(key=lambda x: (x[1].sharpe or float("-inf")), reverse=True)

    k = top_k
    if k is None and top_fraction is not None:
        k = max(1, int(len(scores) * top_fraction))
    if k is None:
        k = len(scores)

    survivors = [a for a, _ in scores[:k]]
    screened_out = [a for a, _ in scores[k:]]
    results = {a: bt for a, bt in scores}
    return survivors, results, screened_out
