# Agentic Trading Orchestration (ATO)

Autonomous research system that discovers abstract trading edges, tests them across assets, and grows quantitative knowledge under human checkpoints.

Phase 1 implementation is tracked on
[Map: Phase 1 implementation thin slice](https://github.com/etai83/agentic_trading_orchestration/issues/20).

## Layout

| Path | Role |
|------|------|
| `src/ato/` | Phase 1 library (import `ato`) |
| `apps/ops-api/` | FastAPI ops dashboard API |
| `apps/ops-web/` | Next.js ops SPA (placeholder until UI ticket) |
| `docs/domain/` | Locked domain + handoff specs |
| `tests/` | Library tests (pytest) |

## Toolchain

- **uv** + root `pyproject.toml` (workspace includes `apps/ops-api`)
- **pytest**, **ruff**
- Python **≥ 3.12**

## Commands

```bash
make install   # uv sync --all-packages --group dev
make test      # pytest
make lint      # ruff check
make ops-api-dev   # loopback API on :8000
```

Or without Make:

```bash
uv sync --all-packages --group dev
uv run pytest
uv run ruff check src tests apps/ops-api
```

## Domain context

Start with [`CONTEXT.md`](./CONTEXT.md) and the handoffs:

- [`docs/domain/phase1-handoff.md`](./docs/domain/phase1-handoff.md)
- [`docs/domain/ops-dashboard-handoff.md`](./docs/domain/ops-dashboard-handoff.md)
