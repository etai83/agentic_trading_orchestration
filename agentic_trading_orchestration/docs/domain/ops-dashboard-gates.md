# Phase 1 ops dashboard — Human gate actions (locked)

Source: [Grilling: Human gate actions from the dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/17).  
Map: [Map: Phase 1 orchestration ops dashboard](https://github.com/etai83/agentic_trading_orchestration/issues/11).  
UX: `ops-dashboard-ia.md`. HTTP: `ops-dashboard-api.md`. Events: `ops-dashboard-events.md`.  
Store entity: `phase1-knowledge-store.md` / `CONTEXT.md` Human gate.  
Orchestrator policy: `docs/domain/phase1-orchestrator.md` (consumes this store-authority model).

## Scope (v1)

| In | Out |
|---|---|
| List pending gates; view reason + payload gist | Pause / resume / cancel campaign |
| **Approve** / **Reject** only | Edit strategy, override verdict, free-form workflow |
| Store write via KnowledgeGraph | UI writing a second file-queue protocol |

## Authority channel (single)

| Rule | Decision |
|---|---|
| **Source of truth** | SQLite **`human_gates`** row via **`KnowledgeGraph`** |
| **Dashboard path** | `POST /api/v1/gates/{gate_id}/resolve` → load gate → transition → `upsert_human_gate` → emit `gate_resolved` |
| **Orchestrator path** | **Poll or watch store** for `status` leaving `pending`; then resume / branch. Do **not** require the UI to write a file queue |
| **File queue** | Optional legacy/debug side channel only. **Not** required for dashboard. If both exist, **store wins** for resolution |

Dashboard must not invent a private second protocol. CLI helpers, if any, should use the same KG upsert semantics.

### Aligned with trading-spec orchestrator

1. Orchestrator treats store gate status as authoritative for resume.
2. No required file-queue dual-write.
3. `reason` closed set: `promote` | `await_human` | `abort_confirm` | `budget_exhausted` | `anomaly`.

## Status transitions

| From | To | Who |
|---|---|---|
| (create) | `pending` | Orchestrator (`gate_opened`) |
| `pending` | `approved` | Operator via ops-api |
| `pending` | `rejected` | Operator via ops-api |
| `approved` / `rejected` | (terminal) | No UI re-open in v1 |

On successful transition: set **`resolved_at`**. Ops-api does **not** set campaign status; orchestrator does after observing the gate.

## HTTP resolve (normative)

```http
POST /api/v1/gates/{gate_id}/resolve
Content-Type: application/json
X-ATO-Ops-Token: <if configured>

{ "status": "approved" | "rejected" }
```

### Outcomes

| Situation | Response |
|---|---|
| Success (was `pending`) | **200** + gate DTO (`status`, `resolved_at`, …) |
| Same status again (already terminal, same value) | **200** + current gate (**no-op idempotent**) |
| Terminal gate, different status requested | **409** `conflict` |
| Gate missing | **404** `not_found` |
| Invalid body | **400** `validation` |
| Bad/missing ops token (when required) | **401** `unauthorized` |

No operator comment field required on resolve in v1.

## UI surface (consume store fields)

| Show | |
|---|---|
| `id`, `campaign_id` | Required |
| `reason` | String (enum later) |
| `payload` | JSON gist (pretty-print / key fields) |
| Links | If payload or conventions include `experiment_id`, link to experiment detail |
| Actions | **Approve** · **Reject** only |
| After success | Refresh gates list + badge; stream shows `gate_resolved`; no **Resume** button |

## Side effects checklist (ops-api)

1. Validate body status ∈ {`approved`, `rejected`}.
2. `get_human_gate`; apply transition rules above.
3. `upsert_human_gate` with updated status + `resolved_at`.
4. Publish `gate_resolved` on campaign event bus (`ops-dashboard-events.md`).
5. Return gate DTO.

Do **not**: mutate experiment verdict, call orchestrator RPC, write Markdown by hand (store dual-write stays inside KG if any).

## Explicit non-goals

- Pause campaign from dashboard
- Multi-approver / RBAC
- Resolving gates without going through KG
- UI-required file-queue dual write
- Re-opening closed gates from UI
