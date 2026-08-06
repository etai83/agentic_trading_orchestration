"""Pure goal-vector scoring (all-must-pass + multi-asset median rollup)."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import median
from typing import Any

from ato.domain.types import BacktestResult, GoalVector, ResultsMap


@dataclass
class FieldScore:
    actual: float | None
    target: float
    passed: bool
    slack: float | None = None


@dataclass
class GoalScore:
    fields: dict[str, FieldScore]
    meets_goals: bool
    incomplete: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "meets_goals": self.meets_goals,
            "incomplete": self.incomplete,
            "fields": {
                k: {
                    "actual": v.actual,
                    "target": v.target,
                    "pass": v.passed,
                    "slack": v.slack,
                }
                for k, v in self.fields.items()
            },
        }


def _prefer_tier(tiers: dict[str, BacktestResult]) -> BacktestResult | None:
    if "jesse" in tiers:
        return tiers["jesse"]
    if "vectorized" in tiers:
        return tiers["vectorized"]
    return None


def _normalize_drawdown(value: float | None) -> float | None:
    if value is None:
        return None
    return abs(float(value))


def rollup_metrics(results: ResultsMap) -> dict[str, float | None]:
    """Median metrics across assets using Jesse-preferred tier per asset."""
    buckets: dict[str, list[float]] = {
        "sharpe": [],
        "win_rate": [],
        "max_drawdown": [],
        "n_trades": [],
        "total_return": [],
        "expectancy": [],
    }
    for _asset, tiers in results.items():
        bt = _prefer_tier(tiers)
        if bt is None:
            continue
        if bt.sharpe is not None:
            buckets["sharpe"].append(float(bt.sharpe))
        if bt.win_rate is not None:
            buckets["win_rate"].append(float(bt.win_rate))
        dd = _normalize_drawdown(bt.max_drawdown)
        if dd is not None:
            buckets["max_drawdown"].append(dd)
        if bt.n_trades is not None:
            buckets["n_trades"].append(float(bt.n_trades))
        if bt.total_return is not None:
            buckets["total_return"].append(float(bt.total_return))
        if bt.expectancy is not None:
            buckets["expectancy"].append(float(bt.expectancy))

    out: dict[str, float | None] = {}
    for key, vals in buckets.items():
        out[key] = float(median(vals)) if vals else None
    return out


def score_against_goals(results: ResultsMap, goal_vector: GoalVector) -> GoalScore:
    """All-must-pass comparison of rolled-up actuals vs goal vector.

    Incomplete if any goal field's actual is null or no scorable assets.
    """
    rolled = rollup_metrics(results)
    fields: dict[str, FieldScore] = {}
    incomplete = False
    all_pass = True

    checks: list[tuple[str, float | None, float, str]] = [
        ("min_sharpe", rolled.get("sharpe"), goal_vector.min_sharpe, "floor"),
        ("min_win_rate", rolled.get("win_rate"), goal_vector.min_win_rate, "floor"),
        (
            "max_drawdown",
            rolled.get("max_drawdown"),
            goal_vector.max_drawdown,
            "ceiling",
        ),
        ("min_trades", rolled.get("n_trades"), float(goal_vector.min_trades), "floor"),
    ]

    nullish = (
        rolled.get("sharpe"),
        rolled.get("win_rate"),
        rolled.get("max_drawdown"),
        rolled.get("n_trades"),
    )
    if all(v is None for v in nullish):
        incomplete = True
        all_pass = False

    for name, actual, target, mode in checks:
        if actual is None:
            incomplete = True
            fields[name] = FieldScore(actual=None, target=target, passed=False, slack=None)
            all_pass = False
            continue
        if mode == "floor":
            passed = actual >= target
            slack = actual - target
        else:
            passed = actual <= target
            slack = target - actual
        if not passed:
            all_pass = False
        fields[name] = FieldScore(actual=actual, target=target, passed=passed, slack=slack)

    meets = all_pass and not incomplete
    return GoalScore(fields=fields, meets_goals=meets, incomplete=incomplete)
