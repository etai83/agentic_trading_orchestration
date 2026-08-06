"""Unit tests for score_against_goals."""

from ato.domain.goal_scoring import score_against_goals
from ato.domain.types import BacktestResult, GoalVector


def _gv() -> GoalVector:
    return GoalVector(min_sharpe=0.5, min_win_rate=0.45, max_drawdown=0.25, min_trades=10)


def test_meets_goals_all_pass() -> None:
    results = {
        "OKLO": {
            "jesse": BacktestResult(
                sharpe=1.0, win_rate=0.5, max_drawdown=0.1, n_trades=20
            )
        },
        "IONQ": {
            "jesse": BacktestResult(
                sharpe=0.8, win_rate=0.55, max_drawdown=0.15, n_trades=12
            )
        },
    }
    score = score_against_goals(results, _gv())
    assert score.meets_goals is True
    assert score.incomplete is False
    assert score.fields["min_sharpe"].passed is True


def test_fails_when_one_field_misses() -> None:
    results = {
        "OKLO": {
            "jesse": BacktestResult(
                sharpe=0.2, win_rate=0.5, max_drawdown=0.1, n_trades=20
            )
        }
    }
    score = score_against_goals(results, _gv())
    assert score.meets_goals is False
    assert score.fields["min_sharpe"].passed is False
    assert score.fields["min_win_rate"].passed is True


def test_incomplete_on_null_actual() -> None:
    results = {
        "OKLO": {
            "jesse": BacktestResult(
                sharpe=None, win_rate=0.5, max_drawdown=0.1, n_trades=20
            )
        }
    }
    score = score_against_goals(results, _gv())
    assert score.incomplete is True
    assert score.meets_goals is False
    assert score.fields["min_sharpe"].actual is None


def test_incomplete_when_no_scorable_assets() -> None:
    score = score_against_goals({}, _gv())
    assert score.incomplete is True
    assert score.meets_goals is False


def test_prefers_jesse_over_vectorized() -> None:
    results = {
        "OKLO": {
            "vectorized": BacktestResult(
                sharpe=0.1, win_rate=0.1, max_drawdown=0.5, n_trades=1
            ),
            "jesse": BacktestResult(
                sharpe=1.0, win_rate=0.6, max_drawdown=0.1, n_trades=30
            ),
        }
    }
    score = score_against_goals(results, _gv())
    assert score.fields["min_sharpe"].actual == 1.0


def test_drawdown_uses_positive_magnitude() -> None:
    results = {
        "OKLO": {
            "jesse": BacktestResult(
                sharpe=1.0, win_rate=0.5, max_drawdown=-0.1, n_trades=20
            )
        }
    }
    score = score_against_goals(results, _gv())
    assert score.fields["max_drawdown"].actual == 0.1
    assert score.fields["max_drawdown"].passed is True


def test_median_rollup_across_assets() -> None:
    results = {
        "A": {"jesse": BacktestResult(sharpe=0.0, win_rate=0.5, max_drawdown=0.1, n_trades=10)},
        "B": {"jesse": BacktestResult(sharpe=1.0, win_rate=0.5, max_drawdown=0.1, n_trades=10)},
        "C": {"jesse": BacktestResult(sharpe=2.0, win_rate=0.5, max_drawdown=0.1, n_trades=10)},
    }
    score = score_against_goals(results, _gv())
    assert score.fields["min_sharpe"].actual == 1.0
