from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from knowledge_system.catalog import CatalogItem

_SNIPPET_RADIUS = 80


@dataclass(frozen=True)
class SearchHit:
    title: str
    kind: str
    path: Path
    snippet: str
    group: str = ""


def search(items: list[CatalogItem], query: str) -> list[SearchHit]:
    needle = (query or "").strip()
    if not needle:
        return []
    needle_cf = needle.casefold()
    hits: list[SearchHit] = []
    for item in items:
        in_title = needle_cf in item.title.casefold()
        in_body = needle_cf in item.text.casefold()
        if not in_title and not in_body:
            continue
        source = item.text if in_body else item.title
        hits.append(
            SearchHit(
                title=item.title,
                kind=item.kind,
                path=item.path,
                snippet=_snippet(source, needle),
                group=item.group,
            )
        )
    return hits


def _snippet(text: str, query: str, radius: int = _SNIPPET_RADIUS) -> str:
    lower = text.casefold()
    needle = query.casefold()
    index = lower.find(needle)
    if index < 0:
        compact = " ".join(text.split())
        return compact[: radius * 2]
    start = max(0, index - radius)
    end = min(len(text), index + len(query) + radius)
    fragment = " ".join(text[start:end].split())
    if start > 0:
        fragment = "..." + fragment
    if end < len(text):
        fragment = fragment + "..."
    return fragment
