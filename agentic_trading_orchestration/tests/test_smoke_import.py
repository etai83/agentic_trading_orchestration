"""Scaffold smoke: package is importable."""

from ato import __version__


def test_ato_importable() -> None:
    assert __version__
