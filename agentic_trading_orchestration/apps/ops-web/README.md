# ops-web

Next.js operator SPA for Phase 1 ATO.

## Dev

```bash
# terminal 1 — API (from agentic_trading_orchestration root)
make ops-api-dev   # binds 127.0.0.1:8001 by default

# terminal 2 — web (this directory)
cd apps/ops-web
npm install
npm run dev    # cleans .next then starts on 127.0.0.1:3000
```

Open http://127.0.0.1:3000 — `/api/*` rewrites to **`http://127.0.0.1:8001`** (not 8000).

**Port note:** many Mac setups already run something on `:8000` (e.g. omlx). Ops-api defaults to **8001**. If you change the API port, set `OPS_API_PROXY` when starting Next (see `next.config.ts`).

Routes: `/`, `/gates`, `/campaigns/:id`, `/campaigns/:id/experiments/:id`.

## Troubleshooting

### `SegmentViewNode` / `React Client Manifest` / `Cannot find module './NNN.js'`

Almost always a **stale `.next` cache** (e.g. after `next build` then `next dev`, or a crashed compile).

```bash
cd apps/ops-web
rm -rf .next
npm run dev
```

If it still fails:

```bash
rm -rf .next node_modules
npm install
npm run dev
```

Do **not** run `npm run build` and `npm run dev` against the same `.next` without cleaning in between. `npm run dev` / `npm run build` already run `clean` first.

### `ENOENT package.json` at repo root

There is no root Node package. Always run npm from `apps/ops-web/`.
