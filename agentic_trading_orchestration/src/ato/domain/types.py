"""Phase 1 domain entity shapes (locked field surface)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

CampaignStatus = Literal[
    "idle",
    "researching",
    "discovering",
    "executing",
    "evaluating",
    "deciding",
    "awaiting_human",
    "completed",
    "failed",
]

ThesisStatus = Literal["active", "exhausted", "abandoned", "promoted"]
Verdict = Literal["promising_mutable", "dead_end", "meets_goals", "incomplete"]
NextAction = Literal[
    "mutate", "new_thesis", "promote", "abort", "re_research", "await_human"
]
GateReason = Literal[
    "promote", "await_human", "abort_confirm", "budget_exhausted", "anomaly"
]
GateStatus = Literal["pending", "approved", "rejected"]
BlockType = Literal[
    "entry_signal", "exit_signal", "filter", "risk_model", "position_sizing"
]
ExecutionTier = Literal["vectorized", "jesse", "tv"]

VALID_CAMPAIGN_STATUSES: frozenset[str] = frozenset(
    {
        "idle",
        "researching",
        "discovering",
        "executing",
        "evaluating",
        "deciding",
        "awaiting_human",
        "completed",
        "failed",
    }
)
VALID_THESIS_STATUSES: frozenset[str] = frozenset(
    {"active", "exhausted", "abandoned", "promoted"}
)
VALID_VERDICTS: frozenset[str] = frozenset(
    {"promising_mutable", "dead_end", "meets_goals", "incomplete"}
)
VALID_NEXT_ACTIONS: frozenset[str] = frozenset(
    {"mutate", "new_thesis", "promote", "abort", "re_research", "await_human"}
)
VALID_GATE_REASONS: frozenset[str] = frozenset(
    {"promote", "await_human", "abort_confirm", "budget_exhausted", "anomaly"}
)
VALID_GATE_STATUSES: frozenset[str] = frozenset({"pending", "approved", "rejected"})


def utc_now() -> datetime:
    return datetime.now(UTC)


def new_id() -> str:
    return str(uuid4())


@dataclass
class GoalVector:
    min_sharpe: float
    min_win_rate: float
    max_drawdown: float
    min_trades: int

    def to_dict(self) -> dict[str, float | int]:
        return {
            "min_sharpe": self.min_sharpe,
            "min_win_rate": self.min_win_rate,
            "max_drawdown": self.max_drawdown,
            "min_trades": self.min_trades,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> GoalVector:
        return cls(
            min_sharpe=float(data["min_sharpe"]),
            min_win_rate=float(data["min_win_rate"]),
            max_drawdown=float(data["max_drawdown"]),
            min_trades=int(data["min_trades"]),
        )


@dataclass
class CampaignConstraints:
    date_start: str | None = None
    date_end: str | None = None
    max_experiments: int | None = None
    screen_top_k: int | None = None
    screen_top_fraction: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "date_start": self.date_start,
            "date_end": self.date_end,
            "max_experiments": self.max_experiments,
            "screen_top_k": self.screen_top_k,
            "screen_top_fraction": self.screen_top_fraction,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> CampaignConstraints:
        data = data or {}
        return cls(
            date_start=data.get("date_start"),
            date_end=data.get("date_end"),
            max_experiments=data.get("max_experiments"),
            screen_top_k=data.get("screen_top_k"),
            screen_top_fraction=data.get("screen_top_fraction"),
        )


@dataclass
class Campaign:
    id: str
    name: str
    goal_vector: GoalVector
    constraints: CampaignConstraints
    asset_universe: list[str]
    status: CampaignStatus = "idle"
    created_at: datetime = field(default_factory=utc_now)


@dataclass
class Thesis:
    id: str
    campaign_id: str
    title: str
    summary: str
    status: ThesisStatus = "active"
    created_at: datetime = field(default_factory=utc_now)


@dataclass
class SignalBlock:
    block_id: str
    block_type: BlockType
    parameters: dict[str, Any] = field(default_factory=dict)
    parameter_ranges: dict[str, Any] | None = None


@dataclass
class StrategyConfig:
    blocks: list[SignalBlock]
    composition_rules: dict[str, Any] = field(default_factory=lambda: {"filter_mode": "AND"})

    def to_dict(self) -> dict[str, Any]:
        return {
            "blocks": [
                {
                    "block_id": b.block_id,
                    "block_type": b.block_type,
                    "parameters": b.parameters,
                    "parameter_ranges": b.parameter_ranges,
                }
                for b in self.blocks
            ],
            "composition_rules": self.composition_rules,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> StrategyConfig:
        blocks = [
            SignalBlock(
                block_id=b["block_id"],
                block_type=b["block_type"],
                parameters=dict(b.get("parameters") or {}),
                parameter_ranges=b.get("parameter_ranges"),
            )
            for b in data.get("blocks") or []
        ]
        return cls(
            blocks=blocks,
            composition_rules=dict(data.get("composition_rules") or {"filter_mode": "AND"}),
        )


@dataclass
class BacktestResult:
    sharpe: float | None = None
    win_rate: float | None = None
    max_drawdown: float | None = None
    total_return: float | None = None
    n_trades: int | None = None
    expectancy: float | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "sharpe": self.sharpe,
            "win_rate": self.win_rate,
            "max_drawdown": self.max_drawdown,
            "total_return": self.total_return,
            "n_trades": self.n_trades,
            "expectancy": self.expectancy,
            "error": self.error,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> BacktestResult:
        data = data or {}
        return cls(
            sharpe=data.get("sharpe"),
            win_rate=data.get("win_rate"),
            max_drawdown=data.get("max_drawdown"),
            total_return=data.get("total_return"),
            n_trades=data.get("n_trades"),
            expectancy=data.get("expectancy"),
            error=data.get("error"),
        )


# results: asset -> tier -> BacktestResult
ResultsMap = dict[str, dict[str, BacktestResult]]


@dataclass
class Experiment:
    id: str
    campaign_id: str
    thesis_id: str
    hypothesis: str
    why_generated: str
    strategy_config: StrategyConfig
    parent_experiment_id: str | None = None
    mutation_delta: str = ""
    results: ResultsMap = field(default_factory=dict)
    regime_tags: list[str] = field(default_factory=list)
    regime_performance: dict[str, Any] = field(default_factory=dict)
    verdict: Verdict | None = None
    next_action: NextAction | None = None
    next_reasoning: str | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    screen_metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ResearchBrief:
    campaign_id: str
    summary: str
    candidate_assets: list[str]
    observed_patterns: list[str]
    suggested_thesis_directions: list[str]
    id: str | None = None
    created_at: datetime = field(default_factory=utc_now)


@dataclass
class HumanGate:
    id: str
    campaign_id: str
    reason: GateReason
    payload: dict[str, Any]
    status: GateStatus = "pending"
    created_at: datetime = field(default_factory=utc_now)
    resolved_at: datetime | None = None


@dataclass
class Decision:
    action: NextAction
    reasoning: str = ""
    override: bool = False
