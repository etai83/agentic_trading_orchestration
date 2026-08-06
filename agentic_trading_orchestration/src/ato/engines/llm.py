"""LLM provider abstraction + deterministic fake for CI."""

from __future__ import annotations

import json
from typing import Protocol


class LLMProvider(Protocol):
    async def complete(self, *, system: str, user: str) -> str: ...


class FakeLLMProvider:
    """Returns deterministic structured JSON based on prompt tags."""

    async def complete(self, *, system: str, user: str) -> str:
        text = (system + "\n" + user).lower()
        if "research" in text:
            return json.dumps(
                {
                    "summary": "Synthetic research brief for CI",
                    "candidate_assets": [],
                    "observed_patterns": ["momentum", "mean-reversion candidates"],
                    "suggested_thesis_directions": ["EMA cross with ATR risk"],
                }
            )
        if "discovery" in text or "hypothesis" in text or "mutate" in text:
            return json.dumps(
                {
                    "title": "Thin-slice momentum",
                    "summary": "Long-only EMA crossover with ATR stop",
                    "hypothesis": "Fast/slow EMA cross captures trend on equities seed",
                    "why_generated": "FakeLLM discovery for phase1-seed",
                    "mutation_delta": "",
                    "path": "new_thesis",
                }
            )
        if "evaluation" in text or "causal" in text or "verdict" in text:
            # Orchestrator/Evaluation will override with score-based defaults when needed
            return json.dumps(
                {
                    "verdict": "promising_mutable",
                    "next_action": "await_human",
                    "next_reasoning": "Synthetic causal analysis for CI",
                    "regime_tags": ["trending"],
                }
            )
        return json.dumps({"message": "ok"})
