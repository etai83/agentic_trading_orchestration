"""Canonical phase1-seed campaign defaults."""

from __future__ import annotations

from ato.domain.types import CampaignConstraints, GoalVector

PHASE1_SEED = {
    "name": "phase1-seed",
    "asset_universe": ["OKLO", "IONQ", "NVDA"],
    "goal_vector": GoalVector(
        min_sharpe=0.5,
        min_win_rate=0.45,
        max_drawdown=0.25,
        min_trades=10,
    ),
    "constraints": CampaignConstraints(
        date_start="2024-01-01",
        date_end="2024-12-31",
        max_experiments=50,
        screen_top_k=2,
        screen_top_fraction=None,
    ),
}
