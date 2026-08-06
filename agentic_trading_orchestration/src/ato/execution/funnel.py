"""Execution funnel: vectorized screen → Jesse on survivors."""

from __future__ import annotations

from typing import Any

from ato.domain.types import BacktestResult, CampaignConstraints, StrategyConfig
from ato.execution.data_provider import DataProvider
from ato.execution.jesse_mock import MockJesseAdapter
from ato.execution.vectorized import vectorized_screen


class ExecutionEngine:
    def __init__(
        self,
        data_provider: DataProvider,
        jesse: MockJesseAdapter | None = None,
    ) -> None:
        self.data_provider = data_provider
        self.jesse = jesse or MockJesseAdapter()

    async def run(
        self,
        strategy_config: StrategyConfig,
        assets: list[str],
        constraints: CampaignConstraints,
    ) -> tuple[dict[str, dict[str, BacktestResult]], dict[str, Any]]:
        survivors, vec_results, screened_out = await vectorized_screen(
            assets,
            strategy_config,
            self.data_provider,
            top_k=constraints.screen_top_k,
            top_fraction=constraints.screen_top_fraction,
        )
        results: dict[str, dict[str, BacktestResult]] = {}
        for asset, bt in vec_results.items():
            results[asset] = {"vectorized": bt}

        for asset in survivors:
            jesse_bt = await self.jesse.run_backtest(
                ticker=asset, strategy_config=strategy_config
            )
            results.setdefault(asset, {})["jesse"] = jesse_bt

        meta = {
            "survivors": survivors,
            "screened_out": screened_out,
        }
        return results, meta


async def tv_validate(*_args: Any, **_kwargs: Any) -> BacktestResult:
    """TV placeholder — not on happy path."""
    return BacktestResult(error="tv_validate not implemented in Phase 1")
