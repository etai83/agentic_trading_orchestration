"""Mock Jesse adapter — no live HTTP; returns Backtest results for CI."""

from __future__ import annotations

from typing import Any

from ato.domain.types import BacktestResult, StrategyConfig
from ato.execution.data_provider import FixtureDataProvider
from ato.execution.vectorized import vectorized_backtest
from ato.strategy.compile import compile_thin_slice
from ato.symbols import to_jesse_symbol


class MockJesseAdapter:
    """Simulates Jesse HTTP backend with vectorized-like metrics + small edge."""

    def __init__(self, data_provider: FixtureDataProvider | None = None) -> None:
        self.data_provider = data_provider or FixtureDataProvider()

    async def run_backtest(
        self,
        *,
        ticker: str,
        strategy_config: StrategyConfig,
        hyperparameters: dict[str, Any] | None = None,
    ) -> BacktestResult:
        identity = to_jesse_symbol(ticker)
        _ = compile_thin_slice(strategy_config)  # validate
        bars = await self.data_provider.get_ohlcv(identity.bare_ticker)
        base = vectorized_backtest(bars, strategy_config)
        # Slightly better mock "simulation" fidelity vs screen
        sharpe = None if base.sharpe is None else base.sharpe * 1.05
        return BacktestResult(
            sharpe=sharpe,
            win_rate=base.win_rate,
            max_drawdown=base.max_drawdown,
            total_return=base.total_return,
            n_trades=base.n_trades,
            expectancy=base.expectancy,
        )
