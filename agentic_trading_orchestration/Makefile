.PHONY: install test lint ops-api-dev help

help:
	@echo "install     - uv sync (library + ops-api workspace + dev tools)"
	@echo "test        - pytest"
	@echo "lint        - ruff check"
	@echo "ops-api-dev - uvicorn ops-api on 127.0.0.1:8000"

install:
	uv sync --all-packages --group dev

test:
	uv run pytest

lint:
	uv run ruff check src tests apps/ops-api

ops-api-dev:
	uv run --package ops-api uvicorn ops_api.main:app --host 127.0.0.1 --port 8000 --reload
