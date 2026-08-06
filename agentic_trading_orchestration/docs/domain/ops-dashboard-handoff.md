# Phase 1 ops dashboard — handoff & acceptance (locked)

Source: [Grilling: Acceptance criteria for thin-slice ops dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/19).  
Map: [Map: Phase 1 orchestration ops dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/11).

## Destination (product)

Runnable thin-slice **operator** dashboard for ATO Phase 1 orchestration:

- Watch Campaign / Thesis / Experiment progress  
- Lineage **graph** + experiment detail  
- Pending **Human gates** (approve/reject only)  
- Docked **engine event stream**  
- **Mock first**, then **live** against Knowledge store when available  

Not a scientist cockpit, not Wayfinder planning UI, not multi-user hosted SaaS.

## Map vs product

| Milestone | Done when |
|---|---|
| **This wayfinder map** | Decisions locked in domain docs; handoff written; throwaway shell exists for feel |
| **Product thin-slice** | Mock acceptance checks pass on `apps/ops-web` + `apps/ops-api`; live checks pass when store (and optionally orchestrator events) available |

The map is **decision-complete** once this handoff is accepted. Implementation is a follow-on build that **consumes** this package — do not re-grill stack/IA/graph/API/events/gates without cause.

## Ordered reading list (implementer)

1. This file (acceptance + non-goals)  
2. [`ops-dashboard-ia.md`](./ops-dashboard-ia.md) — routes, nav, variant A workspace, gate UX  
3. [`ops-dashboard-graph.md`](./ops-dashboard-graph.md) — nodes, edges, layout, colors  
4. [`ops-dashboard-api.md`](./ops-dashboard-api.md) — `/api/v1`, mock/live, routes, errors  
5. [`ops-dashboard-events.md`](./ops-dashboard-events.md) — types, producers, ring buffer  
6. [`ops-dashboard-gates.md`](./ops-dashboard-gates.md) — store authority, resolve semantics  
7. [`phase1-knowledge-store.md`](./phase1-knowledge-store.md) — KG methods including `list_human_gates_all`  
8. [`phase1-entities.md`](./phase1-entities.md) + repo [`CONTEXT.md`](../../CONTEXT.md) — vocabulary  
9. [`docs/research/ops-dashboard-stack-patterns.md`](../research/ops-dashboard-stack-patterns.md) — monorepo, proxy, SSE, loopback  
10. Feel reference: [`prototypes/ops-dashboard-shell/`](../../prototypes/ops-dashboard-shell/) (provisional operator approval; polish OK)

Domain entities and engines remain owned by [Map: Phase 1 thin-slice build-ready spec](https://github.com/etai83/agentic_trading_orchestration/issues/1) — **consume**, do not fork.

## Stack (locked)

| Piece | Choice |
|---|---|
| Layout | `apps/ops-web` (Next.js) + `apps/ops-api` (FastAPI) in ATO monorepo |
| Dev | Next rewrite `/api/*` → `127.0.0.1` API; bind API to loopback |
| Mode | `OPS_DATA_MODE=mock\|live` (server-only) |
| Data | KnowledgeGraph or mock double — no ad-hoc SQL |
| Stream | SSE (+ optional poll) |
| Writes | Gate resolve only + optional ops token header |

## Mock-mode acceptance (product DoD)

All must pass:

1. **Run:** mock mode; API on loopback; Next with `/api` rewrite (Makefile/scripts OK).  
2. **Routes:** campaign list (`/`), gates inbox, campaign workspace, experiment detail — navigable without crash.  
3. **Graph:** thesis columns; experiment nodes; parent→child edges; verdict colors; needs-human badge; click → experiment detail; graph/list toggle.  
4. **Stream:** docked pane shows mock events using **closed type names** from events doc.  
5. **Gates:** Approve/Reject; pending clears; badge updates; same-status re-resolve OK; opposite status on terminal → conflict; **no** Resume / pause / create-campaign.  
6. **Empty states:** empty campaign list / empty gates do not crash.  
7. **Scope guard:** no strategy editor, no multi-user auth, no scientist analytics screens.

Automated e2e (Playwright, etc.) is **optional**, not a gate for mock DoD.

## Live-mode acceptance (when store exists)

1. `OPS_DATA_MODE=live` with real `db_path` / `knowledge_root`.  
2. Lists and detail reflect **store** data (not fixtures).  
3. Gate resolve **writes** store via KG; status `pending` → `approved`|`rejected` + `resolved_at`.  
4. Orchestrator resume: manual verification that store status is what orchestrator will poll (hooks may still be landing on trading-spec map).  
5. SSE endpoint works; **empty/disconnected stream is OK** until orchestrator emits — UI must not crash.  
6. Markdown **path** shown for experiments; browser need not open local files.

## Explicit non-goals

- Multi-user auth / hosted multi-tenant deploy  
- Docker-required packaging for v1  
- Scientist cockpit (regime heatmaps, multi-campaign analytics, strategy builder)  
- TV charts, embeddings similarity UI, paper trading  
- Wayfinder planning board  
- Control plane beyond gate resolve (no campaign pause/create from UI in v1)  
- Force-directed graph; SQLite durable event warehouse  
- Full Markdown body over HTTP  
- Re-deciding Phase 1 domain entities owned by the trading-spec map  

## Open dependencies (do not block mock)

| Dependency | Owner | Impact |
|---|---|---|
| Campaign status **enum** strings | `phase1-orchestrator.md` (locked) | Badge labels |
| Orchestrator **event emission** | `phase1-orchestrator.md` + events doc | Live stream traffic |
| `list_human_gates_all` implementation | Knowledge store | Global inbox (mock can fake; live needs method) |
| File queue vs store | Gates handoff on #9 | Store already authoritative for UI |

## Suggested implementation order

1. `apps/ops-api`: settings, mock KG double, routes per API doc, SSE ring buffer, gate resolve  
2. `apps/ops-web`: routes per IA, fetch client, graph per graph doc, stream consumer, gates inbox  
3. Pass mock acceptance  
4. Wire live KG + soft stream  
5. Align event emission when orchestrator lands  

## Definition of “map complete”

- [x] Research stack patterns  
- [x] IA + graph + API + events + gates locked  
- [x] Shell prototype provisionally approved  
- [x] This handoff + acceptance criteria  

**Product complete** is separate: mock (then live) checklists above.
