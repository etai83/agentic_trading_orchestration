# Phase 1 Knowledge store surface (locked)

Source: wayfinder ticket [Grilling: Knowledge store Phase 1 surface](https://github.com/etai83/agentic_trading_orchestration/issues/8).  
Vocabulary: `CONTEXT.md`, `docs/domain/phase1-entities.md`.  
Callers: **CEO orchestrator only** — engines receive injected context strings; they never query the store ([engine I/O](./phase1-engine-io.md)).

## Responsibility rules

| Rule | Decision |
|---|---|
| Façade | Single async **`KnowledgeGraph`**; SQLite + Markdown are private internals |
| Metrics / lineage | **SQLite** is source of truth |
| Long causal narrative | **Markdown** for humans and file-based LLM context; short fields dual-written to SQLite |
| Strategy config | **SQLite JSON** (queryable); human-readable dump also written into experiment Markdown |
| Similarity / embeddings / block leaderboards | **Out of Phase 1** |
| Finance legacy experiments | **No migration** — empty store on first open |
| Schema helper | Prefer **`sqlite-utils`** for ensure/migrate; façade hides the library |

## Constructor / config

```text
KnowledgeGraph(db_path: Path | str, knowledge_root: Path | str)
```

- Paths come from app/seed **config** — no hardcoded repo-relative defaults inside the library.
- First open: create parent dirs, ensure schema, empty tables. Runtime-generated `knowledge/` tree under `knowledge_root`.

## SQLite tables

Column-level surface for Phase 1. Types are conceptual (implementation may use TEXT for UUIDs/JSON/enums).

### `campaigns`

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `name` | Human label |
| `goal_vector` | JSON (keys: goal-vector ticket) |
| `constraints` | JSON (max experiments, date range, screen params, …) |
| `asset_universe` | JSON list of symbols |
| `status` | Campaign status: `phase1-orchestrator.md` |
| `created_at` | Timestamp |

### `theses`

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `campaign_id` | FK → campaigns |
| `title` | Short name |
| `summary` | Edge pattern prose |
| `status` | `active` \| `exhausted` \| `abandoned` \| `promoted` |
| `created_at` | Timestamp |

### `experiments`

One row per Experiment (multi-asset, multi-tier). Nested payloads live as JSON columns — no separate `backtest_results` / `regime_tags` / `blocks_performance` tables in Phase 1.

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `campaign_id` | FK |
| `thesis_id` | FK |
| `parent_experiment_id` | Nullable FK → experiments |
| `hypothesis` | Dual-write short causal |
| `why_generated` | Dual-write |
| `mutation_delta` | Dual-write; empty string if thesis root |
| `strategy_config` | JSON snapshot |
| `results` | JSON: asset → { execution_tier → Backtest result }; may include **screen metadata** (survivors / screened-out) |
| `regime_tags` | JSON; may be empty until Evaluation |
| `regime_performance` | JSON; may be empty early |
| `verdict` | Nullable until Evaluation: `promising_mutable` \| `dead_end` \| `meets_goals` \| `incomplete` |
| `next_action` | Nullable until Evaluation (closed set in glossary) |
| `next_reasoning` | Full text dual-write (seed scale; OK in SQLite) |
| `created_at` | Timestamp |
| `updated_at` | Timestamp (shell → results → evaluation patches) |

**Domain reconstruction:** `get_experiment` builds the domain `Experiment` fully from SQLite. Markdown is a write-side artifact, not required to read.

### `research_briefs`

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `campaign_id` | FK |
| `payload` | JSON matching Research brief domain fields |
| `created_at` | Timestamp |

### `human_gates`

| Column | Notes |
|---|---|
| `id` | UUID PK |
| `campaign_id` | FK |
| `reason` | Closed set: `phase1-orchestrator.md` |
| `payload` | JSON decision context |
| `status` | `pending` \| `approved` \| `rejected` |
| `created_at` | Timestamp |
| `resolved_at` | Nullable timestamp |

File-queue mechanics for the human remain an **orchestrator** concern; this table is the queryable entity store.

## Markdown layout

Under `knowledge_root` (typically `knowledge/` at runtime):

```text
{knowledge_root}/
  {thesis_id}/
    THESIS.md
    {experiment_id}.md
```

- Paths use **UUIDs** (same as SQLite ids). No slug renaming.
- **No** campaign-level Markdown in Phase 1.
- Tree is **generated** — not hand-authored content in git (tests use a temp `knowledge_root`).

### Experiment file sections (required order)

1. Header: experiment_id, thesis_id, campaign_id, parent_experiment_id, created_at, verdict, next_action  
2. Hypothesis  
3. Why generated  
4. Mutation delta (or explicit “root experiment”)  
5. Strategy config (human-readable dump of the SQLite snapshot)  
6. Results summary (metrics by asset × tier; generated from SQLite on write)  
7. Regime notes (if any)  
8. Next reasoning / causal analysis  

### `THESIS.md` sections

- Title, summary, status  
- List of experiment ids with one-line verdict each  
- Optional open-questions prose  

KnowledgeGraph **writes or refreshes** these files on experiment upserts; no free-form orphan files as part of the store contract.

## Write lifecycle

Single conceptual path: **upsert by id**. Optional thin wrappers may call the same path:

1. **Shell** (after Discovery): lineage + causal shorts + `strategy_config`; results empty; verdict/next null or `incomplete` → SQLite + initial experiment MD  
2. **Results** (after Execution): patch `results` (+ screen metadata) → SQLite + refresh MD results section  
3. **Evaluation** (after Evaluation): patch regimes, verdict, next_action, next_reasoning → SQLite + finish MD causal sections + refresh `THESIS.md`  

Thesis and campaign rows upserted when created/updated by the orchestrator.

## `KnowledgeGraph` methods (Phase 1)

All methods are **`async`**. Bodies may use sync SQLite I/O (e.g. `asyncio.to_thread`) — that is an implementation detail.

### Campaigns

- `upsert_campaign(campaign) -> None`
- `get_campaign(campaign_id) -> Campaign | None`
- `list_campaigns() -> list[Campaign]`

### Theses

- `upsert_thesis(thesis) -> None`
- `get_thesis(thesis_id) -> Thesis | None`
- `list_theses(campaign_id) -> list[Thesis]`

### Experiments

- `upsert_experiment(experiment) -> None` — dual-writes Markdown as above  
- `get_experiment(experiment_id) -> Experiment | None` — from SQLite only  
- `list_experiments(*, thesis_id=None, campaign_id=None) -> list[Experiment]` — at least one scope id required in practice; lineage walk uses `parent_experiment_id` on returned rows  

### Research briefs

- `upsert_research_brief(brief) -> None`
- `get_latest_research_brief(campaign_id) -> ResearchBrief | None`

### Human gates

- `upsert_human_gate(gate) -> None`
- `get_human_gate(gate_id) -> HumanGate | None`
- `list_human_gates(campaign_id, *, status=None) -> list[HumanGate]`
- `list_human_gates_all(*, status=None) -> list[HumanGate]` — cross-campaign list (ops dashboard global inbox / pending badge); see `ops-dashboard-api.md`

### Context injection (orchestrator → engines)

- `get_thesis_context(thesis_id, *, max_chars=None) -> str`  
  - Prefer body of `THESIS.md` (or regenerate from SQLite if MD missing)  
  - Plus, per experiment under the thesis: id, parent, verdict, next_action, hypothesis one-liner, key metrics summary (best asset or simple aggregate)  
  - **No** full `strategy_config` dumps in default context  
  - If over `max_chars` (config/default), truncate — Phase 1 seed scale usually fits; policy: drop oldest experiments first when truncating  

- `get_campaign_context(campaign_id, *, max_chars=None) -> str`  
  - Campaign name, goal_vector, constraints, asset_universe  
  - Theses: title, status, summary  
  - Optional latest research brief summary  
  - Used on Research cold start / `re_research`  

## Explicit non-goals (this ticket / Phase 1)

- `find_similar_experiments`, embeddings, FTS  
- `get_block_performance_stats`, `top_strategies_for_regime`, `thesis_exhaustion_score`, `get_research_priorities`  
- Separate normalized `backtest_results` / `regime_tags` / `blocks_performance` tables  
- Campaign-level Markdown  
- Engines opening DB or reading `knowledge_root` themselves  
- Migrating Finance `experiments/` into the store  

## Owned elsewhere

- Goal-vector key schema → goal-vector ticket  
- Campaign status + human-gate reasons / no required file queue → `phase1-orchestrator.md`  
- Engine I/O wiring → `phase1-engine-io.md`  
- Entity field glossary → `CONTEXT.md` + `phase1-entities.md`  
- Exact LLM prompt bodies that consume context strings → later fog / prompts ticket  
