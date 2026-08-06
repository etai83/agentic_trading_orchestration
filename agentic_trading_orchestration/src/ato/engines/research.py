from __future__ import annotations

import json

from ato.domain.types import Campaign, ResearchBrief, new_id, utc_now
from ato.engines.llm import LLMProvider


class ResearchEngine:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    async def run(
        self, campaign: Campaign, *, context: str = ""
    ) -> ResearchBrief:
        raw = await self.llm.complete(
            system="You are the Research engine. Reply JSON only.",
            user=(
                f"research campaign={campaign.name} "
                f"universe={campaign.asset_universe} context={context}"
            ),
        )
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}
        assets = list(data.get("candidate_assets") or []) or list(campaign.asset_universe)
        return ResearchBrief(
            id=new_id(),
            campaign_id=campaign.id,
            summary=str(data.get("summary") or "Research complete"),
            candidate_assets=assets,
            observed_patterns=list(data.get("observed_patterns") or []),
            suggested_thesis_directions=list(
                data.get("suggested_thesis_directions") or []
            ),
            created_at=utc_now(),
        )
