"""Fixture DataProvider — yfinance-shaped OHLCV for CI."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Protocol

from ato.symbols import to_jesse_symbol


@dataclass
class CandleBar:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class DataProvider(Protocol):
    async def get_ohlcv(
        self, ticker: str, *, start: str | None = None, end: str | None = None
    ) -> list[CandleBar]: ...


class FixtureDataProvider:
    """Synthetic trending series per ticker — deterministic for tests."""

    def __init__(self, bars: int = 300, seed_price: float = 100.0) -> None:
        self.bars = bars
        self.seed_price = seed_price

    async def get_ohlcv(
        self, ticker: str, *, start: str | None = None, end: str | None = None
    ) -> list[CandleBar]:
        # identity mapping exercised for warm_up-friendly length
        _ = to_jesse_symbol(ticker)
        start_dt = datetime(2024, 1, 1)
        out: list[CandleBar] = []
        price = self.seed_price + (hash(ticker.upper()) % 50)
        for i in range(self.bars):
            # gentle uptrend with mild noise from ticker hash
            drift = 0.05 + (hash(ticker) % 7) * 0.01
            o = price
            c = price + drift
            h = max(o, c) + 0.2
            low = min(o, c) - 0.2
            out.append(
                CandleBar(
                    timestamp=start_dt + timedelta(minutes=i),
                    open=o,
                    high=h,
                    low=low,
                    close=c,
                    volume=1000.0 + i,
                )
            )
            price = c
        return out
