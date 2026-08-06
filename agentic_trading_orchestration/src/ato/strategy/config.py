"""StrategyConfig validation for the thin-slice block library."""

from __future__ import annotations

from typing import Any

from ato.domain.types import SignalBlock, StrategyConfig

THIN_SLICE_LIBRARY: dict[str, str] = {
    "ema_crossover": "entry_signal",
    "rsi_filter": "filter",
    "atr_stop_loss": "risk_model",
    "fixed_risk_pct": "position_sizing",
    "session_window": "filter",
}

REQUIRED_BLOCKS = frozenset({"ema_crossover", "atr_stop_loss", "fixed_risk_pct"})


class StrategyValidationError(ValueError):
    """Invalid Strategy config for thin-slice compile."""


def validate_strategy_config(config: StrategyConfig) -> None:
    rules = config.composition_rules or {}
    mode = rules.get("filter_mode", "AND")
    if str(mode).upper() != "AND":
        raise StrategyValidationError(f"filter_mode must be AND, got {mode!r}")

    seen: set[str] = set()
    by_id: dict[str, SignalBlock] = {}
    for block in config.blocks:
        if block.block_id in seen:
            raise StrategyValidationError(f"duplicate block_id: {block.block_id}")
        seen.add(block.block_id)
        expected = THIN_SLICE_LIBRARY.get(block.block_id)
        if expected is None:
            raise StrategyValidationError(f"unknown block_id: {block.block_id}")
        if block.block_type != expected:
            raise StrategyValidationError(
                f"block {block.block_id} type {block.block_type!r} != {expected!r}"
            )
        by_id[block.block_id] = block

    missing = REQUIRED_BLOCKS - seen
    if missing:
        raise StrategyValidationError(f"missing required blocks: {sorted(missing)}")

    ema = by_id["ema_crossover"].parameters
    fast = int(ema.get("fast_period", 0))
    slow = int(ema.get("slow_period", 0))
    if fast >= slow:
        raise StrategyValidationError("ema_crossover requires fast_period < slow_period")

    atr = by_id["atr_stop_loss"].parameters
    if "atr_period" not in atr or "sl_mult" not in atr:
        raise StrategyValidationError("atr_stop_loss requires atr_period and sl_mult")

    sizing = by_id["fixed_risk_pct"].parameters
    if "risk_pct" not in sizing:
        raise StrategyValidationError("fixed_risk_pct requires risk_pct")

    if "rsi_filter" in by_id:
        p = by_id["rsi_filter"].parameters
        if int(p.get("lower", 0)) >= int(p.get("upper", 0)):
            raise StrategyValidationError("rsi_filter requires lower < upper")

    if "session_window" in by_id:
        p = by_id["session_window"].parameters
        if int(p.get("end_minute", 0)) <= int(p.get("start_minute", 0)):
            raise StrategyValidationError(
                "session_window requires end_minute > start_minute (no overnight wrap)"
            )


def thin_slice_momentum_config(
    *,
    fast_period: int = 12,
    slow_period: int = 26,
    atr_period: int = 14,
    sl_mult: float = 2.0,
    risk_pct: float = 0.01,
    use_rsi: bool = False,
    rsi_period: int = 14,
    rsi_lower: int = 30,
    rsi_upper: int = 70,
    use_session: bool = False,
    session_start_minute: int = 570,
    session_end_minute: int = 960,
) -> StrategyConfig:
    """Factory for a valid ThinSliceMomentum Strategy config."""
    blocks: list[SignalBlock] = [
        SignalBlock(
            "ema_crossover",
            "entry_signal",
            {"fast_period": fast_period, "slow_period": slow_period},
        ),
        SignalBlock(
            "atr_stop_loss",
            "risk_model",
            {"atr_period": atr_period, "sl_mult": sl_mult},
        ),
        SignalBlock("fixed_risk_pct", "position_sizing", {"risk_pct": risk_pct}),
    ]
    if use_rsi:
        blocks.append(
            SignalBlock(
                "rsi_filter",
                "filter",
                {"period": rsi_period, "lower": rsi_lower, "upper": rsi_upper},
            )
        )
    if use_session:
        blocks.append(
            SignalBlock(
                "session_window",
                "filter",
                {
                    "start_minute": session_start_minute,
                    "end_minute": session_end_minute,
                },
            )
        )
    return StrategyConfig(blocks=blocks, composition_rules={"filter_mode": "AND"})


def default_param(block_id: str, key: str, default: Any) -> Any:
    return default
