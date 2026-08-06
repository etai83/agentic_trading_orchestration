import pytest

from ato.domain.types import SignalBlock, StrategyConfig
from ato.strategy import StrategyValidationError, compile_thin_slice, thin_slice_momentum_config


def test_compile_required_blocks() -> None:
    cfg = thin_slice_momentum_config()
    compiled = compile_thin_slice(cfg)
    assert compiled.strategy_name == "ThinSliceMomentum"
    assert compiled.profile == "thin_slice_v1"
    assert compiled.hyperparameters["fast_period"] == 12
    assert compiled.hyperparameters["use_rsi"] == 0
    assert compiled.hyperparameters["use_session"] == 0


def test_compile_with_optional_blocks() -> None:
    cfg = thin_slice_momentum_config(use_rsi=True, use_session=True)
    compiled = compile_thin_slice(cfg)
    assert compiled.hyperparameters["use_rsi"] == 1
    assert compiled.hyperparameters["use_session"] == 1
    assert "rsi_filter" in compiled.enabled_blocks


def test_reject_unknown_block() -> None:
    cfg = thin_slice_momentum_config()
    cfg.blocks.append(SignalBlock("magic", "filter", {}))
    with pytest.raises(StrategyValidationError):
        compile_thin_slice(cfg)


def test_reject_or_filter_mode() -> None:
    cfg = thin_slice_momentum_config()
    cfg.composition_rules = {"filter_mode": "OR"}
    with pytest.raises(StrategyValidationError):
        compile_thin_slice(cfg)


def test_reject_missing_required() -> None:
    cfg = StrategyConfig(
        blocks=[
            SignalBlock(
                "ema_crossover",
                "entry_signal",
                {"fast_period": 5, "slow_period": 20},
            )
        ]
    )
    with pytest.raises(StrategyValidationError):
        compile_thin_slice(cfg)


def test_reject_fast_not_less_than_slow() -> None:
    with pytest.raises(StrategyValidationError):
        compile_thin_slice(thin_slice_momentum_config(fast_period=30, slow_period=10))
