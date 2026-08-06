"""compile_thin_slice → ThinSliceMomentum name + hyperparameter map."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ato.domain.types import StrategyConfig
from ato.strategy.config import StrategyValidationError, validate_strategy_config

# re-export
__all__ = ["CompiledStrategy", "StrategyValidationError", "compile_thin_slice"]


@dataclass(frozen=True)
class CompiledStrategy:
    strategy_name: str
    profile: str
    enabled_blocks: list[str]
    hyperparameters: dict[str, Any]


def compile_thin_slice(strategy_config: StrategyConfig) -> CompiledStrategy:
    validate_strategy_config(strategy_config)
    by_id = {b.block_id: b for b in strategy_config.blocks}
    enabled = sorted(by_id.keys())

    ema = by_id["ema_crossover"].parameters
    atr = by_id["atr_stop_loss"].parameters
    sizing = by_id["fixed_risk_pct"].parameters

    rsi = by_id.get("rsi_filter")
    session = by_id.get("session_window")

    hp: dict[str, Any] = {
        "fast_period": int(ema["fast_period"]),
        "slow_period": int(ema["slow_period"]),
        "use_rsi": 1 if rsi else 0,
        "rsi_period": int(rsi.parameters.get("period", 14)) if rsi else 14,
        "rsi_lower": int(rsi.parameters.get("lower", 30)) if rsi else 30,
        "rsi_upper": int(rsi.parameters.get("upper", 70)) if rsi else 70,
        "atr_period": int(atr["atr_period"]),
        "sl_mult": float(atr["sl_mult"]),
        "risk_pct": float(sizing["risk_pct"]),
        "use_session": 1 if session else 0,
        "session_start_minute": int(session.parameters.get("start_minute", 570))
        if session
        else 570,
        "session_end_minute": int(session.parameters.get("end_minute", 960))
        if session
        else 960,
    }

    return CompiledStrategy(
        strategy_name="ThinSliceMomentum",
        profile="thin_slice_v1",
        enabled_blocks=enabled,
        hyperparameters=hp,
    )
