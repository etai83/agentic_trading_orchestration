from pathlib import Path

from knowledge_system.catalog import ingest, items_of_group, items_of_kind
from knowledge_system.search import search


NOTE_TOKEN = "NOTEZXQ91"
PROJECT_TOKEN = "PROJYKW27"
FILE_TOKEN = "FILEQRM53"
VENDOR_TOKEN = "VENDORIGNORED"


def _corpus(tmp_path: Path) -> Path:
    vault = tmp_path / "second_brain" / "15 Wiki" / "topics"
    vault.mkdir(parents=True)
    (vault / "UniqueNote.md").write_text(
        "# Unique Note\n\nA vault topic that mentions " + NOTE_TOKEN + ".\n",
        encoding="utf-8",
    )

    project = tmp_path / "alpha-project"
    project.mkdir()
    (project / "README.md").write_text(
        "# Alpha Project\n\nProject docs containing " + PROJECT_TOKEN + ".\n",
        encoding="utf-8",
    )

    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "loose-notes.txt").write_text(
        "A loose file mentioning " + FILE_TOKEN + ".\n",
        encoding="utf-8",
    )

    vendor = tmp_path / "node_modules"
    vendor.mkdir()
    (vendor / "ignored.md").write_text(
        "Vendor junk " + VENDOR_TOKEN + " must not be cataloged.\n",
        encoding="utf-8",
    )
    nested = project / "node_modules"
    nested.mkdir()
    (nested / "pkg.md").write_text(
        "Nested vendor " + VENDOR_TOKEN + ".\n",
        encoding="utf-8",
    )
    return tmp_path


def test_ingest_catalogs_note_project_and_file_and_skips_vendor(tmp_path):
    root = _corpus(tmp_path)
    items = ingest(root)

    assert len(items) == 3
    by_kind = {item.kind: item for item in items}
    assert set(by_kind) == {"note", "project", "file"}

    note = by_kind["note"]
    assert note.path == (
        root / "second_brain" / "15 Wiki" / "topics" / "UniqueNote.md"
    ).resolve()
    assert note.title == "Unique Note"
    assert note.group == "15 Wiki"

    project = by_kind["project"]
    assert project.path == (root / "alpha-project" / "README.md").resolve()
    assert project.title == "Alpha Project"
    assert project.group == "alpha-project"

    loose = by_kind["file"]
    assert loose.path == (root / "docs" / "loose-notes.txt").resolve()
    assert loose.title == "loose-notes"
    assert loose.group == "docs"

    cataloged_paths = {item.path for item in items}
    assert (root / "node_modules" / "ignored.md").resolve() not in cataloged_paths
    assert (root / "alpha-project" / "node_modules" / "pkg.md").resolve() not in cataloged_paths


def test_filter_by_kind_and_group_returns_only_matching_items(tmp_path):
    items = ingest(_corpus(tmp_path))

    notes = items_of_kind(items, "note")
    assert [item.kind for item in notes] == ["note"]
    assert notes[0].title == "Unique Note"

    projects = items_of_kind(items, "project")
    assert [item.kind for item in projects] == ["project"]

    grouped = items_of_group(items, "docs")
    assert len(grouped) == 1
    assert grouped[0].kind == "file"
    assert grouped[0].group == "docs"


def test_search_unique_tokens_return_path_and_snippet(tmp_path):
    items = ingest(_corpus(tmp_path))
    cases = [
        (NOTE_TOKEN, "UniqueNote.md"),
        (PROJECT_TOKEN, "README.md"),
        (FILE_TOKEN, "loose-notes.txt"),
    ]
    for token, filename in cases:
        hits = search(items, token)
        assert len(hits) == 1, token
        hit = hits[0]
        assert hit.path.name == filename
        assert token in hit.snippet
        assert hit.title
        assert hit.kind in {"note", "project", "file"}


def test_search_is_case_insensitive(tmp_path):
    items = ingest(_corpus(tmp_path))
    hits = search(items, NOTE_TOKEN.lower())
    assert len(hits) == 1
    assert NOTE_TOKEN in hits[0].snippet
    assert hits[0].path.name == "UniqueNote.md"


def test_search_nonsense_query_returns_no_hit(tmp_path):
    items = ingest(_corpus(tmp_path))
    assert search(items, "ZZZNOMATCH999") == []
    assert search(items, VENDOR_TOKEN) == []
