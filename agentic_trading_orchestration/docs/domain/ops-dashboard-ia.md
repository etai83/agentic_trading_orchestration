# Phase 1 ops dashboard — IA and operator workflows (locked)

Source: [Grilling: Ops dashboard IA and operator workflows](https://github.com/etai83/agentic_trading_orchestration/issues/13).  
Map: [Map: Phase 1 orchestration ops dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/11).  
Stack research: `docs/research/ops-dashboard-stack-patterns.md`.  
Mock demo (throwaway): `prototypes/ops-dashboard-ia/index.html`.

## Primary user

**Operator (HITL)** — watch orchestration, clear Human gates, open causal Markdown. Not scientist cockpit; not Wayfinder planning.

## Routes (v1)

| Route | Purpose |
|---|---|
| `/` | **Campaign list** (default home). Pending-gates badge (global count). |
| `/gates` | **Gates inbox** — all pending (filter by campaign). Approve/reject here. |
| `/gates/:gateId` | Optional deep link / drawer target for one gate. |
| `/campaigns/:campaignId` | **Campaign workspace** (main ops surface). |
| `/campaigns/:campaignId/experiments/:experimentId` | **Experiment detail**. |

Event stream is **not** a top-level nav page — it is a **docked, collapsible pane** on campaign workspace (optional global strip later = out of v1).

## Top-level nav

- **Campaigns**
- **Gates** (badge = pending count)

Inside a campaign: breadcrumbs `Campaigns / {name}`; no separate top-level Experiments or Events.

## Campaign workspace layout

**Approved layout (prototype variant A):** three-zone **graph workspace**. Variants B (tabs) and C (dense console) rejected for v1 primary chrome.

Three zones:

1. **Header** — name, status badge (enum from orchestrator when locked; mock uses provisional labels), goal-vector gist, experiment counts, pending-gates strip if `pending > 0`.
2. **Main** — thesis/experiment **graph** primary; toggle to **list** of experiments. Graph semantics: `docs/domain/ops-dashboard-graph.md`.
3. **Dock** — collapsible **engine event stream** (SSE live / mock poll). Side or bottom; default bottom on narrow, side on wide.

Prototype pointers:
- **Shell (provisional operator approval):** `prototypes/ops-dashboard-shell/index.html`
- Earlier multi-variant IA mock: `prototypes/ops-dashboard-ia/index.html` (A won; B/C rejected)

## Gates workflow (UX)

1. Gate opens → **nav badge** increments; optional **banner** on current page (“1 gate needs review”).
2. Operator opens gate from banner, `/gates`, or campaign pending strip.
3. Gate view: reason, payload gist, links to campaign + experiment, **Approve** / **Reject**.
4. On success: list/badge update; stream shows gate resolved. **No separate Resume button** — orchestrator resumes from store status.
5. No full-screen blocking modal.

## Experiment detail (v1 content)

- Lineage: thesis, parent experiment link
- Hypothesis, why_generated, mutation_delta
- Strategy config gist (readable dump)
- Results table: asset × tier metrics (floor fields)
- Verdict, next_action, next_reasoning
- Link to knowledge Markdown path (open file / show path; browser may not open local files — show path + copy)

## Empty / loading / error (defaults)

| State | Behavior |
|---|---|
| No campaigns | Empty list CTA: “No campaigns yet” (create stays CLI — no create form in dashboard v1) |
| Loading | Skeleton blocks on list/workspace |
| API error | Inline error + retry on the failed region |
| No pending gates | Inbox empty state: “You’re clear” |
| Stream disconnected | Dock shows disconnected; auto-retry SSE; mock mode always “connected” |

## Out of this ticket

- Graph node/edge visual encoding → graph ticket
- HTTP routes/DTOs → API ticket
- Event type vocabulary → event stream ticket
- Gate authority: `docs/domain/ops-dashboard-gates.md`
- Pixel design system
