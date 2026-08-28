# Workspace cleanup plan

Inventory of every project under `/Users/itaiharpaz/Code` as of 2026-08-28.
A **project** is a top-level non-dot directory, plus any nested directory that has
its own `.git`. Dot-directories (`.agents`, `.gemini`, `.git`, `.venv`, `.agent`,
`.pi`, `.sensei-framework`) are not projects. Trees named `node_modules`,
`.venv`, `venv`, `target`, `.git`, or `__pycache__` are not projects.

Statuses: `active` | `abandoned` | `duplicated` | `unfinished` | `mixed`
(`mixed` only when two of abandoned/duplicated/unfinished apply; evidence names which).

Actions: `leave` | `archive` | `dedupe-later` | `finish-later` | `obvious-safe-done`

Priorities: `P0` obvious-safe now; `P1` duplicate cluster later; `P2` abandoned/unfinished later; `P3` leave.

This pass does **not** delete or merge whole projects, rewrite `second_brain` notes,
remove `storage/`, images, DBs, or `.env*`, or finish product features.

## Duplicate clusters (related, not identical — do not delete)

1. **Finance vs te-paper-trading** — Finance 8.7G vs te-paper-trading 129M; `diff -rq` ~517 lines (505 only-in, 12 differ). Canonical experiments live in Finance; te-paper-trading is an active paper-trading occupant (commit 2026-08-28) sharing strategy DNA, not a copy.
2. **AI-Agents/transcriber vs Tools-Apps/transcriber** — 1.3G Python v1.1.0 (2026-02-09) vs 11G Rust v1.3.0 (2026-06-03). Distinct `storage/` audio on both sides. PLAN.md and frontend components differ.
3. **thoughts-manager vs ThoughtsManager** — 1.1G vs 1.2G; `diff -rq` 31 lines. kebab-case v1.2.0 (2026-01-18) vs PascalCase v1.0.0 (2026-01-16). Source files differ (Canvas, page, package.json).
4. **sessions-eval vs sessions-tasks-eval** — 1.0G product vs 60K leftover `sandbox_*` dirs. No overlapping files; related as eval harness vs task sandboxes.
5. **Trading cluster** — Finance (canonical), te-paper-trading, trading-agents, trading_patterns, wallstreet_game, plus Tools-Apps AlgoTester/new_app. Related-not-identical; sizes and last-commit dates diverge.
6. **Quiz apps LexiLearn vs ReadWise** — 761M vs 587M; `diff -rq` 34 lines (31 only-in, 3 differ). LexiLearn is Express/PDF-quiz with PLAN.md; ReadWise is Next.js+Clerk+Prisma. Not copies.
7. **AlgoTester vs new_app** (extra inside Tools-Apps) — same AlgoTester product line; 71 of 98 common files identical including coverage dumps; frontend source differs. Treat as P1 dedupe with the trading cluster.

## Machine inventory

| path | name | status | evidence | action | priority |
| --- | --- | --- | --- | --- | --- |
| . | Code-root | unfinished | git 2026-08-24 on impl/phase1-scaffold; 120 tracked files; no .gitignore; mixes ATO and vault | leave | P3 |
| agent-rv | agent-rv | active | git 2026-08-21 blind-image harness; tests/; catalog images — do not delete | leave | P3 |
| agentic-linkedin | agentic-linkedin | abandoned | git 2026-03-28; vendor framework; little original app code | archive | P2 |
| agentic_trading_orchestration | agentic_trading_orchestration | unfinished | no nested git (tracked at Code-root); source mtime 2026-08-06; Phase 1 ops-web still open | finish-later | P2 |
| AI-Agents | AI-Agents | abandoned | no git; leftover ollama_client.py 2025-07-04; container; also langgraph_cognee (no .git, not a separate project) | archive | P2 |
| AI-Agents/ai-dev-tasks | ai-dev-tasks | abandoned | git 2025-07-10 upstream clone; no local work since | archive | P2 |
| AI-Agents/automaker | automaker | mixed | abandoned+unfinished; git 2026-01-12; TODO.md bugs and UX still open | archive | P2 |
| AI-Agents/autoresearch_btc | autoresearch_btc | mixed | abandoned+unfinished; git 2026-03-15; 138 TODO-matching files | archive | P2 |
| AI-Agents/claude_test | claude_test | abandoned | git empty (no commits); AGENTS scaffolding only, 2026-03-02 | archive | P2 |
| AI-Agents/fact-checker | fact-checker | abandoned | git 2026-01-04 TruthStream PoC; idle since | archive | P2 |
| AI-Agents/Gemini-Conductor-Kanban | Gemini-Conductor-Kanban | abandoned | git 2026-01-07; idle since | archive | P2 |
| AI-Agents/knowledge-explorer | knowledge-explorer | abandoned | git 2026-02-20; uncommitted dirt; idle | archive | P2 |
| AI-Agents/langgraph_neo4j | langgraph_neo4j | abandoned | git empty (no commits); source mtime 2025-12-24; empty unused test_neo4j.ipynb removed 2026-08-28 | archive | P2 |
| AI-Agents/skillify | skillify | abandoned | git 2026-02-01 AI Studio clone; idle | archive | P2 |
| AI-Agents/transcriber | transcriber-ai-agents | mixed | duplicated+unfinished; git 2026-02-09 v1.1 Python vs Tools-Apps v1.3 Rust; PLAN.md; distinct storage/ | dedupe-later | P1 |
| Archived | Archived | abandoned | MCP.json + project-backup.bundle 2025-07; already parked | leave | P3 |
| deepseek-harness | deepseek-harness | active | git 2026-08-17 upstream dsh-0.1.0-rc.7 pin | leave | P3 |
| docs | docs | active | workspace cleanup plan and inventory table created 2026-08-28 | leave | P3 |
| Finance | Finance | active | git 2026-08-27 GOOGL trades; 8.7G canonical vs te-paper-trading 129M | leave | P3 |
| gemma-local-test | gemma-local-test | abandoned | no git; only .venv + cookbook clone; mtime 2026-06-25 | archive | P2 |
| gemma-local-test/cookbook | gemma-cookbook | abandoned | git 2026-06-19 Google Gemma cookbook clone | archive | P2 |
| heroes-tactics | heroes-tactics | abandoned | git 2026-07-21 play-again polish; idle prototype | leave | P3 |
| Knowledge-Systems | Knowledge-Systems | abandoned | no git; container; last nested git 2026-01-18 | leave | P3 |
| Knowledge-Systems/KnowledgeManager | KnowledgeManager | abandoned | git 2025-07-12; empty README.md left in place | archive | P2 |
| Knowledge-Systems/LexiLearn | LexiLearn | mixed | abandoned+duplicated+unfinished; git 2025-07-08; PLAN.md unimplemented; quiz cluster vs ReadWise | dedupe-later | P1 |
| Knowledge-Systems/ReadWise | ReadWise | mixed | abandoned+duplicated; git 2025-07-07 Next.js quiz; dirty 131; cluster vs LexiLearn | dedupe-later | P1 |
| Knowledge-Systems/TextGraph | TextGraph | abandoned | git 2025-06-07 | archive | P2 |
| Knowledge-Systems/thoughts-manager | thoughts-manager | mixed | abandoned+duplicated; git 2026-01-18 v1.2.0; related-not-identical vs ThoughtsManager | dedupe-later | P1 |
| Knowledge-Systems/ThoughtsManager | ThoughtsManager | mixed | abandoned+duplicated; git 2026-01-16 v1.0.0 PascalCase fork | dedupe-later | P1 |
| learning_stuff | learning_stuff | abandoned | no git; markov_chain_btc lessons last 2026-07-02; tracked at root | leave | P3 |
| matt_pocock | matt_pocock | abandoned | no git; container for skills clone | leave | P3 |
| matt_pocock/skills | matt-pocock-skills | active | git 2026-06-18; referenced by Finance agent-skill setup | leave | P3 |
| meetily | meetily | unfinished | git 2026-07-28 Hebrew whisper fork of Meetily | finish-later | P2 |
| micha-db | micha-db | active | git 2026-08-12 OCR pipeline; discord_data.db + images — do not delete | leave | P3 |
| personal-ai-os | personal-ai-os | unfinished | no git; created 2026-08-28 local tool desk with tests; in-flight concurrent work | leave | P3 |
| personal-knowledge-system | personal-knowledge-system | unfinished | no git; created 2026-08-28 catalog/search CLI with tests; in-flight concurrent work | leave | P3 |
| questions-emotions-triger | questions-emotions-triger | abandoned | no git; test_notebook.py 2026-07-11 + transcripts csv (unique data) | archive | P2 |
| reasoning-framework | reasoning-framework | abandoned | no git; last session 2026-07-07; progress tracker idle | leave | P3 |
| second_brain | second_brain | active | vault mtime 2026-08-25 Keep reports; do not rewrite notes | leave | P3 |
| sessions-eval | sessions-eval | active | git 2026-08-04 dashboard grok sessions; tests present | leave | P3 |
| sessions-tasks-eval | sessions-tasks-eval | mixed | abandoned+duplicated; no git; 60K sandbox_* leftover vs sessions-eval; not identical | dedupe-later | P1 |
| startos | startos | unfinished | git 2026-06-17 reality simulator; stitch UI mocks remain | finish-later | P2 |
| taskview-community | taskview-community | abandoned | git 2026-07-11 TaskView clone; web__old leftover (keep; not identical) | archive | P2 |
| te-paper-trading | te-paper-trading | duplicated | git 2026-08-28 SPX_MACD paper; 129M related-not-identical vs Finance 8.7G | dedupe-later | P1 |
| tests | tests | active | workspace inventory completeness tests for this plan | leave | P3 |
| Tools-Apps | Tools-Apps | unfinished | git empty (no commits); 0-byte unreferenced prd.md removed 2026-08-28 | obvious-safe-done | P0 |
| Tools-Apps/AlgoTester | AlgoTester | mixed | abandoned+duplicated; git 2026-01-11 vs new_app; empty tracked server.log removed 2026-08-28 | dedupe-later | P1 |
| Tools-Apps/new_app | new_app | mixed | abandoned+duplicated; git 2026-01-07 AlgoTester clone; empty tracked server.log removed 2026-08-28 | dedupe-later | P1 |
| Tools-Apps/transcriber | transcriber-tools-apps | mixed | duplicated+unfinished; git 2026-06-03 v1.3 Rust; PLAN.md; distinct storage/ vs AI-Agents copy | dedupe-later | P1 |
| Tools-Apps/whatsapp_ss | whatsapp_ss | active | git 2026-06-15 alens CLI; used by alens skill | leave | P3 |
| trading-agents | trading-agents | mixed | abandoned+duplicated; git 2026-06-29; empty README left in place; trading cluster | dedupe-later | P1 |
| trading_patterns | trading_patterns | mixed | abandoned+duplicated; git 2026-05-20; trading cluster vs Finance | dedupe-later | P1 |
| uap-kg | uap-kg | active | git 2026-08-16 30-video catalog | leave | P3 |
| wallstreet_game | wallstreet_game | abandoned | git empty (no commits); files dated 2026-02-21 fetch_data/index.html | archive | P2 |

## Priority summary

### P0 — obvious-safe now

- Remove empty unreferenced `Tools-Apps/prd.md`.
- Remove empty tracked `Tools-Apps/AlgoTester/server.log` and `Tools-Apps/new_app/server.log` (git-reversible).
- Remove empty unused `AI-Agents/langgraph_neo4j/test_neo4j.ipynb` (0-byte, not valid JSON, unreferenced).

Not in scope even if empty: `second_brain` notes, empty README placeholders, `.gitkeep`, package `__init__.py`, experiment notebooks under Finance/te-paper-trading.

### P1 — duplicate clusters later (do not merge this pass)

Dedupe decisions needed (keep both trees until then): transcribers, thoughts-manager pair, LexiLearn/ReadWise, sessions-eval/sessions-tasks-eval, Finance/te-paper-trading, trading cluster, AlgoTester/new_app.

### P2 — abandoned / unfinished later

Archive candidates: agentic-linkedin, most AI-Agents nested clones, gemma-local-test, KnowledgeManager, TextGraph, questions-emotions-triger, taskview-community, wallstreet_game, claude_test.

Finish-later (product work, out of this goal): ATO Phase 1, startos simulator, meetily Hebrew fork, LexiLearn PLAN, transcriber redesign, Finance Pine/TV, deepseek-harness TODOs (upstream).

### P3 — leave

Active work and already-parked trees: agent-rv, Finance, second_brain, sessions-eval, micha-db, uap-kg, te-paper-trading (flagged P1 as duplicate but still active — action remains dedupe-later), deepseek-harness, whatsapp_ss, heroes-tactics, Archived, learning_stuff, reasoning-framework, Code-root scaffold (do not invent a workspace-wide `.gitignore` this pass).

## Obvious-safe applied

See also the run log. Each item met: mechanical junk/empty template; no unique media/DB/vault/.env; reversible from git or recorded as 0-byte restore via `touch`; not a whole-project delete.

| path | why | before | after |
| --- | --- | --- | --- |
| Tools-Apps/prd.md | empty unreferenced template (0 bytes, no references) | 0-byte file existed | deleted |
| Tools-Apps/AlgoTester/server.log | empty tracked log artifact | 0-byte tracked file | deleted (`git rm`) |
| Tools-Apps/new_app/server.log | empty tracked log artifact | 0-byte tracked file | deleted (`git rm`) |
| AI-Agents/langgraph_neo4j/test_neo4j.ipynb | empty unused notebook (invalid JSON) | 0-byte file existed | deleted |

Restore empty files with `touch <path>`. Restore tracked logs with `git checkout HEAD -- server.log` in the owning repo if the `git rm` is committed, or from that repo's history.

## Completeness check

```bash
python workspace_inventory.py
# or
pytest tests/test_workspace_inventory.py
```

The check discovers live project paths and fails if any path is missing from the table above, or if status/evidence/action/priority is empty.
