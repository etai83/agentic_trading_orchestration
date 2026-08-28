"""Discover workspace projects and check them against the cleanup-plan inventory table."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

PRUNE_DIR_NAMES = frozenset(
    {"node_modules", ".venv", "venv", "target", ".git", "__pycache__"}
)
STATUSES = frozenset({"active", "abandoned", "duplicated", "unfinished", "mixed"})
ACTIONS = frozenset({"leave", "archive", "dedupe-later", "finish-later", "obvious-safe-done"})
PRIORITIES = frozenset({"P0", "P1", "P2", "P3"})
REQUIRED_FIELDS = ("path", "name", "status", "evidence", "action", "priority")
HEADER = ("path", "name", "status", "evidence", "action", "priority")

PLAN_RELATIVE_PATH = Path("docs") / "workspace-cleanup-plan.md"


def _is_dir(path: Path) -> bool:
    try:
        return path.is_dir()
    except OSError:
        return False


def discover_projects(root: Path | str) -> list[str]:
    """Return relative posix project paths under root.

    A project is a top-level non-dot directory, plus any nested directory that
    has its own ``.git`` (file or directory). Dot-directories are not projects.
    Trees named node_modules, .venv, venv, target, or .git are skipped.
    The root itself is included as ``.`` when it contains ``.git``.
    """
    root = Path(root).resolve()
    found: set[str] = set()

    if (root / ".git").exists():
        found.add(".")

    try:
        children = list(root.iterdir())
    except OSError:
        children = []
    for child in children:
        if not _is_dir(child):
            continue
        if child.name.startswith(".") or child.name in PRUNE_DIR_NAMES:
            continue
        found.add(child.name)

    for dirpath, dirnames, _filenames in os.walk(root, followlinks=False):
        dirnames[:] = [
            name
            for name in dirnames
            if name not in PRUNE_DIR_NAMES and not name.startswith(".")
        ]
        current = Path(dirpath)
        if not (current / ".git").exists():
            continue
        if current == root:
            found.add(".")
            continue
        try:
            rel = current.relative_to(root)
        except ValueError:
            continue
        if any(part.startswith(".") or part in PRUNE_DIR_NAMES for part in rel.parts):
            continue
        found.add(rel.as_posix())

    return sorted(found, key=lambda item: (item != ".", item.lower()))


def _split_row(line: str) -> list[str]:
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]
    return [cell.strip() for cell in stripped.split("|")]


def _is_separator(cols: list[str]) -> bool:
    if not cols:
        return False
    return all(re.fullmatch(r":?-{3,}:?", col.replace(" ", "")) is not None for col in cols)


def parse_inventory_table(markdown: str) -> list[dict[str, str]]:
    """Parse the first markdown table with the inventory header columns."""
    lines = markdown.splitlines()
    header_at: int | None = None
    for index, line in enumerate(lines):
        if "|" not in line:
            continue
        cols = [col.strip().strip("`").lower() for col in _split_row(line)]
        if tuple(cols) == HEADER:
            header_at = index
            break
    if header_at is None:
        raise ValueError(
            "inventory table with columns path, name, status, evidence, action, priority not found"
        )

    rows: list[dict[str, str]] = []
    for line in lines[header_at + 1 :]:
        if "|" not in line:
            break
        cols = _split_row(line)
        if _is_separator(cols):
            continue
        if len(cols) != len(HEADER):
            raise ValueError(f"inventory row has {len(cols)} columns, expected 6: {line!r}")
        row = {
            "path": cols[0].strip("`"),
            "name": cols[1],
            "status": cols[2],
            "evidence": cols[3],
            "action": cols[4],
            "priority": cols[5],
        }
        rows.append(row)
    return rows


def check_completeness(
    project_paths: list[str],
    rows: list[dict[str, str]],
) -> list[str]:
    """Return error strings if the plan does not cover the live project list."""
    errors: list[str] = []
    by_path: dict[str, dict[str, str]] = {}
    for index, row in enumerate(rows):
        for field in REQUIRED_FIELDS:
            value = (row.get(field) or "").strip()
            if not value:
                errors.append(f"row {index} path={row.get('path')!r} missing {field}")
        path = (row.get("path") or "").strip()
        if not path:
            continue
        if path in by_path:
            errors.append(f"duplicate plan path: {path}")
        by_path[path] = row
        status = (row.get("status") or "").strip()
        if status and status not in STATUSES:
            errors.append(f"{path}: invalid status {status!r}")
        action = (row.get("action") or "").strip()
        if action and action not in ACTIONS:
            errors.append(f"{path}: invalid action {action!r}")
        priority = (row.get("priority") or "").strip()
        if priority and priority not in PRIORITIES:
            errors.append(f"{path}: invalid priority {priority!r}")

    live = set(project_paths)
    planned = set(by_path)
    for path in sorted(live - planned):
        errors.append(f"live project missing from plan: {path}")
    for path in sorted(planned - live):
        errors.append(f"plan path not a current project: {path}")
    return errors


def check_workspace(root: Path | str, plan_text: str) -> list[str]:
    """Discover projects under root and check them against plan markdown."""
    return check_completeness(discover_projects(root), parse_inventory_table(plan_text))


def main(argv: list[str] | None = None) -> int:
    del argv
    root = Path(__file__).resolve().parent
    plan_path = root / PLAN_RELATIVE_PATH
    plan_text = plan_path.read_text(encoding="utf-8")
    projects = discover_projects(root)
    errors = check_completeness(projects, parse_inventory_table(plan_text))
    if errors:
        print("FAIL inventory completeness")
        for error in errors:
            print(error)
        return 1
    print(f"PASS inventory completeness: {len(projects)} projects")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
