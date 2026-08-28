from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path

Kind = str

SKIP_DIR_NAMES = {
    "node_modules",
    ".git",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".tox",
    ".mypy_cache",
    ".pytest_cache",
    ".obsidian",
    ".trash",
    ".idea",
    ".vscode",
    "site-packages",
}

VAULT_DIR_NAMES = {"second_brain", "vault"}
ELIGIBLE_SUFFIXES = {".md", ".markdown", ".txt", ".rst", ".org", ".text"}
README_NAMES = {"readme.md", "readme.markdown", "readme.txt", "readme.rst"}
FRONTMATTER_TITLE = re.compile(r"(?im)^title:\s*(.+)$")


@dataclass(frozen=True)
class CatalogItem:
    kind: Kind
    path: Path
    title: str
    group: str
    text: str = ""


def ingest(root: Path | str) -> list[CatalogItem]:
    root = Path(root).resolve()
    vaults = _discover_vaults(root)
    items: list[CatalogItem] = []
    for path in _iter_eligible_files(root):
        text = _read_text(path)
        if text is None:
            continue
        kind = _classify(path, vaults)
        items.append(
            CatalogItem(
                kind=kind,
                path=path,
                title=_title_of(path, text),
                group=_group_of(path, kind, root, vaults),
                text=text,
            )
        )
    items.sort(key=lambda item: (item.kind, str(item.path)))
    return items


def items_of_kind(items: list[CatalogItem], kind: str) -> list[CatalogItem]:
    return [item for item in items if item.kind == kind]


def items_of_group(items: list[CatalogItem], group: str) -> list[CatalogItem]:
    return [item for item in items if item.group == group]


def _discover_vaults(root: Path) -> list[Path]:
    if _is_vault_dir(root):
        return [root]
    vaults: list[Path] = []
    for dirpath, dirnames, _filenames in os.walk(root, followlinks=False):
        dirnames[:] = [name for name in dirnames if not _skip_dir_name(name)]
        current = Path(dirpath)
        if current != root and _is_vault_dir(current):
            vaults.append(current)
            dirnames[:] = []
    return vaults


def _is_vault_dir(path: Path) -> bool:
    if not path.is_dir():
        return False
    return path.name.lower() in VAULT_DIR_NAMES or (path / ".obsidian").is_dir()


def _skip_dir_name(name: str) -> bool:
    return name in SKIP_DIR_NAMES or name.startswith(".")


def _iter_eligible_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = sorted(name for name in dirnames if not _skip_dir_name(name))
        for name in sorted(filenames):
            if name.startswith("."):
                continue
            path = Path(dirpath) / name
            if path.suffix.lower() in ELIGIBLE_SUFFIXES:
                yield path.resolve()


def _read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


def _classify(path: Path, vaults: list[Path]) -> str:
    if _under_vault(path, vaults):
        return "note"
    if path.name.lower() in README_NAMES:
        return "project"
    return "file"


def _under_vault(path: Path, vaults: list[Path]) -> bool:
    return any(_is_relative_to(path, vault) for vault in vaults)


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def _group_of(path: Path, kind: str, root: Path, vaults: list[Path]) -> str:
    if kind == "note":
        vault = next(vault for vault in vaults if _is_relative_to(path, vault))
        relative = path.relative_to(vault)
        if len(relative.parts) == 1:
            return vault.name
        return relative.parts[0]
    if kind == "project":
        return path.parent.name
    parent = path.parent
    if parent == root:
        return root.name
    return parent.name


def _title_of(path: Path, text: str) -> str:
    frontmatter, body = _split_frontmatter(text)
    match = FRONTMATTER_TITLE.search(frontmatter)
    if match:
        return match.group(1).strip().strip("'\"")
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return path.stem


def _split_frontmatter(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    rest = text[3:]
    if rest.startswith("\n"):
        rest = rest[1:]
    end = rest.find("\n---")
    if end < 0:
        return "", text
    return rest[:end], rest[end + 4 :]
