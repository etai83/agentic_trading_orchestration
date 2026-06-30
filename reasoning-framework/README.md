# Hierarchical Reasoning Framework

A cognitive training system designed to improve your ability to deconstruct complex verbal claims and arguments into rigorous hierarchical structures.

## File Structure

- `.agents/skills/hierarchical-reasoning-analysis/`: Contains the evaluation logic and criteria (`SKILL.md`).
- `templates/session-template.md`: Template for daily session entries.
- `sessions/`: Where you save your daily deconstructions (e.g., `YYYY-MM-DD-topic.md`).
- `progress/tracker.md`: Logs your scores and visualizes performance trends.

---

## Daily Workflow

1. **Record & Transcribe**: Record your spoken process of deconstructing an argument. Transcribe it to a text file.
2. **Create Session File**: Copy `templates/session-template.md` to `sessions/YYYY-MM-DD-your-topic.md` and fill in:
   - `Subject`
   - `Claim` (one sentence)
   - `Argument` (raw text or detailed transcript)
   - `My Deconstruction` (nested bulleted list representing the hierarchy)
3. **Automated Analysis**: A scheduled Antigravity cron job or direct agent run reads the latest file, evaluates it, generates a comparative Mermaid diagram, and appends the feedback to the file.
4. **Log Progress**: The agent automatically appends your scores to `progress/tracker.md` and updates the rolling trend chart.

---

## The Evaluation Rubric (8 Axes, 1–5 Scale)

Each session is scored on a 1–5 scale across 8 axes:

1. **Structural Depth**: Number of hierarchy layers (aim for 4+).
2. **Premise Identification**: Thorough mapping of explicit and implicit premises.
3. **Assumption Surfacing**: Surfacing and explanation of deep hidden assumptions.
4. **Logical Link Validity**: Mathematical/philosophical rigor of parent-child connections.
5. **Completeness**: Coverage of the source argument's entire scope and caveats.
6. **Counterargument Awareness**: Mapping alternative paths, pivots, or counter-claims.
7. **Abstraction Quality**: Vertical consistency—no category mixing within horizontal layers.
8. **Clarity of Expression**: Nodes are concise, self-contained, and crisp propositions.

### Calculations
- **Core Score (50%)**: Average of Structural Depth, Premise Identification, and Assumption Surfacing.
- **Rigor Score (35%)**: Average of Logical Link Validity, Completeness, and Counterargument Awareness.
- **Communication Score (15%)**: Average of Abstraction Quality and Clarity of Expression.
- **Composite Score (0–100)**: `(Core Avg * 0.5 + Rigor Avg * 0.35 + Comm Avg * 0.15) * 20`

---

## Scheduling Setup

To configure the scheduled evaluation of your reasoning files, run the `/schedule` slash command in the Antigravity CLI.

**Recommended scheduled prompt:**
> Run a daily task at 21:00 (or on file changes) to:
> 1. Find the latest unprocessed markdown file in `/Users/itaiharpaz/Code/reasoning-framework/sessions/` (a file is unprocessed if it does not contain the `<!-- ANALYZED -->` tag).
> 2. Activate the `hierarchical-reasoning-analysis` skill to analyze and evaluate the deconstruction.
> 3. Append the score, comparative Mermaid diagrams, and suggestions to the file.
> 4. Log the scores in `/Users/itaiharpaz/Code/reasoning-framework/progress/tracker.md` and update the Mermaid trend chart.
