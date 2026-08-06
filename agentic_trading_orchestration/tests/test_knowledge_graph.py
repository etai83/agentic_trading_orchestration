import pytest

from ato.domain.seed import PHASE1_SEED
from ato.domain.types import (
    Campaign,
    Experiment,
    HumanGate,
    Thesis,
    new_id,
    utc_now,
)
from ato.knowledge import KnowledgeGraph
from ato.strategy import thin_slice_momentum_config


@pytest.fixture
def kg(tmp_path):
    return KnowledgeGraph(tmp_path / "ato.db", tmp_path / "knowledge")


@pytest.mark.asyncio
async def test_campaign_crud(kg: KnowledgeGraph) -> None:
    c = Campaign(
        id=new_id(),
        name=PHASE1_SEED["name"],
        goal_vector=PHASE1_SEED["goal_vector"],
        constraints=PHASE1_SEED["constraints"],
        asset_universe=list(PHASE1_SEED["asset_universe"]),
    )
    await kg.upsert_campaign(c)
    got = await kg.get_campaign(c.id)
    assert got is not None
    assert got.name == "phase1-seed"
    listed = await kg.list_campaigns()
    assert any(x.id == c.id for x in listed)


@pytest.mark.asyncio
async def test_experiment_dual_write(kg: KnowledgeGraph) -> None:
    cid, tid, eid = new_id(), new_id(), new_id()
    await kg.upsert_campaign(
        Campaign(
            id=cid,
            name="c",
            goal_vector=PHASE1_SEED["goal_vector"],
            constraints=PHASE1_SEED["constraints"],
            asset_universe=["OKLO"],
        )
    )
    await kg.upsert_thesis(
        Thesis(id=tid, campaign_id=cid, title="T", summary="edge")
    )
    exp = Experiment(
        id=eid,
        campaign_id=cid,
        thesis_id=tid,
        hypothesis="h",
        why_generated="w",
        strategy_config=thin_slice_momentum_config(),
    )
    await kg.upsert_experiment(exp)
    got = await kg.get_experiment(eid)
    assert got is not None
    md = kg.experiment_markdown_path(exp)
    assert md.exists()
    assert "Hypothesis" in md.read_text()
    thesis_md = kg.knowledge_root / tid / "THESIS.md"
    assert thesis_md.exists()


@pytest.mark.asyncio
async def test_list_human_gates_all(kg: KnowledgeGraph) -> None:
    c1, c2 = new_id(), new_id()
    for cid in (c1, c2):
        await kg.upsert_campaign(
            Campaign(
                id=cid,
                name=cid[:8],
                goal_vector=PHASE1_SEED["goal_vector"],
                constraints=PHASE1_SEED["constraints"],
                asset_universe=["OKLO"],
            )
        )
    g1 = HumanGate(id=new_id(), campaign_id=c1, reason="promote", payload={})
    g2 = HumanGate(
        id=new_id(),
        campaign_id=c2,
        reason="anomaly",
        payload={},
        status="approved",
        resolved_at=utc_now(),
    )
    await kg.upsert_human_gate(g1)
    await kg.upsert_human_gate(g2)
    pending = await kg.list_human_gates_all(status="pending")
    assert len(pending) == 1
    assert pending[0].id == g1.id
    all_gates = await kg.list_human_gates_all()
    assert len(all_gates) == 2
