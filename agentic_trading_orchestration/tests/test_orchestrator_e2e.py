"""Faked full cycle CI bar."""

from pathlib import Path

import pytest

from ato.domain.seed import PHASE1_SEED
from ato.domain.types import Campaign, new_id, utc_now
from ato.engines import (
    DiscoveryEngine,
    EvaluationEngine,
    FakeLLMProvider,
    ResearchEngine,
)
from ato.execution import ExecutionEngine, FixtureDataProvider, MockJesseAdapter
from ato.knowledge import KnowledgeGraph
from ato.orchestrator import CEOOrchestrator, EventBus
from ato.symbols import to_jesse_symbol


@pytest.mark.asyncio
async def test_full_cycle_with_gate(tmp_path: Path) -> None:
    store = KnowledgeGraph(tmp_path / "db.sqlite", tmp_path / "knowledge")
    llm = FakeLLMProvider()
    bus = EventBus()
    orch = CEOOrchestrator(
        store=store,
        research=ResearchEngine(llm),
        discovery=DiscoveryEngine(llm),
        execution=ExecutionEngine(FixtureDataProvider(), MockJesseAdapter()),
        evaluation=EvaluationEngine(llm),
        events=bus,
    )
    campaign = Campaign(
        id=new_id(),
        name=PHASE1_SEED["name"],
        goal_vector=PHASE1_SEED["goal_vector"],
        constraints=PHASE1_SEED["constraints"],
        asset_universe=list(PHASE1_SEED["asset_universe"]),
    )
    exp = await orch.run_one_cycle(campaign)
    assert exp.id
    assert exp.results
    got = await store.get_experiment(exp.id)
    assert got is not None
    assert got.verdict is not None

    campaign = await store.get_campaign(campaign.id)
    assert campaign is not None
    assert campaign.status == "awaiting_human"

    gates = await store.list_human_gates(campaign.id, status="pending")
    assert len(gates) == 1
    gate = gates[0]
    gate.status = "approved"
    gate.resolved_at = utc_now()
    await store.upsert_human_gate(gate)
    campaign = await orch.resume_after_gate(campaign, gate)
    assert campaign.status in ("completed", "discovering")

    types = {e.type for e in bus.list_events(campaign.id)}
    assert "research_started" in types
    assert "experiment_shell_created" in types
    assert "evaluation_finished" in types
    assert "gate_opened" in types
    assert "cycle_decision" in types


def test_symbol_identity() -> None:
    ident = to_jesse_symbol("oklo")
    assert ident.jesse_symbol == "OKLO-USD"
    assert ident.bare_ticker == "OKLO"
