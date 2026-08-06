# Phase 1 ops dashboard — thesis/experiment graph semantics (locked)

Source: [Grilling: Thesis/experiment graph visualization semantics](https://github.com/etai83/agentic_trading_orchestration/issues/14).  
Map: [Map: Phase 1 orchestration ops dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/11).  
IA host surface: `docs/domain/ops-dashboard-ia.md` (variant A workspace main zone).  
Domain: `CONTEXT.md`, `docs/domain/phase1-entities.md`.

## Purpose

Define how the **thesis forest / experiment lineage** appears so a UI agent can implement without re-grilling. Seed scale: tens of nodes, not thousands.

## Node model

| Element | Role |
|---|---|
| **Experiment** | Only **clickable graph node** |
| **Thesis** | **Column / swimlane header** (region label), not a node |
| **Campaign** | Not drawn on the graph (page context) |

No multi-type node graph in v1.

## Edges

| Edge | Meaning |
|---|---|
| Directed **parent → child** | `parent_experiment_id` mutation lineage only |

- No edges for “same thesis” (columns group that).
- No sibling edges, no extra DAG types in Phase 1.
- Root experiment under a thesis: no parent edge; sits at top of that thesis column.

## Layout

**Hierarchical per thesis column** (deterministic):

1. Group experiments by `thesis_id`.
2. Order theses stably (e.g. `created_at` ascending, then id).
3. Within a thesis: roots (`parent_experiment_id` null) at top; children below parents by lineage depth; siblings ordered by `created_at` then id.
4. Columns side-by-side.

Force-directed layouts are **out of v1**. Optional lightweight SVG/Canvas is fine; no requirement for a heavy viz framework.

## Visual encoding (experiment nodes)

### Fill / style by verdict (primary)

| State | Encoding intent |
|---|---|
| `meets_goals` | Strong positive (e.g. green) |
| `promising_mutable` | Positive / cool accent |
| `dead_end` | Negative (e.g. red/muted red) |
| `incomplete` | Warning (e.g. amber) |
| **Pending** | Muted + optional subtle pulse: `verdict` is null, or known in-flight before evaluation |

Exact hex tokens are implementation choice; **semantic mapping above is locked**.

### Secondary badges (overlay, not fill replacement)

| Condition | Badge |
|---|---|
| `next_action === await_human` **or** a **pending** Human gate references this experiment | Distinct “needs human” marker (e.g. amber ring / gate icon) |

Thesis `status` (`active` / `exhausted` / …) may appear on the **column header**, not as experiment node fill.

### Labels

- Node label: short **experiment id prefix** or truncated title (implementer picks one; tooltip has full detail).
- Column header: thesis **title** (+ optional status chip).

### Tooltip (hover)

Minimum: experiment id, title/hypothesis gist, verdict (or pending), best available sharpe if present, parent id if any.

## Interaction

| Action | Result |
|---|---|
| **Click** node | Navigate to experiment detail route (`/campaigns/:campaignId/experiments/:experimentId`) |
| **Hover** | Tooltip |
| Multi-select | **None** in v1 |
| List toggle | Still available in workspace (IA); table is alternate, not a second graph |

## Empty / edge states

| State | UI |
|---|---|
| No experiments yet | Empty main zone: “No experiments in this campaign yet” |
| Thesis with zero experiments | Column omitted or empty column with header only (prefer **omit**) |
| Orphan parent id (bad data) | Render node in thesis column without edge; do not crash |

## Out of scope (this ticket)

- Continuous metric heatmaps (Sharpe color scales as primary encoding)
- Force layout / clustering by strategy similarity
- Editing lineage from the graph
- API shape for graph payload (API ticket may expose a convenience DTO; semantics here are source of truth for rendering)
