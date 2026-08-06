from __future__ import annotations

import json
from dataclasses import dataclass

from ato.domain.types import Campaign, Experiment, ResearchBrief, StrategyConfig
from ato.engines.llm import LLMProvider
from ato.strategy import thin_slice_momentum_config


@dataclass
class DiscoveryOutput:
    path: str  # new_thesis | mutate
    title: str
    summary: str
    hypothesis: str
    why_generated: str
    mutation_delta: str
    strategy_config: StrategyConfig
    thesis_id: str | None = None  # set for mutate path by caller knowledge


class DiscoveryEngine:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    async def run(
        self,
        campaign: Campaign,
        brief: ResearchBrief,
        *,
        thesis_context: str = "",
        parent: Experiment | None = None,
    ) -> DiscoveryOutput:
        mode = "mutate" if parent else "new_thesis"
        raw = await self.llm.complete(
            system="You are the Discovery engine. Reply JSON only. discovery hypothesis mutate",
            user=(
                f"path={mode} campaign={campaign.name} brief={brief.summary} "
                f"thesis_ctx={thesis_context[:500]}"
            ),
        )
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}

        cfg = thin_slice_momentum_config()
        if parent is not None:
            # tiny mutation for mutate path
            blocks = parent.strategy_config.blocks
            ema = next(b for b in blocks if b.block_id == "ema_crossover")
            fast = int(ema.parameters.get("fast_period", 12)) + 1
            cfg = thin_slice_momentum_config(fast_period=fast)
            mutation = f"fast_period → {fast}"
            return DiscoveryOutput(
                path="mutate",
                title=data.get("title") or "mutated",
                summary=data.get("summary") or parent.hypothesis,
                hypothesis=str(data.get("hypothesis") or parent.hypothesis),
                why_generated=str(data.get("why_generated") or "mutation"),
                mutation_delta=mutation,
                strategy_config=cfg,
                thesis_id=parent.thesis_id,
            )

        return DiscoveryOutput(
            path="new_thesis",
            title=str(data.get("title") or "Thin-slice momentum"),
            summary=str(data.get("summary") or "EMA cross edge"),
            hypothesis=str(
                data.get("hypothesis")
                or "Fast/slow EMA cross captures trend on seed equities"
            ),
            why_generated=str(data.get("why_generated") or "from research brief"),
            mutation_delta="",
            strategy_config=cfg,
        )
