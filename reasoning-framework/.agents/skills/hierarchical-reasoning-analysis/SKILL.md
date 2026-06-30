---
name: hierarchical-reasoning-analysis
description: Use when analyzing a daily reasoning session file to evaluate the user's argument deconstruction, score it against the rubric, generate comparative Mermaid diagrams, and update the progress tracker.
---

# Hierarchical Reasoning Analysis

Use this skill to analyze, critique, and score a user's hierarchical deconstruction of a verbal claim/argument.

## Input Contract

This skill processes a markdown file in the `sessions/` directory. The file must contain the following sections:
- `# Reasoning Session — [DATE]`
- `## Subject`
- `## Claim`
- `## Argument`
- `## My Deconstruction`

Files that have already been processed will contain a `<!-- ANALYZED -->` tag. If the tag is present, do not re-process the file.

---

## The Rubric (8 Axes, 1–5 Scale)

Score the user's deconstruction on these 8 axes. Be critical and rigorous—do not inflate grades.

1. **Structural Depth (Depth)**: Number of layers in the hierarchy.
   - *1*: Flat list, no nesting or hierarchy.
   - *3*: 2–3 layers of nesting, some logical grouping.
   - *5*: 4+ layers with clear vertical abstraction (e.g., Meta-Arch -> Concept -> Sub-systems -> Premises).
2. **Premise Identification (Premises)**: Extent to which core explicit and implicit premises are surfaced.
   - *1*: Misses major core premises or misstates the argument.
   - *3*: Captures the explicit points but misses crucial implicit premises.
   - *5*: Completely maps all explicit claims and unstated premises necessary to make the argument run.
3. **Assumption Surfacing (Assumptions)**: Detection and framing of hidden assumptions.
   - *1*: No assumptions identified, or only states the obvious.
   - *3*: Identifies 1–2 assumptions but doesn't explain how they affect validity.
   - *5*: Surfaces deep, foundational hidden assumptions and discusses their impact on the claim.
4. **Logical Link Validity (Links)**: Soundness of the logical steps connecting parent/child blocks.
   - *1*: Connections are merely associative or asserted without reasoning.
   - *3*: Most connections are logical, but some jump to conclusions or contain leaps.
   - *5*: Every link represents a valid deduction or induction, with clear justification.
5. **Completeness (Complete)**: Coverage of the source argument's scope.
   - *1*: Ignores major parts of the source argument.
   - *3*: Covers the main thread but leaves out minor branches or caveats.
   - *5*: Thoroughly covers the full scope of the argument, including edge cases and limits.
6. **Counterargument Awareness (Counter)**: Integration of counter-claims or alternative pathways.
   - *1*: Dogmatic structure; ignores counterarguments or pivots.
   - *3*: Mentions counterarguments but doesn't map them into the hierarchy.
   - *5*: Explicitly builds alternative paths, counter-claims, or pivot points into the hierarchy.
7. **Abstraction Quality (Abstraction)**: Consistency of categorical layers.
   - *1*: Layers are mixed arbitrarily (e.g., pairing a low-level implementation detail with a high-level philosophy).
   - *3*: Mostly consistent, with minor occurrences of category mixing.
   - *5*: Perfect taxonomic rigor; nodes at the same horizontal level share the same abstraction depth.
 8. **Clarity of Expression (Clarity)**: Readability and self-containment of the deconstructed blocks.
   - *1*: Blocks are wordy, vague, or require reading the raw text to make sense.
   - *3*: Understandable, but some nodes are overly dense or lack clear labeling.
   - *5*: Each node is a concise, crisp proposition that makes sense independently.
9. **Working Memory Consistency (Memory)**: Retention and coherence of the mental map during the spoken deconstruction.
   - *1*: Severe cognitive drift; completely forgets points made earlier, duplicates nodes, or makes contradictory assertions about the structural relationships.
   - *3*: Remembers main nodes, but secondary branches or relations get muddled or dropped mid-argument as complexity increases.
   - *5*: Perfect retention of the active structural map; consistently references, builds upon, and integrates all previously mentioned points without duplication or contradiction.

### Scoring Calculations

Compute the average for each category:
- **Core Avg** = `(Depth + Premises + Assumptions) / 3`
- **Rigor Avg** = `(Links + Complete + Counter + Memory) / 4`
- **Comm Avg** = `(Abstraction + Clarity) / 2`

Calculate the **Composite Score (1–100 Scale)**:
\[\text{Composite Score} = ((\text{Core Avg} \times 0.5) + (\text{Rigor Avg} \times 0.35) + (\text{Comm Avg} \times 0.15)) \times 20\]

---

## Workflow

### Step 1 — Parse & Independently Deconstruct
Read the session file. Before analyzing the user's deconstruction, perform your own independent hierarchical deconstruction of the `## Argument` relative to the `## Claim`. Do this in your thoughts to avoid anchoring bias.

### Step 2 — Grade the User's Work
Apply the 9-axis rubric. Under a new section `## Agent Evaluation`, output:
1. **Scorecard Table**: A clean markdown table of the 9 scores (1–5) and the calculated Composite Score (out of 100).
2. **Score Rationale**: A concise 1-sentence justification for each score.

### Step 3 — Generate Mermaid Diagrams
Create a new section `## Comparative Diagrams` containing two side-by-side (or sequential) Mermaid `graph TD` blocks:
- **User's Deconstruction**: Translate the user's `## My Deconstruction` text into a clean Mermaid flowchart.
- **Improved Deconstruction**: Draw the agent's deconstruction of the argument.

*Mermaid Guidelines:*
- Use short, descriptive node IDs (e.g., `A`, `B`, `C`).
- Use double quotes around node text containing symbols, parentheses, or commas (e.g., `A["Alignment (Core Problem)"]`).
- Keep text inside nodes brief (3-6 words).

### Step 4 — Formulate Feedback & Suggestions
Under a new section `## Feedback & Suggestions`, output:
1. **Comparison**: Detail structural differences, what you did differently, and what the user caught or missed.
2. **Actionable Suggestions**: Provide exactly 3 specific, actionable recommendations (e.g., "Refine layer 3 to separate the software architectures from hardware assumptions", "Surface the implicit assumption that alignment is solvable via learning-based methods").

### Step 5 — Write Back and Update Tracker
1. Append the new sections to the session file:
   ```markdown
   
   ---
   <!-- ANALYZED -->
   ## Agent Evaluation
   ...
   ## Comparative Diagrams
   ...
   ## Feedback & Suggestions
   ...
   ```
2. Open `/Users/itaiharpaz/Code/reasoning-framework/progress/tracker.md`.
3. Append a new row to the progress table with the current date, topic, scores, and composite.
4. Update the **Mermaid Trend Chart** at the bottom of `tracker.md` to display the rolling trend of the last 7 sessions.
