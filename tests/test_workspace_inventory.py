"""Tests for workspace project inventory discovery and plan completeness."""

from pathlib import Path

import pytest

from workspace_inventory import (
    check_completeness,
    check_workspace,
    discover_projects,
    parse_inventory_table,
)

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = WORKSPACE_ROOT / "docs" / "workspace-cleanup-plan.md"


def _write_git(dir_path: Path) -> None:
    (dir_path / ".git").mkdir()
    (dir_path / ".git" / "HEAD").write_text("ref: refs/heads/main\n")


def _plan_md(rows: list[tuple[str, str, str, str, str, str]]) -> str:
    lines = [
        "# plan",
        "",
        "| path | name | status | evidence | action | priority |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines) + "\n"


def test_discover_projects_finds_top_level_and_nested_git(tmp_path: Path) -> None:
    (tmp_path / "alpha").mkdir()
    (tmp_path / "alpha" / "readme.txt").write_text("a")
    nested = tmp_path / "alpha" / "nested-app"
    nested.mkdir()
    _write_git(nested)
    (tmp_path / "beta").mkdir()
    _write_git(tmp_path)

    found = discover_projects(tmp_path)

    assert "alpha" in found
    assert "beta" in found
    assert "alpha/nested-app" in found
    assert "." in found


def test_discover_projects_skips_dot_dirs_and_pruned_trees(tmp_path: Path) -> None:
    (tmp_path / ".hidden").mkdir()
    _write_git(tmp_path / ".hidden")
    vendor = tmp_path / "app" / "node_modules" / "pkg"
    vendor.mkdir(parents=True)
    _write_git(vendor)
    venv_pkg = tmp_path / "app" / ".venv" / "lib"
    venv_pkg.mkdir(parents=True)
    _write_git(venv_pkg)
    nested_dot = tmp_path / "app" / ".agent" / "skills" / "gstack"
    nested_dot.mkdir(parents=True)
    _write_git(nested_dot)
    (tmp_path / "app").mkdir(exist_ok=True)
    real = tmp_path / "app" / "real"
    real.mkdir()
    _write_git(real)

    found = discover_projects(tmp_path)

    assert "app" in found
    assert "app/real" in found
    assert ".hidden" not in found
    assert "app/node_modules/pkg" not in found
    assert "app/.venv/lib" not in found
    assert "app/.agent/skills/gstack" not in found


def test_discover_projects_skips_top_level_pycache(tmp_path: Path) -> None:
    (tmp_path / "__pycache__").mkdir()
    (tmp_path / "__pycache__" / "mod.pyc").write_bytes(b"\0")
    (tmp_path / "keep").mkdir()

    found = discover_projects(tmp_path)

    assert "keep" in found
    assert "__pycache__" not in found


def test_parse_inventory_table_reads_required_fields() -> None:
    md = _plan_md(
        [
            (".", "root", "unfinished", "scaffold", "leave", "P3"),
            ("Finance", "Finance", "active", "git 2026-08-27", "leave", "P3"),
        ]
    )

    rows = parse_inventory_table(md)

    assert rows[0]["path"] == "."
    assert rows[0]["status"] == "unfinished"
    assert rows[1]["name"] == "Finance"
    assert rows[1]["action"] == "leave"
    assert rows[1]["priority"] == "P3"
    assert rows[1]["evidence"] == "git 2026-08-27"


def test_check_completeness_fails_when_live_path_missing_from_plan() -> None:
    rows = parse_inventory_table(
        _plan_md([("keep", "keep", "active", "ok", "leave", "P3")])
    )

    errors = check_completeness(["keep", "orphan"], rows)

    assert any("orphan" in e and "missing from plan" in e for e in errors)


def test_check_completeness_fails_when_required_field_empty() -> None:
    rows = [
        {
            "path": "keep",
            "name": "keep",
            "status": "active",
            "evidence": "",
            "action": "leave",
            "priority": "P3",
        }
    ]

    errors = check_completeness(["keep"], rows)

    assert any("evidence" in e for e in errors)


def test_check_workspace_passes_when_plan_matches_live_tree(tmp_path: Path) -> None:
    (tmp_path / "keep").mkdir()
    md = _plan_md([("keep", "keep", "active", "dir present", "leave", "P3")])

    errors = check_workspace(tmp_path, md)

    assert errors == []


def test_live_workspace_plan_covers_every_project() -> None:
    plan_text = PLAN_PATH.read_text(encoding="utf-8")
    errors = check_workspace(WORKSPACE_ROOT, plan_text)
    assert PLAN_PATH.is_file()
    assert errors == []
