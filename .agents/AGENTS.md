# Workspace Developer Guidelines

- **Three-Tier Phased Planning**: Always structure plans and specs in three distinct phases before writing implementation code:
  - *Phase 1 (Core Idea)*: 1-2 short sentences defining the primary objective.
  - *Phase 2 (Structural Breakdown)*: High-level architectural/component breakdown.
  - *Phase 3 (Verification & Edge Cases)*: Step-by-step implementation detail analyzing uncertainties, test coverage, and validation targets.
- **Zero Surprise Reviews**: Enforce mandatory dry-runs and verify assumptions. If any critical behavior or side-effect is a surprise during the review phase, the initial plan was insufficient.
- **Mitigate Context Bias**: When addressing code reviews, substantial refactor feedback, or complex bug fixes, start a fresh conversation session rather than continuing in a bloated context window. This prevents hallucination accumulation.
- **Define Prompt Success Criteria**: Before starting any task, explicitly state the criteria for a successful output, map it to a reference format, and outline how the final output will be verified.
