"""In-process ring buffer event bus for ops stream."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from ato.domain.types import utc_now

CLOSED_EVENT_TYPES = frozenset(
    {
        "campaign_state_changed",
        "research_started",
        "research_finished",
        "discovery_started",
        "discovery_finished",
        "thesis_created",
        "experiment_shell_created",
        "execution_started",
        "vectorized_finished",
        "jesse_submitted",
        "jesse_finished",
        "execution_finished",
        "evaluation_finished",
        "gate_opened",
        "gate_resolved",
        "cycle_decision",
        "error",
    }
)


@dataclass
class EngineEvent:
    type: str
    campaign_id: str
    payload: dict[str, Any] = field(default_factory=dict)
    ts: datetime = field(default_factory=utc_now)

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "ts": self.ts.isoformat(),
            "campaign_id": self.campaign_id,
            "payload": self.payload,
        }


class EventBus:
    def __init__(self, capacity: int = 300) -> None:
        self.capacity = capacity
        self._buffers: dict[str, deque[EngineEvent]] = defaultdict(
            lambda: deque(maxlen=capacity)
        )

    def emit(self, event: EngineEvent) -> None:
        if event.type not in CLOSED_EVENT_TYPES:
            # Producers should use closed types; buffer anyway for resilience.
            pass
        self._buffers[event.campaign_id].append(event)

    def list_events(
        self, campaign_id: str, *, since: str | None = None
    ) -> list[EngineEvent]:
        events = list(self._buffers.get(campaign_id, ()))
        if since:
            events = [e for e in events if e.ts.isoformat() > since]
        return events
