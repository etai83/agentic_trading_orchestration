---
tags:
  - resource/keep-digest
  - status/triage
date: 2026-06-26
source: Google Keep Export
---

# 📝 Google Keep Digest & Analysis — 2026-06-26

> [!note] Session Status & Source
> This report aggregates and evaluates the 18 Google Keep notes extracted from the local system session. Each note is categorized with an analysis of its value, further reading recommendations, and practical applications.

---

## 1. Visual Explainer Skill

### 📄 Summary
A reference link and description for **nicobailon/visual-explainer**:
* **Description:** An agent skill that generates rich HTML pages or slide decks for diagrams, diff reviews, plan audits, data tables, and project recaps.
* **Link:** [GitHub Repository](https://github.com/nicobailon/visual-explainer)

### 💡 Analysis & Actionability
> [!success] Opinion: **High Value / Multi-Agent UI** (Rating: 9/10)
> Essential tool for any agentic workflow where visual summaries or plans are needed for human review. It makes agentic reasoning visible and interactive.

* **How to use it:**
  * Clone the repo and integrate it as a custom skill in your AI agent configurations.
  * Use it to generate HTML slide decks when presenting plan audits or complex architecture reviews.

---

## 2. Update Session Logs

### 📄 Summary
A quick task reminder:
* **Task:** "Update sessions logs: Add model and thinking levels to the sessions logs"

### 💡 Analysis & Actionability
> [!info] Opinion: **Internal Process Update** (Rating: 7/10)
> Important for tracking agent operational metrics, particularly which models are used for planning (high reasoning) vs. execution (fast/cheap).

* **How to use it:**
  * Update your workspace session logger hook or standard template in `.agents/` to include fields for `Model` (e.g., Gemini-1.5-Pro) and `Reasoning Level` (e.g., high, medium, low).

---

## 3. Repos

### 📄 Summary
A text note listing three repositories:
* `- voicebox`
* `- codebase-memory-mcp`
* `- docker sandboxes`

### 💡 Analysis & Actionability
> [!info] Opinion: **Core Tech Stack** (Rating: 8/10)
> These represent the core developer tooling stack for running agentic and audio automation.

* **How to use it:**
  * Create individual wiki files for each repo (e.g., `[[codebase-memory-mcp]]`) to document setup commands, active ports, and how they connect to your workspace.

---

## 4. Clapet — AI-Assisted Architecture Diagrams

### 📄 Summary
A reference link to **Clapet**:
* **Description:** AI-assisted architecture diagrams tool.
* **Link:** [Clapet Web App](https://clapet.app/)

### 💡 Analysis & Actionability
> [!tip] Opinion: **High Value for Design Phase** (Rating: 8/10)
> Drawing architecture diagrams is tedious. AI-assisted diagram generation makes system design faster and more iterative.

* **How to use it:**
  * Explore Clapet for the next system design phase.
  * Use it to generate SVG/Mermaid diagrams and export them directly into your Obsidian technical specifications.

---

## 5. Jason Zhou on X

### 📄 Summary
A reference link to Jason Zhou (@jasonzhou1993) on Twitter/X.

### 💡 Analysis & Actionability
> [!info] Opinion: **Industry Watch** (Rating: 5/10)
> Social feed check. Jason Zhou shares insights on AI engineering, startups, and developer agents.

* **How to use it:**
  * Follow for updates on state-of-the-art agent workflows and developer tools.

---

## 6. Ratio Trading

### 📄 Summary
A strategy note outlining a trading concept:
* **Core Idea:** "Regression to the mean (SMA20)" using ratios, specifically `QQQ/BTCUSD`.
* **Rules:** If the ratio moves too far from the 20-day Simple Moving Average (SMA20), short QQQ or buy BTCUSD (and vice versa) to trade the reversion.

### 💡 Analysis & Actionability
> [!warning] Opinion: **Highly Worth Simulating** (Rating: 8.5/10)
> Mean reversion on asset ratios is a viable statistical arbitrage technique, but requires careful volatility scaling and backtesting.

* **How to use it:**
  * Create a backtest script in `Inbox/Trading_Experiments/` to compute the ratio, calculate the rolling SMA20, and plot the standard deviation bands (Bollinger-style).
  * Check correlation stability over different regimes.

---

## 7. Strata Technique with Markov Chain Modeling

### 📄 Summary
A complex mathematical trading idea:
* **Concepts:** 
  1. Find "0 surprise" events.
  2. Create a pyramid structure of Markov matrices to find logic between broader and smaller observations.
  3. Formulate how to connect the smallest observation back to a target.

### 💡 Analysis & Actionability
> [!important] Opinion: **Advanced Quantitative Strategy** (Rating: 9/10)
> Markov chains are powerful for regime detection and transition probability modeling. Using multi-resolution (pyramid) modeling is a sophisticated way to manage noise.

* **How to use it:**
  * Write a theoretical concept note `[[Markov Chain Trading]]` defining the state transitions (e.g. high/low volatility, up/down trends).
  * Design a small Markov transition matrix simulator in Python using historical daily price changes.

---

## 8. Continuous Software Quality Agent Goal

### 📄 Summary
A comprehensive agent directive (`/goal` pattern):
* **Goal:** "Operate as a continuous software quality and validation agent."
* **Phase 1 (Feature Discovery):** Analyze the codebase, identify every user-facing feature/workflow/API/config, create feature IDs, write user stories, and define expected behavior based solely on code.

### 💡 Analysis & Actionability
> [!important] Opinion: **Golden Standard for Agent Goals** (Rating: 10/10)
> This is a master prompt instruction for code validation. It ensures agents perform rigorous feature mapping before attempting to rewrite or modify code.

* **How to use it:**
  * Save this text under `second_brain/Templates/Agent Quality Goal.md` to feed into developer agents when launching extensive refactoring or quality audits.

---

## 9. Code Review Methodology

### 📄 Summary
A note detailing code review principles for agentic systems:
* **Philosophy:** Reviewing own/agent code is about risk management and hedging.
* **Ironclad Rule:** "If I was surprised by something critical during the review phase, I failed."

### 💡 Analysis & Actionability
> [!tip] Opinion: **Core AI Engineering Principle** (Rating: 9.5/10)
> Surprise avoidance is key in automation. It forces the developer to write rigorous, predictive tests and plan checkpoints rather than writing blind code.

* **How to use it:**
  * Update your `.agents/AGENTS.md` rules file to explicitly enforce "Zero Surprise Reviews" through mandatory pre-commit dry-runs and plan verification.

---

## 10. Journeys Out of the Body (Robert A. Monroe)

### 📄 Summary
A link to the classic text on Out-of-Body Experiences (OOBEs) by Robert A. Monroe:
* **Link:** [Archive.org Book](https://archive.org/details/journeys-out-of-the-body-robert-a.-monroe/mode/1up)

### 💡 Analysis & Actionability
> [!success] Opinion: **Philosophical / Inspiration** (Rating: 7/10)
> Classic consciousness research. Useful for offline, non-technical reading to spark creative and lateral thinking.

* **How to use it:**
  * Link this to a general reading list or personal philosophy index `[[Out of Body Studies]]`.

---

## 11. My Shopping List

### 📄 Summary
A listing of completed and active shopping items, including:
* Hummus, oranges, bananas, coffee (☕ tester's choice), small gloves, toilet paper, and various "Ed" entries.

### 💡 Analysis & Actionability
> [!info] Opinion: **Personal Utility** (Rating: 4/10)
> Low technical value, but essential for daily personal logistics.

* **How to use it:**
  * Keep sync active; no further research is needed.

---

## 12. Fix Code Review on a New Session

### 📄 Summary
An AI engineering best practice note:
* **Rule:** "Coding agents should try to fix the reviewer comments on a new session to prevent context bias."

### 💡 Analysis & Actionability
> [!tip] Opinion: **Critical Agent Guideline** (Rating: 9/10)
> A fresh session wipes out confirmation bias and model hallucinations that accumulate during long implementation chats.

* **How to use it:**
  * When receiving reviews, do not try to fix them in the same chat if the context size is huge. Close the chat, open a new session, load the code/review notes, and apply the fixes.

---

## 13. Phased Planning Idea

### 📄 Summary
A planning framework based on distinct phases:
* **Phase 1:** Core idea (1-2 short sentences defining the main goal).
* **Phase 2:** Higher level breakdown of ideas/subtasks.
* **Phase 3:** Detailed breakdown to analyze uncertainties and verify assumptions before coding.

### 💡 Analysis & Actionability
> [!tip] Opinion: **Standard Best Practice** (Rating: 9/10)
> Phased breakdown is the foundation of high-reliability software engineering. Doing detailed task breakdown *before* writing code prevents late-stage architecture redesigns.

* **How to use it:**
  * Enforce this three-tier planning structure for all agent prompts. Make it a rule in your global instructions.

---

## 14. Stocks List

### 📄 Summary
A watchlist note:
* Tickers to check: `AVGO` (Broadcom), `NVDA` (NVIDIA).
* Assets: Gold, Silver, BTC, ETH.
* Reference: Michael Burry's holdings/strategies.

### 💡 Analysis & Actionability
> [!info] Opinion: **Market Watch** (Rating: 6.5/10)
> Focuses on macro trend indicators (precious metals, crypto) and market-leading AI hardware giants.

* **How to use it:**
  * Link to `[[Stocks]]` and set up a script to pull current prices or track institutional filings (13F) for Michael Burry's fund.

---

## 15. The Math of Winning in Trading

### 📄 Summary
A educational video summary on the math of profitable trading (Mulham Trading):
* **Key Concept 1: Expectancy:** The core metric showing if a system makes money.
  * **Formula:** $\text{Expectancy} = (\text{Win Rate} \times \text{Average Win}) - (\text{Loss Rate} \times \text{Average Loss})$
* **Link:** [YouTube Video](https://www.youtube.com/)

### 💡 Analysis & Actionability
> [!success] Opinion: **Essential Trading Concept** (Rating: 9/10)
> You cannot design a profitable trading strategy without calculating its mathematical expectancy.

* **How to use it:**
  * Add the formula and calculations to your backtest reporting suites to automatically output system expectancy alongside Sharpe and drawdown.

---

## 16. How to Build an Organizational Brain

### 📄 Summary
A compilation of references on engineering knowledge management:
* **Concepts:** "The Git-Repo-Per-Department Architecture That Turns Everyone Into a Developer", "Building an AI-Powered Markdown Knowledge Base System", "What is a company brain? Why it's engineering's next competitive moat."
* **Authors/Sources:** יוב קש (@Parzival_1991), Falconer Guides.

### 💡 Analysis & Actionability
> [!success] Opinion: **High Strategic Value** (Rating: 9.5/10)
> Standardizing organization-wide knowledge into version-controlled markdown (git-based) is the best way to feed corporate context into LLM agents.

* **How to use it:**
  * Read the Falconer Guides articles.
  * Implement Git-based sync for your Obsidian vaults to track note histories and allow multi-agent contributions.

---

## 17. Prompt Success Criteria

### 📄 Summary
A guiding prompt tip:
* **Rule:** "Before you start, define the precise criteria for a great result, use a past example as the format to match, and have a second AI check the final output."

### 💡 Analysis & Actionability
> [!tip] Opinion: **High Reliability Prompting** (Rating: 10/10)
> Using past examples (few-shot prompting) and validation loops are the two most effective ways to guarantee correct formatting and outputs from LLMs.

* **How to use it:**
  * Apply this exact rule to all complex tasks (like this report, which matches the format of the 2026-06-25 report).

---

## 18. Make $$$ Strategy

### 📄 Summary
A fast-track startup launch playbook:
1. Brain dump profile into GPT 5.5.
2. Ask for challenges to solve.
3. Use Codex to write solutions.
4. Use Claude Design for UI/UX.
5. Use Hermes for autonomous agent execution.
6. Deploy on Vercel + Convex.
7. Build waitlist and market on Twitter.

### 💡 Analysis & Actionability
> [!important] Opinion: **Rapid Prototyping Pipeline** (Rating: 8/10)
> A modern, hyper-fast development pipeline utilizing state-of-the-art autonomous agents to build, design, and deploy micro-SaaS projects in days.

* **How to use it:**
  * Create a step-by-step project folder `[[SaaS Prototype Launch]]` to map out the tool configs (Codex, Hermes, Convex) for your next micro-SaaS experiment.

---

## 🛠️ Next Steps & Action Plan

1. [ ] **Explore nicobailon/visual-explainer:** Check if the repository can be cloned and tested locally.
2. [ ] **Model the Ratio Trading strategy:** Write a quick Python script to calculate rolling SMA20 on the QQQ/BTCUSD ratio.
3. [ ] **Integrate "Zero Surprise" reviews:** Apply the code review principles and "new session" fixes to your daily coding agent practices.
