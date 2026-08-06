from __future__ import annotations

from typing import Any

from ato.domain.types import (
    Campaign,
    Experiment,
    HumanGate,
    Thesis,
)


def campaign_dto(c: Campaign) -> dict[str, Any]:
    return {
        "id": c.id,
        "name": c.name,
        "goal_vector": c.goal_vector.to_dict(),
        "constraints": c.constraints.to_dict(),
        "asset_universe": c.asset_universe,
        "status": c.status,
        "created_at": c.created_at.isoformat(),
    }


def thesis_dto(t: Thesis) -> dict[str, Any]:
    return {
        "id": t.id,
        "campaign_id": t.campaign_id,
        "title": t.title,
        "summary": t.summary,
        "status": t.status,
        "created_at": t.created_at.isoformat(),
    }


def experiment_dto(e: Experiment, *, detail: bool = True) -> dict[str, Any]:
    results: dict[str, Any] = {}
    for asset, tiers in e.results.items():
        results[asset] = {tier: bt.to_dict() for tier, bt in tiers.items()}
    data: dict[str, Any] = {
        "id": e.id,
        "campaign_id": e.campaign_id,
        "thesis_id": e.thesis_id,
        "parent_experiment_id": e.parent_experiment_id,
        "hypothesis": e.hypothesis,
        "why_generated": e.why_generated,
        "mutation_delta": e.mutation_delta,
        "verdict": e.verdict,
        "next_action": e.next_action,
        "next_reasoning": e.next_reasoning if detail else None,
        "created_at": e.created_at.isoformat(),
        "updated_at": e.updated_at.isoformat(),
    }
    if detail:
        data["strategy_config"] = e.strategy_config.to_dict()
        data["results"] = results
        data["regime_tags"] = e.regime_tags
        data["regime_performance"] = e.regime_performance
        data["screen_metadata"] = e.screen_metadata
    return data


def gate_dto(g: HumanGate) -> dict[str, Any]:
    return {
        "id": g.id,
        "campaign_id": g.campaign_id,
        "reason": g.reason,
        "payload": g.payload,
        "status": g.status,
        "created_at": g.created_at.isoformat(),
        "resolved_at": g.resolved_at.isoformat() if g.resolved_at else None,
    }


def summary_sharpe(e: Experiment) -> float | None:
    for tiers in e.results.values():
        bt = tiers.get("jesse") or tiers.get("vectorized")
        if bt and bt.sharpe is not None:
            return float(bt.sharpe)
    return None
