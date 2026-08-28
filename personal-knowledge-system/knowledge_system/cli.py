from __future__ import annotations

import argparse
import sys
from pathlib import Path

from knowledge_system.catalog import CatalogItem, ingest, items_of_group, items_of_kind
from knowledge_system.search import SearchHit, search


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="knowledge_system",
        description="Index notes, projects, and files, then search or list them.",
    )
    parser.add_argument("root", help="Directory to catalog")
    parser.add_argument("query", nargs="?", help="Search terms (omit with --list)")
    parser.add_argument("--list", action="store_true", help="List catalog items")
    parser.add_argument("--kind", choices=("note", "project", "file"), help="Filter by kind")
    parser.add_argument("--group", help="Filter by group (vault folder / topic / project name)")
    args = parser.parse_args(argv)

    root = Path(args.root)
    if not root.is_dir():
        print(f"error: not a directory: {root}", file=sys.stderr)
        return 2

    items = ingest(root)
    if args.kind:
        items = items_of_kind(items, args.kind)
    if args.group:
        items = items_of_group(items, args.group)

    if args.list or not args.query:
        if not args.list and not args.query:
            parser.error("a query is required unless --list is given")
        for item in items:
            _print_item(item)
        return 0

    for hit in search(items, args.query):
        _print_hit(hit)
    return 0


def _print_item(item: CatalogItem) -> None:
    print(f"{item.title}  [{item.kind}/{item.group}]")
    print(f"  {item.path}")


def _print_hit(hit: SearchHit) -> None:
    print(f"{hit.title}  [{hit.kind}/{hit.group}]")
    print(f"  {hit.path}")
    print(f"  {hit.snippet}")


if __name__ == "__main__":
    raise SystemExit(main())
