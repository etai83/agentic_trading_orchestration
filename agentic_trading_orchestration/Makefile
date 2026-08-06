.PHONY: install test lint ops-api-dev ops-web-install ops-web-dev help

help:
	@echo "install         - uv sync (library + ops-api workspace + dev tools)"
	@echo "test            - pytest"
	@echo "lint            - ruff check"
	@echo "ops-api-dev     - uvicorn ops-api on 127.0.0.1:8001"
	@echo "ops-web-install - npm install in apps/ops-web"
	@echo "ops-web-dev     - next dev on 127.0.0.1:3000"

install:
	uv sync --all-packages --group dev

test:
	uv run pytest

lint:
	uv run ruff check src tests apps/ops-api

# Port 8001 by default — :8000 is often taken (e.g. omlx). Override: OPS_API_PORT=8000 make ops-api-dev
ops-api-dev:
	uv run --package ops-api uvicorn ops_api.main:app --host 127.0.0.1 --port $${OPS_API_PORT:-8001} --reload

ops-web-install:
	cd apps/ops-web && npm install

ops-web-dev:
	cd apps/ops-web && npm run dev
