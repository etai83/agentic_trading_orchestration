"""Candle / symbol helpers (equities as {TICKER}-USD identity mapping)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SymbolIdentity:
    bare_ticker: str
    jesse_symbol: str
    exchange: str = "venue"


def to_jesse_symbol(ticker: str, *, exchange: str = "venue") -> SymbolIdentity:
    bare = ticker.upper().removesuffix("-USD")
    return SymbolIdentity(
        bare_ticker=bare,
        jesse_symbol=f"{bare}-USD",
        exchange=exchange,
    )


def bare_from_jesse(symbol: str) -> str:
    return symbol.upper().removesuffix("-USD")
