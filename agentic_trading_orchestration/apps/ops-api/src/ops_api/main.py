"""ATO ops-api — mock/live KnowledgeGraph façade + SSE events."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, Header, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from ato.domain.types import utc_now
from ato.knowledge import KnowledgeGraph
from ato.orchestrator.events import EngineEvent, EventBus
from ops_api.mock_store import MockKnowledgeGraph
from ops_api.serializers import (
    campaign_dto,
    experiment_dto,
    gate_dto,
    summary_sharpe,
    thesis_dto,
)
from ops_api.settings import Settings, get_settings

Store = KnowledgeGraph | MockKnowledgeGraph


class AppState:
    settings: Settings
    store: Store
    events: EventBus


state = AppState()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    events = EventBus()
    if settings.data_mode == "live":
        if not settings.db_path or not settings.knowledge_root:
            raise RuntimeError("OPS_DB_PATH and OPS_KNOWLEDGE_ROOT required for live mode")
        store: Store = KnowledgeGraph(settings.db_path, settings.knowledge_root)
    else:
        store = MockKnowledgeGraph(events=events)
        events = store.events  # type: ignore[attr-defined]
    state.settings = settings
    state.store = store
    state.events = events
    yield


app = FastAPI(title="ATO ops-api", version="0.1.0", lifespan=lifespan)


def err(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
    )


def check_token(x_ato_ops_token: str | None) -> JSONResponse | None:
    required = state.settings.ops_token
    if not required:
        return None
    if x_ato_ops_token != required:
        return err("unauthorized", "invalid or missing ops token", 401)
    return None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": state.settings.data_mode}


@app.get("/api/v1/campaigns")
async def list_campaigns() -> list[dict[str, Any]]:
    camps = await state.store.list_campaigns()
    return [campaign_dto(c) for c in camps]


@app.get("/api/v1/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str) -> Any:
    c = await state.store.get_campaign(campaign_id)
    if c is None:
        return err("not_found", "campaign not found", 404)
    return campaign_dto(c)


@app.get("/api/v1/campaigns/{campaign_id}/theses")
async def list_theses(campaign_id: str) -> Any:
    if await state.store.get_campaign(campaign_id) is None:
        return err("not_found", "campaign not found", 404)
    theses = await state.store.list_theses(campaign_id)
    return [thesis_dto(t) for t in theses]


@app.get("/api/v1/campaigns/{campaign_id}/experiments")
async def list_experiments(campaign_id: str) -> Any:
    if await state.store.get_campaign(campaign_id) is None:
        return err("not_found", "campaign not found", 404)
    exps = await state.store.list_experiments(campaign_id=campaign_id)
    return [experiment_dto(e, detail=False) for e in exps]


@app.get("/api/v1/campaigns/{campaign_id}/graph")
async def campaign_graph(campaign_id: str) -> Any:
    if await state.store.get_campaign(campaign_id) is None:
        return err("not_found", "campaign not found", 404)
    theses = await state.store.list_theses(campaign_id)
    exps = await state.store.list_experiments(campaign_id=campaign_id)
    gates = await state.store.list_human_gates(campaign_id, status="pending")
    pending_exp_ids = []
    for g in gates:
        eid = (g.payload or {}).get("experiment_id")
        if eid:
            pending_exp_ids.append(eid)
    return {
        "campaign_id": campaign_id,
        "theses": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
            }
            for t in theses
        ],
        "experiments": [
            {
                "id": e.id,
                "thesis_id": e.thesis_id,
                "parent_experiment_id": e.parent_experiment_id,
                "title_or_hypothesis": e.hypothesis,
                "verdict": e.verdict,
                "next_action": e.next_action,
                "created_at": e.created_at.isoformat(),
                "summary_metrics": {"sharpe": summary_sharpe(e)},
            }
            for e in exps
        ],
        "pending_gate_experiment_ids": pending_exp_ids,
    }


@app.get("/api/v1/experiments/{experiment_id}")
async def get_experiment(experiment_id: str) -> Any:
    e = await state.store.get_experiment(experiment_id)
    if e is None:
        return err("not_found", "experiment not found", 404)
    return experiment_dto(e, detail=True)


@app.get("/api/v1/experiments/{experiment_id}/markdown-path")
async def experiment_markdown_path(experiment_id: str) -> Any:
    e = await state.store.get_experiment(experiment_id)
    if e is None:
        return err("not_found", "experiment not found", 404)
    if hasattr(state.store, "experiment_markdown_path"):
        path = str(state.store.experiment_markdown_path(e))  # type: ignore[arg-type]
    else:
        path = f"{getattr(state.store, 'knowledge_root', '')}/{e.thesis_id}/{e.id}.md"
    return {
        "experiment_id": e.id,
        "thesis_id": e.thesis_id,
        "path": path,
    }


@app.get("/api/v1/campaigns/{campaign_id}/gates")
async def campaign_gates(
    campaign_id: str, status: str | None = Query(default=None)
) -> Any:
    if await state.store.get_campaign(campaign_id) is None:
        return err("not_found", "campaign not found", 404)
    gates = await state.store.list_human_gates(campaign_id, status=status)
    return [gate_dto(g) for g in gates]


@app.get("/api/v1/gates")
async def all_gates(status: str | None = Query(default=None)) -> list[dict[str, Any]]:
    gates = await state.store.list_human_gates_all(status=status)
    return [gate_dto(g) for g in gates]


@app.get("/api/v1/gates/{gate_id}")
async def get_gate(gate_id: str) -> Any:
    g = await state.store.get_human_gate(gate_id)
    if g is None:
        return err("not_found", "gate not found", 404)
    return gate_dto(g)


class ResolveBody(BaseModel):
    status: Literal["approved", "rejected"]


@app.post("/api/v1/gates/{gate_id}/resolve")
async def resolve_gate(
    gate_id: str,
    body: ResolveBody,
    x_ato_ops_token: str | None = Header(default=None, alias="X-ATO-Ops-Token"),
) -> Any:
    bad = check_token(x_ato_ops_token)
    if bad is not None:
        return bad
    gate = await state.store.get_human_gate(gate_id)
    if gate is None:
        return err("not_found", "gate not found", 404)
    if gate.status != "pending":
        if gate.status == body.status:
            return gate_dto(gate)  # idempotent
        return err("conflict", f"gate already {gate.status}", 409)
    gate.status = body.status  # type: ignore[assignment]
    gate.resolved_at = utc_now()
    await state.store.upsert_human_gate(gate)
    state.events.emit(
        EngineEvent(
            type="gate_resolved",
            campaign_id=gate.campaign_id,
            payload={
                "gate_id": gate.id,
                "status": gate.status,
                "experiment_id": (gate.payload or {}).get("experiment_id"),
            },
        )
    )
    return gate_dto(gate)


@app.get("/api/v1/campaigns/{campaign_id}/events")
async def poll_events(
    campaign_id: str, since: str | None = Query(default=None)
) -> dict[str, Any]:
    events = state.events.list_events(campaign_id, since=since)
    return {"events": [e.to_dict() for e in events]}


@app.get("/api/v1/campaigns/{campaign_id}/events/stream")
async def stream_events(campaign_id: str, request: Request) -> StreamingResponse:
    async def gen():
        # replay buffer then idle heartbeat
        for e in state.events.list_events(campaign_id):
            yield f"data: {json.dumps(e.to_dict())}\n\n"
        last_len = len(state.events.list_events(campaign_id))
        while True:
            if await request.is_disconnected():
                break
            await asyncio.sleep(0.5)
            cur = state.events.list_events(campaign_id)
            if len(cur) > last_len:
                for e in cur[last_len:]:
                    yield f"data: {json.dumps(e.to_dict())}\n\n"
                last_len = len(cur)
            else:
                yield ": keepalive\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
