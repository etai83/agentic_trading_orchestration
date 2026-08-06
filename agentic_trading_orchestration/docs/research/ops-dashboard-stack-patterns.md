# Research: Local Next.js SPA + Python API ops-dashboard patterns

**Ticket:** [#12](https://github.com/etai83/agentic_trading_orchestration/issues/12)  
**Map:** [#11](https://github.com/etai83/agentic_trading_orchestration/issues/11)  
**Branch:** `research/ops-dashboard-stack-patterns`  
**Scope:** Practical, low-friction patterns for a **local Mac** ops dashboard (Next.js/React SPA + separate Python API beside ATO). No Docker required for v1. Primary sources only; no product implementation.

Labels used below:

- **Primary fact** — stated in official docs / specs cited.
- **Recommendation** — design choice for ATO Phase 1 ops dashboard (single-operator, loopback, mock-then-live KnowledgeGraph).

---

## Summary

| Topic | Recommendation for v1 |
|-------|------------------------|
| **Layout** | **In-repo monorepo** under ATO: `apps/ops-web` (Next.js) + `apps/ops-api` (FastAPI). Not a sibling repo. |
| **Dev origin** | **Same-origin via Next.js `rewrites` proxy** (`/api/*` → `http://127.0.0.1:<api-port>/…`). CORS only as fallback. |
| **Env** | Python **pydantic-settings** for `db_path` / `knowledge_root` (server-only). Next uses relative `/api` paths; avoid `NEXT_PUBLIC_*` for store paths. |
| **Live stream** | **SSE** (FastAPI `EventSourceResponse` + browser `EventSource`) for engine events. WebSocket only if bidirectional control appears later. Polling OK for mock smoke. |
| **Gate POST** | Same-origin `fetch` POST + JSON + **custom header**; API bound to **127.0.0.1**; optional local shared secret. No multi-user auth. |

---

## 1. Monorepo vs sibling package layout

### Options

| Layout | Shape | Pros | Cons |
|--------|--------|------|------|
| **A. In-repo monorepo** | `agentic_trading_orchestration/apps/ops-web` + `apps/ops-api` (+ later shared types if needed) | One issue tracker, one PR for API+UI, docs stay with domain; map #11 “beside ATO” fits | Mixed toolchains (Node + Python) in one tree |
| **B. Sibling packages (same parent folder)** | e.g. `Code/ops-dashboard` + `Code/agentic_trading_orchestration` | Clean language split | Split history/issues; easy to drift from KG contracts |
| **C. Full JS monorepo tooling** | npm/pnpm **workspaces** for multiple Node packages | Official npm workspaces link nested packages ([npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)) | Only helps JS packages; Python API is outside that model |

### Primary facts

- **npm workspaces** are for managing multiple **Node** packages from one root `package.json` (`"workspaces": ["packages/*"]`); install auto-links nested packages ([npm docs: workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)).
- Next.js is installed and run **per app** (`create-next-app` / `next dev`); monorepo orchestration (pnpm/turborepo) is optional glue, not required by Next itself ([Next.js installation](https://nextjs.org/docs/app/getting-started/installation)).
- ATO Knowledge store constructor is config-driven: `KnowledgeGraph(db_path, knowledge_root)` — paths from app config, not hardcoded library defaults ([`docs/domain/phase1-knowledge-store.md`](../domain/phase1-knowledge-store.md)).

### Recommendation

Use **layout A**: lightweight monorepo **folders**, not a forced JS workspace monorepo.

Suggested tree (illustrative):

```text
agentic_trading_orchestration/
  apps/
    ops-web/          # Next.js (App Router), package.json, next.config.*
    ops-api/          # FastAPI, pyproject.toml / requirements, uvicorn
  docs/
  CONTEXT.md
  # ATO library packages when they exist (knowledge, orchestrator, …)
```

- **v1 scripts:** two terminals (or a root `Makefile` / `justfile`): `uvicorn` on `127.0.0.1:8000`, `next dev` on `127.0.0.1:3000`.
- **Skip Docker** for v1 (map #11 out of scope).
- **Skip npm workspaces** until a second Node package appears; Python stays its own project root under `apps/ops-api`.
- Prefer **not** publishing the API as a separate GitHub repo until multi-consumer packaging is needed.

---

## 2. CORS vs shared origin (proxy) in dev

### Primary facts — origins

- An origin is **scheme + host + port**. `http://localhost:3000` and `http://localhost:8000` are **different origins** even on the same machine ([FastAPI CORS tutorial](https://fastapi.tiangolo.com/tutorial/cors/); [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)).
- Browsers enforce CORS for cross-origin XHR/`fetch` (and for credentialed modes of SSE via `EventSource`).

### Primary facts — FastAPI CORS

- Use `CORSMiddleware` with an **explicit** `allow_origins` list (e.g. `http://localhost:3000`, `http://127.0.0.1:3000`).
- Wildcard `"*"` **cannot** be combined with `allow_credentials=True`; prefer explicit origins ([FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)).

### Primary facts — Next.js rewrites as proxy

- `rewrites` in `next.config.js` **map an incoming path to another destination** and “act as a URL proxy and mask the destination path” ([Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)).
- Rewrites may target **external URLs** (including `http://127.0.0.1:8000/...`) ([same doc — “Rewriting to an external URL”](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)).

Example pattern (dev):

```js
// next.config.js — illustrative
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*',
      },
    ]
  },
}
```

Browser calls **same origin**: `fetch('/api/gates/...')`, `new EventSource('/api/events')`. Next.dev server proxies to FastAPI → **no CORS** for those requests.

### Recommendation

| Mode | Pattern |
|------|---------|
| **Default (v1)** | **Shared origin via Next rewrites** for REST + SSE. Client base path: `''` or `'/api'`. |
| **Fallback** | If something cannot be rewritten (tooling quirk, non-Next static host), enable FastAPI `CORSMiddleware` with both `localhost` and `127.0.0.1` on the web port. |
| **WebSocket note** | If WebSockets are introduced later, verify proxy behavior separately; many teams point the browser **directly** at `ws://127.0.0.1:8000/...` and rely on CORS/origin checks at the WS layer. Prefer SSE first (see §4) to avoid this. |

Do **not** bind the API to `0.0.0.0` on a shared network for v1; loopback only (see §5).

---

## 3. Env config for `db_path` / `knowledge_root`

### Domain constraint (ATO)

```text
KnowledgeGraph(db_path: Path | str, knowledge_root: Path | str)
```

Paths come from app/seed **config** — no hardcoded repo-relative defaults inside the library ([phase1-knowledge-store](../domain/phase1-knowledge-store.md)).

### Primary facts — FastAPI / Pydantic Settings

- Use `pydantic_settings.BaseSettings`; env vars are read case-insensitively (`db_path` ← `DB_PATH`) ([FastAPI Settings](https://fastapi.tiangolo.com/advanced/settings/)).
- Optional dotenv: `SettingsConfigDict(env_file=".env")` ([same](https://fastapi.tiangolo.com/advanced/settings/)).
- Prefer `@lru_cache` + `Depends(get_settings)` so settings load once and tests can override ([same](https://fastapi.tiangolo.com/advanced/settings/)).

Illustrative API settings:

```python
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    db_path: Path
    knowledge_root: Path
    # optional local gate secret; empty = disabled beyond loopback/header checks
    ops_local_token: str = ""
    host: str = "127.0.0.1"
    port: int = 8000
```

Example `apps/ops-api/.env` (gitignored):

```bash
DB_PATH=/Users/you/Library/Application Support/ato/phase1.db
KNOWLEDGE_ROOT=/Users/you/Library/Application Support/ato/knowledge
# or repo-local for mock fixtures:
# DB_PATH=./var/mock.db
# KNOWLEDGE_ROOT=./var/knowledge
```

### Primary facts — Next.js env

- Next loads `.env*` into `process.env` ([Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)).
- Only vars prefixed `NEXT_PUBLIC_` are exposed to the **browser**; they are inlined at **build** time ([same](https://nextjs.org/docs/app/guides/environment-variables)).
- Non-public vars are server-only (Route Handlers, etc.).

### Recommendation

| Concern | Where | How |
|---------|--------|-----|
| `db_path`, `knowledge_root` | **ops-api only** | pydantic-settings; never ship to the browser |
| API base URL | **ops-web** | Prefer **relative** `/api` (rewrite proxy) → no public env needed |
| Optional direct API URL (no proxy) | ops-web | `NEXT_PUBLIC_OPS_API_BASE=http://127.0.0.1:8000` only if required |
| Mock vs live | ops-api | e.g. `OPS_MODE=mock|live` switching fixture seed vs real KG paths |
| Secrets / tokens | both | server-only on API; if SPA must send a local token, inject via same-origin cookie set by a tiny BFF route **or** a non-secret “dev mode” flag — prefer not embedding long-lived secrets in `NEXT_PUBLIC_*` |

Commit **`.env.example`** (names only), not real paths. Document that Mac paths may use `~/Library/Application Support/ato/` or a repo `./var/` for fixtures.

---

## 4. Live updates: SSE vs WebSocket vs polling

Context: **single-operator**, local Mac, **engine event stream** (server → UI). Gate approve/reject are discrete **POSTs**, not stream messages. Map screens include a live event stream ([#11](https://github.com/etai83/agentic_trading_orchestration/issues/11)).

### Comparison

| | **SSE** | **WebSocket** | **Polling** |
|--|---------|---------------|-------------|
| Direction | Server → client | Bidirectional | Client → server pull |
| Transport | HTTP (`text/event-stream`) | Separate WS protocol | HTTP GET loop |
| Browser API | `EventSource` (native) | `WebSocket` | `fetch` + `setInterval` |
| Reconnect | Built into HTML SSE (`Last-Event-ID`) | App-level | N/A (next poll) |
| Proxy / rewrite | Works over HTTP same as REST | Often needs special upgrade handling | Trivial |
| FastAPI support | First-class `EventSourceResponse` (0.135+) | First-class `WebSocket` | Ordinary routes |
| Fit for engine log | **Strong** | Overkill if UI only listens | Fine for mock / low rate |

### Primary facts — SSE

- SSE is server-push over HTTP; clients use `EventSource` ([HTML living standard — Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)).
- Stream MIME type is `text/event-stream`; events use `data:`, optional `event:`, `id:`, `retry:` ([same](https://html.spec.whatwg.org/multipage/server-sent-events.html)).
- On reconnect, browser may send `Last-Event-ID` ([same](https://html.spec.whatwg.org/multipage/server-sent-events.html)).
- FastAPI: `response_class=EventSourceResponse`, yield models or `ServerSentEvent`; keep-alive comments every 15s; `Cache-Control: no-cache`; `X-Accel-Buffering: no` ([FastAPI SSE](https://fastapi.tiangolo.com/tutorial/server-sent-events/)).
- FastAPI documents SSE for “live notifications, logs and observability” ([same](https://fastapi.tiangolo.com/tutorial/server-sent-events/)).

### Primary facts — WebSocket

- FastAPI exposes Starlette `WebSocket`; requires `websockets` package; accept / receive / send loop; handle `WebSocketDisconnect` ([FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)).
- In-memory multi-client managers do not span processes ([same — connection manager tip](https://fastapi.tiangolo.com/advanced/websockets/)).

### Recommendation (single-operator local)

1. **Primary: SSE** for the engine event stream  
   - Endpoint e.g. `GET /events` (proxied as `/api/events`).  
   - Emit typed events (`event: gate_pending`, `experiment_updated`, …) with monotonic `id` for resume.  
   - Client: `const es = new EventSource('/api/events')` (same origin).  
   - Mock mode: async generator yielding fixture events on a timer.

2. **Polling** as **v0 smoke** or degraded mode  
   - `GET /events?since=<cursor>` every 1–2s.  
   - Good for tests without long-lived connections; worse latency and chatter.

3. **Defer WebSocket** until a real need for **client → server stream** (interactive control plane, shared multi-tab bus). Gate actions stay REST POSTs.

Trade-off summary for this map: SSE matches one-way observability, reuses the rewrite proxy, and has less connection-state code than WebSockets for a single browser tab on loopback.

---

## 5. Safe gate approve/reject POSTs on localhost

Map lock: gates via UI → KG `upsert_human_gate`; read + gate actions only; single agreed channel with orchestrator ([#11](https://github.com/etai83/agentic_trading_orchestration/issues/11)).

### Threat model (v1)

- **In scope:** accidental binding to LAN; CSRF from a malicious page open in the same browser; casual local process poking the port.
- **Out of scope:** multi-user auth, hosted deploy, hostile multi-tenant CSRF at scale (map out of scope).

### Primary facts

- Cross-origin writes can be initiated by other sites; CSRF defenses include tokens, **custom headers** (force CORS preflight), Fetch Metadata (`Sec-Fetch-Site`), and Origin checks ([OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)).
- For AJAX/API, a **custom request header** makes the request non-simple so browsers preflight; server rejects missing header ([OWASP — custom request headers](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi)).
- Do **not** use GET for state-changing operations ([OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)).
- `fetch` default credentials mode is `same-origin` ([MDN Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)).
- Same-origin via rewrite means cookie CSRF surface is smaller; still prefer explicit POSTs with JSON + custom header.

### Recommended pattern

**Client (ops-web):**

```ts
// illustrative — same origin thanks to rewrites
await fetch(`/api/gates/${gateId}/decision`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-ATO-Ops': '1', // custom header → preflight if ever cross-origin
  },
  body: JSON.stringify({ decision: 'approved' | 'rejected', note?: string }),
})
```

**Server (ops-api):**

1. **Bind** Uvicorn/FastAPI to **`127.0.0.1`** (not `0.0.0.0`) so only local processes connect.
2. **Methods:** only `POST` (or `PATCH`) for decisions; never GET.
3. **Body:** JSON schema validated (Pydantic); map to KG `upsert_human_gate` / orchestrator-agreed status (`approved` | `rejected`).
4. **Header gate:** require `X-ATO-Ops` (or similar); reject 403 if missing.
5. **Optional defense-in-depth:**  
   - Reject if `Sec-Fetch-Site` is `cross-site` when present (modern browsers; localhost is a trustworthy context for Fetch Metadata).  
   - Optional `OPS_LOCAL_TOKEN` compared to `Authorization: Bearer …` or `X-ATO-Token` for a second factor against other local processes.
6. **Idempotency:** if status already terminal, return current state (no double-apply).
7. **No multi-user session cookies** in v1 — reduces classic cookie CSRF; custom header + loopback is the main control.

If the SPA ever talks **cross-origin** to the API (no rewrite), enable CORS with **explicit** origins only and keep the custom header; never `allow_origins=["*"]` with credentials ([FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)).

---

## 6. Concrete v1 “happy path” architecture

```text
 Browser (localhost:3000)
    │  fetch('/api/…'), EventSource('/api/events')
    ▼
 Next.js dev (rewrites)  ──proxy──►  FastAPI (127.0.0.1:8000)
                                        │
                         mock fixtures ─┤
                         or KnowledgeGraph(db_path, knowledge_root)
                                        │
                              upsert_human_gate / read façade
```

**Process start (local Mac, no Docker):**

```bash
# terminal 1
cd apps/ops-api && set -a && source .env && set +a
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000

# terminal 2
cd apps/ops-web && npm run dev   # :3000, rewrites → :8000
```

**API surface sketch (not a locked OpenAPI):**

| Method | Path | Role |
|--------|------|------|
| GET | `/campaigns`, `/campaigns/{id}`, … | Read models for list/detail |
| GET | `/gates?status=pending` | Gates inbox |
| POST | `/gates/{id}/decision` | Approve/reject |
| GET | `/events` | SSE engine stream |

Align gate write semantics with the Phase 1 trading map / orchestrator ticket when that channel locks; dashboard must not invent a private gate protocol ([#11](https://github.com/etai83/agentic_trading_orchestration/issues/11)).

---

## 7. Decision table (for stack / transport lock)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package layout | In-ATO monorepo `apps/ops-web` + `apps/ops-api` | One map, one PR, no Docker |
| Dev networking | Next `rewrites` same-origin proxy | Avoid CORS; SSE over HTTP |
| CORS | Explicit localhost list if proxy skipped | FastAPI official middleware |
| Store paths | API pydantic-settings only | Matches KG constructor; never `NEXT_PUBLIC` |
| Event transport | SSE first | Official FastAPI SSE + HTML EventSource; one-way stream |
| Gate mutations | POST + JSON + custom header + 127.0.0.1 | OWASP-friendly local controls |
| Auth product | None (v1) | Map: single operator, local |

---

## Sources (primary)

| Topic | URL |
|-------|-----|
| Next.js rewrites (proxy) | https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites |
| Next.js environment variables | https://nextjs.org/docs/app/guides/environment-variables |
| FastAPI CORS | https://fastapi.tiangolo.com/tutorial/cors/ |
| FastAPI Settings / pydantic-settings | https://fastapi.tiangolo.com/advanced/settings/ |
| FastAPI Server-Sent Events | https://fastapi.tiangolo.com/tutorial/server-sent-events/ |
| FastAPI WebSockets | https://fastapi.tiangolo.com/advanced/websockets/ |
| HTML Server-sent events | https://html.spec.whatwg.org/multipage/server-sent-events.html |
| MDN CORS | https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS |
| MDN Fetch | https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch |
| OWASP CSRF Prevention | https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html |
| npm workspaces | https://docs.npmjs.com/cli/v10/using-npm/workspaces |
| ATO Knowledge store | `docs/domain/phase1-knowledge-store.md` |
| Map destination | https://github.com/etai83/agentic_trading_orchestration/issues/11 |

---

## Out of scope (this note)

- Component library / visual design.
- Production reverse proxy, TLS, multi-user auth.
- Implementing the dashboard or OpenAPI lock.
- Orchestrator file-queue vs in-process gate wiring (owned by Phase 1 trading map).
