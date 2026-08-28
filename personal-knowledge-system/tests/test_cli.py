import subprocess
import sys
from pathlib import Path

from knowledge_system.cli import main

from test_knowledge_system import NOTE_TOKEN, PROJECT_TOKEN, _corpus

_PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_cli_indexes_then_prints_path_and_snippet(tmp_path, capsys):
    root = _corpus(tmp_path)
    rc = main([str(root), NOTE_TOKEN])
    assert rc == 0
    out = capsys.readouterr().out
    assert "UniqueNote.md" in out
    assert NOTE_TOKEN in out
    assert "note" in out


def test_cli_search_project_token(tmp_path, capsys):
    root = _corpus(tmp_path)
    rc = main([str(root), PROJECT_TOKEN])
    assert rc == 0
    out = capsys.readouterr().out
    assert "README.md" in out
    assert PROJECT_TOKEN in out
    assert "alpha-project" in out


def test_cli_list_filters_by_kind(tmp_path, capsys):
    root = _corpus(tmp_path)
    rc = main([str(root), "--list", "--kind", "project"])
    assert rc == 0
    out = capsys.readouterr().out
    assert "README.md" in out
    assert "UniqueNote.md" not in out
    assert "loose-notes.txt" not in out


def test_cli_nonsense_query_prints_nothing(tmp_path, capsys):
    root = _corpus(tmp_path)
    rc = main([str(root), "ZZZNOMATCH999"])
    assert rc == 0
    assert capsys.readouterr().out.strip() == ""


def test_module_entry_point_indexes_then_searches(tmp_path):
    root = _corpus(tmp_path)
    proc = subprocess.run(
        [sys.executable, "-m", "knowledge_system", str(root), NOTE_TOKEN],
        cwd=_PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    assert "UniqueNote.md" in proc.stdout
    assert NOTE_TOKEN in proc.stdout
