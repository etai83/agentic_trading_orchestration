"""ops-api mock mode route tests."""

import pytest
from httpx import ASGITransport, AsyncClient
from ops_api.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # trigger lifespan
        async with app.router.lifespan_context(app):
            yield ac


@pytest.mark.asyncio
async def test_list_campaigns_and_gates(client: AsyncClient) -> None:
    r = await client.get("/api/v1/campaigns")
    assert r.status_code == 200
    camps = r.json()
    assert len(camps) >= 1
    cid = camps[0]["id"]

    g = await client.get("/api/v1/gates", params={"status": "pending"})
    assert g.status_code == 200
    gates = g.json()
    assert len(gates) >= 1

    graph = await client.get(f"/api/v1/campaigns/{cid}/graph")
    assert graph.status_code == 200
    body = graph.json()
    assert "experiments" in body
    assert "theses" in body


@pytest.mark.asyncio
async def test_gate_resolve_idempotent_and_conflict(client: AsyncClient) -> None:
    gates = (await client.get("/api/v1/gates", params={"status": "pending"})).json()
    gid = gates[0]["id"]
    r = await client.post(f"/api/v1/gates/{gid}/resolve", json={"status": "approved"})
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    again = await client.post(f"/api/v1/gates/{gid}/resolve", json={"status": "approved"})
    assert again.status_code == 200

    conflict = await client.post(
        f"/api/v1/gates/{gid}/resolve", json={"status": "rejected"}
    )
    assert conflict.status_code == 409


@pytest.mark.asyncio
async def test_events_poll(client: AsyncClient) -> None:
    camps = (await client.get("/api/v1/campaigns")).json()
    cid = camps[0]["id"]
    r = await client.get(f"/api/v1/campaigns/{cid}/events")
    assert r.status_code == 200
    assert "events" in r.json()
    types = {e["type"] for e in r.json()["events"]}
    assert "gate_opened" in types
