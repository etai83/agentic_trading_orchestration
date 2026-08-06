"""In-memory KnowledgeGraph double with seed campaign for mock mode."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from ato.domain.seed import PHASE1_SEED
from ato.domain.types import (
    BacktestResult,
    Campaign,
    Experiment,
    HumanGate,
    Thesis,
)
from ato.orchestrator.events import EngineEvent, EventBus
from ato.strategy import thin_slice_momentum_config


def _now() -> datetime:
    return datetime.now(UTC)


class MockKnowledgeGraph:
    def __init__(self, events: EventBus | None = None) -> None:
        self.events = events or EventBus()
        self.campaigns: dict[str, Campaign] = {}
        self.theses: dict[str, Thesis] = {}
        self.experiments: dict[str, Experiment] = {}
        self.gates: dict[str, HumanGate] = {}
        self.knowledge_root = "/mock/knowledge"
        self._seed()

    def _seed(self) -> None:
        cid = "11111111-1111-1111-1111-111111111111"
        tid = "22222222-2222-2222-2222-222222222222"
        eid = "33333333-3333-3333-3333-333333333333"
        gid = "44444444-4444-4444-4444-444444444444"
        campaign = Campaign(
            id=cid,
            name=PHASE1_SEED["name"],
            goal_vector=PHASE1_SEED["goal_vector"],
            constraints=PHASE1_SEED["constraints"],
            asset_universe=list(PHASE1_SEED["asset_universe"]),
            status="awaiting_human",
        )
        thesis = Thesis(
            id=tid,
            campaign_id=cid,
            title="Thin-slice momentum",
            summary="EMA cross with ATR risk on seed equities",
        )
        exp = Experiment(
            id=eid,
            campaign_id=cid,
            thesis_id=tid,
            hypothesis="Fast/slow EMA captures trend",
            why_generated="mock seed",
            strategy_config=thin_slice_momentum_config(),
            results={
                "OKLO": {
                    "jesse": BacktestResult(
                        sharpe=0.9, win_rate=0.52, max_drawdown=0.12, n_trades=18
                    )
                },
                "IONQ": {
                    "vectorized": BacktestResult(
                        sharpe=0.4, win_rate=0.48, max_drawdown=0.2, n_trades=8
                    )
                },
            },
            verdict="promising_mutable",
            next_action="await_human",
            next_reasoning="Needs human review (mock)",
        )
        gate = HumanGate(
            id=gid,
            campaign_id=cid,
            reason="await_human",
            payload={
                "experiment_id": eid,
                "decision": "await_human",
                "summary": "Review promising experiment",
            },
            status="pending",
        )
        self.campaigns[cid] = campaign
        self.theses[tid] = thesis
        self.experiments[eid] = exp
        self.gates[gid] = gate
        for typ, payload in [
            ("campaign_state_changed", {"from": "evaluating", "to": "awaiting_human"}),
            ("research_finished", {"message": "mock research"}),
            ("experiment_shell_created", {"experiment_id": eid, "thesis_id": tid}),
            ("evaluation_finished", {"experiment_id": eid, "verdict": "promising_mutable"}),
            ("gate_opened", {"gate_id": gid, "experiment_id": eid, "reason": "await_human"}),
        ]:
            self.events.emit(EngineEvent(type=typ, campaign_id=cid, payload=payload))

    async def list_campaigns(self) -> list[Campaign]:
        return list(self.campaigns.values())

    async def get_campaign(self, campaign_id: str) -> Campaign | None:
        return self.campaigns.get(campaign_id)

    async def list_theses(self, campaign_id: str) -> list[Thesis]:
        return [t for t in self.theses.values() if t.campaign_id == campaign_id]

    async def list_experiments(
        self, *, thesis_id: str | None = None, campaign_id: str | None = None
    ) -> list[Experiment]:
        out = list(self.experiments.values())
        if thesis_id:
            out = [e for e in out if e.thesis_id == thesis_id]
        if campaign_id:
            out = [e for e in out if e.campaign_id == campaign_id]
        return out

    async def get_experiment(self, experiment_id: str) -> Experiment | None:
        return self.experiments.get(experiment_id)

    async def list_human_gates(
        self, campaign_id: str, *, status: str | None = None
    ) -> list[HumanGate]:
        out = [g for g in self.gates.values() if g.campaign_id == campaign_id]
        if status:
            out = [g for g in out if g.status == status]
        return out

    async def list_human_gates_all(self, *, status: str | None = None) -> list[HumanGate]:
        out = list(self.gates.values())
        if status:
            out = [g for g in out if g.status == status]
        return out

    async def get_human_gate(self, gate_id: str) -> HumanGate | None:
        return self.gates.get(gate_id)

    async def upsert_human_gate(self, gate: HumanGate) -> None:
        self.gates[gate.id] = gate

    def experiment_markdown_path(self, experiment: Experiment) -> Any:
        from pathlib import Path

        return Path(self.knowledge_root) / experiment.thesis_id / f"{experiment.id}.md"
