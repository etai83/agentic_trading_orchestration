# ops-web

Next.js operator SPA for Phase 1 ATO.

## Dev

```bash
# terminal 1 — API (repo root)
make ops-api-dev

# terminal 2 — web
cd apps/ops-web && npm install && npm run dev
```

Open http://127.0.0.1:3000 — `/api/*` rewrites to `http://127.0.0.1:8000/api/*`.

Routes: `/`, `/gates`, `/campaigns/:id`, `/campaigns/:id/experiments/:id`.
