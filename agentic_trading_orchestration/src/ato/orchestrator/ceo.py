"""CEO orchestrator — one faked full cycle with human gates."""

from __future__ import annotations

from ato.domain.types import (
    Campaign,
    Decision,
    Experiment,
    HumanGate,
    Thesis,
    new_id,
    utc_now,
)
from ato.engines.discovery import DiscoveryEngine
from ato.engines.evaluation import EvaluationEngine
from ato.engines.research import ResearchEngine
from ato.execution.funnel import ExecutionEngine
from ato.knowledge.graph import KnowledgeGraph
from ato.orchestrator.events import EngineEvent, EventBus


class CEOOrchestrator:
    def __init__(
        self,
        store: KnowledgeGraph,
        research: ResearchEngine,
        discovery: DiscoveryEngine,
        execution: ExecutionEngine,
        evaluation: EvaluationEngine,
        events: EventBus | None = None,
    ) -> None:
        self.store = store
        self.research = research
        self.discovery = discovery
        self.execution = execution
        self.evaluation = evaluation
        self.events = events or EventBus()
        self._consecutive_bad = 0

    def _emit(self, campaign_id: str, type_: str, **payload: object) -> None:
        self.events.emit(
            EngineEvent(type=type_, campaign_id=campaign_id, payload=dict(payload))
        )

    async def _set_status(self, campaign: Campaign, status: str) -> None:
        prev = campaign.status
        campaign.status = status  # type: ignore[assignment]
        await self.store.upsert_campaign(campaign)
        self._emit(
            campaign.id,
            "campaign_state_changed",
            **{"from": prev, "to": status},
        )

    def decide_next(self, experiment: Experiment) -> Decision:
        action = experiment.next_action or "await_human"
        # Force human attention on first CI cycle for gate path demonstration
        if action in ("mutate", "new_thesis") and experiment.verdict == "promising_mutable":
            return Decision(
                action="await_human",
                reasoning="Phase1 policy: surface promising_mutable for human review",
                override=True,
            )
        return Decision(action=action, reasoning="follow evaluation", override=False)

    async def run_one_cycle(self, campaign: Campaign) -> Experiment:
        """Research → Discovery → Execution → Evaluation → decide (+ optional gate)."""
        await self.store.upsert_campaign(campaign)

        await self._set_status(campaign, "researching")
        self._emit(campaign.id, "research_started")
        ctx = await self.store.get_campaign_context(campaign.id)
        brief = await self.research.run(campaign, context=ctx)
        await self.store.upsert_research_brief(brief)
        self._emit(campaign.id, "research_finished", message=brief.summary[:120])

        await self._set_status(campaign, "discovering")
        self._emit(campaign.id, "discovery_started")
        disc = await self.discovery.run(campaign, brief)
        thesis = Thesis(
            id=new_id(),
            campaign_id=campaign.id,
            title=disc.title,
            summary=disc.summary,
        )
        await self.store.upsert_thesis(thesis)
        self._emit(
            campaign.id,
            "thesis_created",
            thesis_id=thesis.id,
            message=thesis.title,
        )
        self._emit(
            campaign.id,
            "discovery_finished",
            thesis_id=thesis.id,
            message="config ready",
        )

        experiment = Experiment(
            id=new_id(),
            campaign_id=campaign.id,
            thesis_id=thesis.id,
            hypothesis=disc.hypothesis,
            why_generated=disc.why_generated,
            mutation_delta=disc.mutation_delta,
            strategy_config=disc.strategy_config,
        )
        await self.store.upsert_experiment(experiment)
        self._emit(
            campaign.id,
            "experiment_shell_created",
            experiment_id=experiment.id,
            thesis_id=thesis.id,
        )

        await self._set_status(campaign, "executing")
        self._emit(
            campaign.id, "execution_started", experiment_id=experiment.id
        )
        results, meta = await self.execution.run(
            experiment.strategy_config,
            list(campaign.asset_universe),
            campaign.constraints,
        )
        experiment.results = results
        experiment.screen_metadata = meta
        await self.store.upsert_experiment(experiment)
        self._emit(
            campaign.id,
            "vectorized_finished",
            experiment_id=experiment.id,
            survivor_assets=meta.get("survivors", []),
        )
        self._emit(
            campaign.id,
            "jesse_submitted",
            experiment_id=experiment.id,
            assets=meta.get("survivors", []),
        )
        for asset, tiers in results.items():
            if "jesse" in tiers:
                bt = tiers["jesse"]
                self._emit(
                    campaign.id,
                    "jesse_finished",
                    experiment_id=experiment.id,
                    asset=asset,
                    ok=bt.error is None,
                    sharpe=bt.sharpe,
                )
        self._emit(
            campaign.id,
            "execution_finished",
            experiment_id=experiment.id,
            message="funnel complete",
        )

        await self._set_status(campaign, "evaluating")
        tctx = await self.store.get_thesis_context(thesis.id)
        experiment = await self.evaluation.run(
            experiment, campaign.goal_vector, context=tctx
        )
        await self.store.upsert_experiment(experiment)
        self._emit(
            campaign.id,
            "evaluation_finished",
            experiment_id=experiment.id,
            verdict=experiment.verdict,
            next_action=experiment.next_action,
        )

        if experiment.verdict in ("incomplete",) or experiment.verdict is None:
            self._consecutive_bad += 1
        else:
            self._consecutive_bad = 0

        await self._set_status(campaign, "deciding")
        decision = self.decide_next(experiment)
        self._emit(
            campaign.id,
            "cycle_decision",
            experiment_id=experiment.id,
            decision=decision.action,
            message=decision.reasoning,
        )

        needs_gate = decision.action in (
            "promote",
            "await_human",
            "abort",
        ) or self._consecutive_bad >= 3

        if needs_gate:
            reason = {
                "promote": "promote",
                "await_human": "await_human",
                "abort": "abort_confirm",
            }.get(decision.action, "anomaly")
            if self._consecutive_bad >= 3:
                reason = "anomaly"
            gate = HumanGate(
                id=new_id(),
                campaign_id=campaign.id,
                reason=reason,  # type: ignore[arg-type]
                payload={
                    "experiment_id": experiment.id,
                    "decision": decision.action,
                    "summary": decision.reasoning or experiment.next_reasoning or "",
                },
                status="pending",
                created_at=utc_now(),
            )
            await self.store.upsert_human_gate(gate)
            await self._set_status(campaign, "awaiting_human")
            self._emit(
                campaign.id,
                "gate_opened",
                gate_id=gate.id,
                experiment_id=experiment.id,
                reason=reason,
            )
        else:
            # auto-continue would loop; single cycle ends idle-ish
            await self._set_status(campaign, "idle")

        return experiment

    async def resume_after_gate(self, campaign: Campaign, gate: HumanGate) -> Campaign:
        """Apply resume policy after store gate leaves pending."""
        if gate.status == "pending":
            return campaign
        if gate.status == "approved":
            if gate.reason in ("promote", "abort_confirm", "budget_exhausted"):
                await self._set_status(campaign, "completed")
            else:
                await self._set_status(campaign, "discovering")
        else:  # rejected
            if gate.reason in ("anomaly", "await_human", "budget_exhausted"):
                await self._set_status(campaign, "completed")
            else:
                await self._set_status(campaign, "discovering")
        self._emit(
            campaign.id,
            "gate_resolved",
            gate_id=gate.id,
            status=gate.status,
            experiment_id=(gate.payload or {}).get("experiment_id"),
        )
        return campaign
