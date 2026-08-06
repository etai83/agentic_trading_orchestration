from __future__ import annotations

import json

from ato.domain.goal_scoring import score_against_goals
from ato.domain.types import (
    VALID_NEXT_ACTIONS,
    VALID_VERDICTS,
    Experiment,
    GoalVector,
)
from ato.engines.llm import LLMProvider


class EvaluationEngine:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    async def run(
        self,
        experiment: Experiment,
        goal_vector: GoalVector,
        *,
        context: str = "",
    ) -> Experiment:
        score = score_against_goals(experiment.results, goal_vector)

        raw = await self.llm.complete(
            system="You are the Evaluation engine. causal verdict JSON only.",
            user=(
                f"evaluation score={score.to_dict()} hyp={experiment.hypothesis} "
                f"context={context[:400]}"
            ),
        )
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}

        if score.incomplete:
            verdict = "incomplete"
            next_action = "re_research"
        elif score.meets_goals:
            verdict = "meets_goals"
            next_action = "promote"
        else:
            verdict = str(data.get("verdict") or "promising_mutable")
            next_action = str(data.get("next_action") or "mutate")

        if verdict not in VALID_VERDICTS:
            verdict = "incomplete"
        if next_action not in VALID_NEXT_ACTIONS:
            next_action = "await_human"

        # legal combo guard: meets_goals → promote preferred
        if score.meets_goals:
            verdict = "meets_goals"
            next_action = "promote"

        experiment.regime_tags = list(data.get("regime_tags") or ["unlabeled"])
        experiment.regime_performance = {"score": score.to_dict()}
        experiment.verdict = verdict  # type: ignore[assignment]
        experiment.next_action = next_action  # type: ignore[assignment]
        experiment.next_reasoning = str(
            data.get("next_reasoning")
            or f"score meets_goals={score.meets_goals} incomplete={score.incomplete}"
        )
        return experiment
