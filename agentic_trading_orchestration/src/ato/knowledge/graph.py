"""Async KnowledgeGraph façade: SQLite + Markdown dual-write."""

from __future__ import annotations

import asyncio
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from ato.domain.types import (
    BacktestResult,
    Campaign,
    CampaignConstraints,
    Experiment,
    GoalVector,
    HumanGate,
    ResearchBrief,
    StrategyConfig,
    Thesis,
    utc_now,
)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def _parse_dt(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value)


class KnowledgeGraph:
    """Single façade for Phase 1 metrics (SQLite) + causal Markdown."""

    def __init__(self, db_path: Path | str, knowledge_root: Path | str) -> None:
        self.db_path = Path(db_path)
        self.knowledge_root = Path(knowledge_root)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.knowledge_root.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS campaigns (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  goal_vector TEXT NOT NULL,
                  constraints TEXT NOT NULL,
                  asset_universe TEXT NOT NULL,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS theses (
                  id TEXT PRIMARY KEY,
                  campaign_id TEXT NOT NULL,
                  title TEXT NOT NULL,
                  summary TEXT NOT NULL,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
                );
                CREATE TABLE IF NOT EXISTS experiments (
                  id TEXT PRIMARY KEY,
                  campaign_id TEXT NOT NULL,
                  thesis_id TEXT NOT NULL,
                  parent_experiment_id TEXT,
                  hypothesis TEXT NOT NULL,
                  why_generated TEXT NOT NULL,
                  mutation_delta TEXT NOT NULL,
                  strategy_config TEXT NOT NULL,
                  results TEXT NOT NULL,
                  regime_tags TEXT NOT NULL,
                  regime_performance TEXT NOT NULL,
                  verdict TEXT,
                  next_action TEXT,
                  next_reasoning TEXT,
                  screen_metadata TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
                  FOREIGN KEY (thesis_id) REFERENCES theses(id)
                );
                CREATE TABLE IF NOT EXISTS research_briefs (
                  id TEXT PRIMARY KEY,
                  campaign_id TEXT NOT NULL,
                  payload TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS human_gates (
                  id TEXT PRIMARY KEY,
                  campaign_id TEXT NOT NULL,
                  reason TEXT NOT NULL,
                  payload TEXT NOT NULL,
                  status TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  resolved_at TEXT
                );
                """
            )

    async def upsert_campaign(self, campaign: Campaign) -> None:
        await asyncio.to_thread(self._upsert_campaign, campaign)

    def _upsert_campaign(self, campaign: Campaign) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO campaigns (
                  id, name, goal_vector, constraints, asset_universe, status, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name=excluded.name,
                  goal_vector=excluded.goal_vector,
                  constraints=excluded.constraints,
                  asset_universe=excluded.asset_universe,
                  status=excluded.status
                """,
                (
                    campaign.id,
                    campaign.name,
                    json.dumps(campaign.goal_vector.to_dict()),
                    json.dumps(campaign.constraints.to_dict()),
                    json.dumps(campaign.asset_universe),
                    campaign.status,
                    _iso(campaign.created_at),
                ),
            )

    async def get_campaign(self, campaign_id: str) -> Campaign | None:
        return await asyncio.to_thread(self._get_campaign, campaign_id)

    def _get_campaign(self, campaign_id: str) -> Campaign | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM campaigns WHERE id = ?", (campaign_id,)
            ).fetchone()
        if row is None:
            return None
        return Campaign(
            id=row["id"],
            name=row["name"],
            goal_vector=GoalVector.from_dict(json.loads(row["goal_vector"])),
            constraints=CampaignConstraints.from_dict(json.loads(row["constraints"])),
            asset_universe=list(json.loads(row["asset_universe"])),
            status=row["status"],
            created_at=_parse_dt(row["created_at"]) or utc_now(),
        )

    async def list_campaigns(self) -> list[Campaign]:
        return await asyncio.to_thread(self._list_campaigns)

    def _list_campaigns(self) -> list[Campaign]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id FROM campaigns ORDER BY created_at"
            ).fetchall()
        out: list[Campaign] = []
        for r in rows:
            c = self._get_campaign(r["id"])
            if c:
                out.append(c)
        return out

    async def upsert_thesis(self, thesis: Thesis) -> None:
        await asyncio.to_thread(self._upsert_thesis, thesis)

    def _upsert_thesis(self, thesis: Thesis) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO theses (id, campaign_id, title, summary, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  title=excluded.title,
                  summary=excluded.summary,
                  status=excluded.status
                """,
                (
                    thesis.id,
                    thesis.campaign_id,
                    thesis.title,
                    thesis.summary,
                    thesis.status,
                    _iso(thesis.created_at),
                ),
            )
        self._write_thesis_md(thesis)

    async def get_thesis(self, thesis_id: str) -> Thesis | None:
        return await asyncio.to_thread(self._get_thesis, thesis_id)

    def _get_thesis(self, thesis_id: str) -> Thesis | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM theses WHERE id = ?", (thesis_id,)
            ).fetchone()
        if row is None:
            return None
        return Thesis(
            id=row["id"],
            campaign_id=row["campaign_id"],
            title=row["title"],
            summary=row["summary"],
            status=row["status"],
            created_at=_parse_dt(row["created_at"]) or utc_now(),
        )

    async def list_theses(self, campaign_id: str) -> list[Thesis]:
        return await asyncio.to_thread(self._list_theses, campaign_id)

    def _list_theses(self, campaign_id: str) -> list[Thesis]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id FROM theses WHERE campaign_id = ? ORDER BY created_at",
                (campaign_id,),
            ).fetchall()
        return [t for r in rows if (t := self._get_thesis(r["id"])) is not None]

    def _results_to_json(self, results: dict[str, dict[str, BacktestResult]]) -> str:
        payload: dict[str, Any] = {}
        for asset, tiers in results.items():
            payload[asset] = {tier: bt.to_dict() for tier, bt in tiers.items()}
        return json.dumps(payload)

    def _results_from_json(self, raw: str) -> dict[str, dict[str, BacktestResult]]:
        data = json.loads(raw or "{}")
        out: dict[str, dict[str, BacktestResult]] = {}
        for asset, tiers in data.items():
            out[asset] = {
                tier: BacktestResult.from_dict(bt) for tier, bt in tiers.items()
            }
        return out

    async def upsert_experiment(self, experiment: Experiment) -> None:
        await asyncio.to_thread(self._upsert_experiment, experiment)

    def _upsert_experiment(self, experiment: Experiment) -> None:
        experiment.updated_at = utc_now()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO experiments (
                  id, campaign_id, thesis_id, parent_experiment_id,
                  hypothesis, why_generated, mutation_delta, strategy_config,
                  results, regime_tags, regime_performance, verdict, next_action,
                  next_reasoning, screen_metadata, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  parent_experiment_id=excluded.parent_experiment_id,
                  hypothesis=excluded.hypothesis,
                  why_generated=excluded.why_generated,
                  mutation_delta=excluded.mutation_delta,
                  strategy_config=excluded.strategy_config,
                  results=excluded.results,
                  regime_tags=excluded.regime_tags,
                  regime_performance=excluded.regime_performance,
                  verdict=excluded.verdict,
                  next_action=excluded.next_action,
                  next_reasoning=excluded.next_reasoning,
                  screen_metadata=excluded.screen_metadata,
                  updated_at=excluded.updated_at
                """,
                (
                    experiment.id,
                    experiment.campaign_id,
                    experiment.thesis_id,
                    experiment.parent_experiment_id,
                    experiment.hypothesis,
                    experiment.why_generated,
                    experiment.mutation_delta,
                    json.dumps(experiment.strategy_config.to_dict()),
                    self._results_to_json(experiment.results),
                    json.dumps(experiment.regime_tags),
                    json.dumps(experiment.regime_performance),
                    experiment.verdict,
                    experiment.next_action,
                    experiment.next_reasoning,
                    json.dumps(experiment.screen_metadata),
                    _iso(experiment.created_at),
                    _iso(experiment.updated_at),
                ),
            )
        self._write_experiment_md(experiment)
        thesis = self._get_thesis(experiment.thesis_id)
        if thesis:
            self._write_thesis_md(thesis)

    async def get_experiment(self, experiment_id: str) -> Experiment | None:
        return await asyncio.to_thread(self._get_experiment, experiment_id)

    def _get_experiment(self, experiment_id: str) -> Experiment | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM experiments WHERE id = ?", (experiment_id,)
            ).fetchone()
        if row is None:
            return None
        return Experiment(
            id=row["id"],
            campaign_id=row["campaign_id"],
            thesis_id=row["thesis_id"],
            parent_experiment_id=row["parent_experiment_id"],
            hypothesis=row["hypothesis"],
            why_generated=row["why_generated"],
            mutation_delta=row["mutation_delta"] or "",
            strategy_config=StrategyConfig.from_dict(json.loads(row["strategy_config"])),
            results=self._results_from_json(row["results"]),
            regime_tags=list(json.loads(row["regime_tags"] or "[]")),
            regime_performance=dict(json.loads(row["regime_performance"] or "{}")),
            verdict=row["verdict"],
            next_action=row["next_action"],
            next_reasoning=row["next_reasoning"],
            screen_metadata=dict(json.loads(row["screen_metadata"] or "{}")),
            created_at=_parse_dt(row["created_at"]) or utc_now(),
            updated_at=_parse_dt(row["updated_at"]) or utc_now(),
        )

    async def list_experiments(
        self, *, thesis_id: str | None = None, campaign_id: str | None = None
    ) -> list[Experiment]:
        return await asyncio.to_thread(self._list_experiments, thesis_id, campaign_id)

    def _list_experiments(
        self, thesis_id: str | None, campaign_id: str | None
    ) -> list[Experiment]:
        if thesis_id is None and campaign_id is None:
            raise ValueError("list_experiments requires thesis_id or campaign_id")
        q = "SELECT id FROM experiments WHERE 1=1"
        params: list[Any] = []
        if thesis_id:
            q += " AND thesis_id = ?"
            params.append(thesis_id)
        if campaign_id:
            q += " AND campaign_id = ?"
            params.append(campaign_id)
        q += " ORDER BY created_at"
        with self._connect() as conn:
            rows = conn.execute(q, params).fetchall()
        return [e for r in rows if (e := self._get_experiment(r["id"])) is not None]

    async def upsert_research_brief(self, brief: ResearchBrief) -> None:
        await asyncio.to_thread(self._upsert_research_brief, brief)

    def _upsert_research_brief(self, brief: ResearchBrief) -> None:
        from uuid import uuid4

        bid = brief.id or str(uuid4())
        brief.id = bid
        payload = {
            "id": bid,
            "campaign_id": brief.campaign_id,
            "summary": brief.summary,
            "candidate_assets": brief.candidate_assets,
            "observed_patterns": brief.observed_patterns,
            "suggested_thesis_directions": brief.suggested_thesis_directions,
            "created_at": _iso(brief.created_at),
        }
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO research_briefs (id, campaign_id, payload, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET payload=excluded.payload
                """,
                (bid, brief.campaign_id, json.dumps(payload), _iso(brief.created_at)),
            )

    async def get_latest_research_brief(self, campaign_id: str) -> ResearchBrief | None:
        return await asyncio.to_thread(self._get_latest_research_brief, campaign_id)

    def _get_latest_research_brief(self, campaign_id: str) -> ResearchBrief | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT payload FROM research_briefs
                WHERE campaign_id = ?
                ORDER BY created_at DESC LIMIT 1
                """,
                (campaign_id,),
            ).fetchone()
        if row is None:
            return None
        p = json.loads(row["payload"])
        return ResearchBrief(
            id=p.get("id"),
            campaign_id=p["campaign_id"],
            summary=p["summary"],
            candidate_assets=list(p.get("candidate_assets") or []),
            observed_patterns=list(p.get("observed_patterns") or []),
            suggested_thesis_directions=list(p.get("suggested_thesis_directions") or []),
            created_at=_parse_dt(p.get("created_at")) or utc_now(),
        )

    async def upsert_human_gate(self, gate: HumanGate) -> None:
        await asyncio.to_thread(self._upsert_human_gate, gate)

    def _upsert_human_gate(self, gate: HumanGate) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO human_gates
                  (id, campaign_id, reason, payload, status, created_at, resolved_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  reason=excluded.reason,
                  payload=excluded.payload,
                  status=excluded.status,
                  resolved_at=excluded.resolved_at
                """,
                (
                    gate.id,
                    gate.campaign_id,
                    gate.reason,
                    json.dumps(gate.payload),
                    gate.status,
                    _iso(gate.created_at),
                    _iso(gate.resolved_at),
                ),
            )

    async def get_human_gate(self, gate_id: str) -> HumanGate | None:
        return await asyncio.to_thread(self._get_human_gate, gate_id)

    def _get_human_gate(self, gate_id: str) -> HumanGate | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM human_gates WHERE id = ?", (gate_id,)
            ).fetchone()
        if row is None:
            return None
        return HumanGate(
            id=row["id"],
            campaign_id=row["campaign_id"],
            reason=row["reason"],
            payload=dict(json.loads(row["payload"] or "{}")),
            status=row["status"],
            created_at=_parse_dt(row["created_at"]) or utc_now(),
            resolved_at=_parse_dt(row["resolved_at"]),
        )

    async def list_human_gates(
        self, campaign_id: str, *, status: str | None = None
    ) -> list[HumanGate]:
        return await asyncio.to_thread(self._list_human_gates, campaign_id, status)

    def _list_human_gates(
        self, campaign_id: str, status: str | None
    ) -> list[HumanGate]:
        q = "SELECT id FROM human_gates WHERE campaign_id = ?"
        params: list[Any] = [campaign_id]
        if status:
            q += " AND status = ?"
            params.append(status)
        q += " ORDER BY created_at"
        with self._connect() as conn:
            rows = conn.execute(q, params).fetchall()
        return [g for r in rows if (g := self._get_human_gate(r["id"])) is not None]

    async def list_human_gates_all(self, *, status: str | None = None) -> list[HumanGate]:
        return await asyncio.to_thread(self._list_human_gates_all, status)

    def _list_human_gates_all(self, status: str | None) -> list[HumanGate]:
        q = "SELECT id FROM human_gates WHERE 1=1"
        params: list[Any] = []
        if status:
            q += " AND status = ?"
            params.append(status)
        q += " ORDER BY created_at"
        with self._connect() as conn:
            rows = conn.execute(q, params).fetchall()
        return [g for r in rows if (g := self._get_human_gate(r["id"])) is not None]

    def experiment_markdown_path(self, experiment: Experiment) -> Path:
        return self.knowledge_root / experiment.thesis_id / f"{experiment.id}.md"

    def _write_experiment_md(self, experiment: Experiment) -> None:
        path = self.experiment_markdown_path(experiment)
        path.parent.mkdir(parents=True, exist_ok=True)
        results_lines = []
        for asset, tiers in experiment.results.items():
            for tier, bt in tiers.items():
                results_lines.append(
                    f"- {asset} / {tier}: sharpe={bt.sharpe} wr={bt.win_rate} "
                    f"dd={bt.max_drawdown} trades={bt.n_trades}"
                )
        results_body = "\n".join(results_lines) if results_lines else "_empty_"
        mutation = experiment.mutation_delta or "root experiment"
        body = f"""# Experiment {experiment.id}

- experiment_id: {experiment.id}
- thesis_id: {experiment.thesis_id}
- campaign_id: {experiment.campaign_id}
- parent_experiment_id: {experiment.parent_experiment_id}
- created_at: {_iso(experiment.created_at)}
- verdict: {experiment.verdict}
- next_action: {experiment.next_action}

## Hypothesis

{experiment.hypothesis}

## Why generated

{experiment.why_generated}

## Mutation delta

{mutation}

## Strategy config

```json
{json.dumps(experiment.strategy_config.to_dict(), indent=2)}
```

## Results summary

{results_body}

## Regime notes

{json.dumps(experiment.regime_tags)}

## Next reasoning / causal analysis

{experiment.next_reasoning or ""}
"""
        path.write_text(body, encoding="utf-8")

    def _write_thesis_md(self, thesis: Thesis) -> None:
        path = self.knowledge_root / thesis.id / "THESIS.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, verdict FROM experiments WHERE thesis_id = ? ORDER BY created_at",
                (thesis.id,),
            ).fetchall()
        exp_lines = "\n".join(
            f"- {r['id']}: {r['verdict'] or 'pending'}" for r in rows
        ) or "_none_"
        body = f"""# {thesis.title}

- thesis_id: {thesis.id}
- campaign_id: {thesis.campaign_id}
- status: {thesis.status}
- summary: {thesis.summary}

## Experiments

{exp_lines}
"""
        path.write_text(body, encoding="utf-8")

    async def get_thesis_context(
        self, thesis_id: str, *, max_chars: int | None = None
    ) -> str:
        return await asyncio.to_thread(self._get_thesis_context, thesis_id, max_chars)

    def _get_thesis_context(self, thesis_id: str, max_chars: int | None) -> str:
        thesis = self._get_thesis(thesis_id)
        if thesis is None:
            return ""
        md_path = self.knowledge_root / thesis_id / "THESIS.md"
        parts: list[str] = []
        if md_path.exists():
            parts.append(md_path.read_text(encoding="utf-8"))
        else:
            parts.append(f"Thesis {thesis.title}: {thesis.summary} ({thesis.status})")
        for exp in self._list_experiments(thesis_id, None):
            metrics = ""
            if exp.results:
                first = next(iter(exp.results.values()))
                tier = first.get("jesse") or first.get("vectorized")
                if tier and tier.sharpe is not None:
                    metrics = f" sharpe={tier.sharpe}"
            parts.append(
                f"- exp {exp.id} parent={exp.parent_experiment_id} "
                f"verdict={exp.verdict} next={exp.next_action} "
                f"hyp={exp.hypothesis[:80]}{metrics}"
            )
        text = "\n".join(parts)
        if max_chars is not None and len(text) > max_chars:
            text = text[: max_chars - 3] + "..."
        return text

    async def get_campaign_context(
        self, campaign_id: str, *, max_chars: int | None = None
    ) -> str:
        return await asyncio.to_thread(self._get_campaign_context, campaign_id, max_chars)

    def _get_campaign_context(self, campaign_id: str, max_chars: int | None) -> str:
        campaign = self._get_campaign(campaign_id)
        if campaign is None:
            return ""
        lines = [
            f"Campaign {campaign.name} status={campaign.status}",
            f"goals={campaign.goal_vector.to_dict()}",
            f"constraints={campaign.constraints.to_dict()}",
            f"universe={campaign.asset_universe}",
        ]
        for t in self._list_theses(campaign_id):
            lines.append(f"Thesis {t.title} ({t.status}): {t.summary}")
        brief = self._get_latest_research_brief(campaign_id)
        if brief:
            lines.append(f"Latest research: {brief.summary}")
        text = "\n".join(lines)
        if max_chars is not None and len(text) > max_chars:
            text = text[: max_chars - 3] + "..."
        return text
