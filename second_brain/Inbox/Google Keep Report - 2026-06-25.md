---
tags:
  - resource/keep-digest
  - status/triage
date: 2026-06-25
source: Google Keep Export
---

# 📝 Google Keep Digest & Analysis — 2026-06-25

> [!note] Session Status & Source
> This report aggregates and evaluates the Google Keep notes extracted from the local system export. Each note is categorized with an analysis of its value, further reading recommendations, and practical applications.

---

## 1. Antigravity Workflow

### 📄 Summary
A set of 6 best-practice steps for maximizing the efficiency and performance of the Antigravity AI assistant:
1. **Planning Mode First:** Map the repo and create a numbered, independent implementation plan divided into architecture, backend, frontend, testing, and verification.
2. **Cluster Execution:** Switch to fast mode only for small, discrete tasks; remain in planning mode for complex blocks.
3. **Model Selection:** Use faster models for small executions and stronger reasoning models for planning, review, and complex debugging.
4. **Leverage Defaults:** Use workspace rules, workflows, or specialized skills (e.g., triggering code reviews, test suites, or frontend polish).
5. **Parallel Lanes:** Isolate independent work streams (backend, frontend, verification) into separate conversations/agents.
6. **Continuous Steering:** Monitor and steer the agent using artifacts rather than waiting for the final output.

### 💡 Analysis & Actionability
> [!tip] Opinion: **Essential / Must-Read** (Rating: 10/10)
> This is the definitive operational playbook for this environment. Following it directly prevents context bloat, reduces errors, and yields cleaner, more modular code.

* **How to use it:** 
  * Save this workflow as a project standard in your `.agents/` folder.
  * Always initiate complex tasks by requesting a structured implementation plan first.
  * Define a separate subagent for frontend vs. backend when executing.

---

## 2. Personal Document Types

### 📄 Summary
A classification checklist for personal document organization, including:
`benefits`, `business`, `career`, `education`, `health`, `identity`, `insurance`, `legal`, `notes`, `real-estate`, `taxes`, `travel`, `vehicles`, `warranties`, `wealth`.

### 💡 Analysis & Actionability
> [!info] Opinion: **Useful Utility** (Rating: 6/10)
> Excellent as a standardized taxonomy for digital and physical document storage, particularly for archiving in a personal vault.

* **How to use it:** 
  * Use these categories as folders or `#tags` under your `second_brain/` vault (e.g., `10 Personal/Identity`, `10 Personal/Taxes`).
  * Create folder structures in your local file system or cloud storage (e.g. Google Drive) matching this naming scheme to keep metadata consistent.

---

## 3. Voicebox — Open Source Voice Cloning Desktop App

### 📄 Summary
A reference link to [Voicebox](https://voicebox.sh/), an open-source voice cloning desktop application.

### 💡 Analysis & Actionability
> [!success] Opinion: **Highly Worth Reading** (Rating: 8/10)
> Voice cloning applications are highly useful for creating local text-to-speech assets, personal assistants, or dictation playback. Open-source local execution ensures privacy.

* **How to use it:** 
  * Download and run the desktop app locally to evaluate voice synthesis quality.
  * Can be integrated with local automation scripts to announce completed build runs, read daily reports aloud, or narrate transcriptions.

---

## 4. Fine-Tuning SLM Prompt on Tabular Data

### 📄 Summary
A quick 3-step loop for optimizing Small Language Model (SLM) prompting:
1. **Gather Dataset:** Retrieve the target tabular dataset.
2. **Benchmark:** Run initial inference on the test set.
3. **Iterative Loop:** Refine and optimize the prompt based on inference feedback to maximize SLM task performance.

### 💡 Analysis & Actionability
> [!tip] Opinion: **High Value for Local AI** (Rating: 8.5/10)
> SLMs (e.g., Llama-3-8B, Gemma-2B) are extremely fast and cheap but sensitive to prompt structure. This iterative optimization loop is key to getting production-grade performance without expensive fine-tuning.

* **How to use it:** 
  * Apply this method when building local agent tools (such as formatting CSVs or parsing logs).
  * Use a simple script to evaluate prompt changes against a golden test set of 20-50 tabular rows to track accuracy.

---

## 5. Introducing Unsloth Studio ✨

### 📄 Summary
An open-source web UI designed to train and run LLMs locally.
* **Key Features:** Fast local training (2x faster, 70% less VRAM), wide support (GGUF, vision, audio, embeddings), auto-dataset generation from raw formats (PDF, CSV, DOCX), self-healing tool calling, side-by-side comparison, and GGUF export.
* **Links:** [GitHub Repo](https://github.com/unslothai/unsloth) | [Docs & Guide](https://unsloth.ai/docs/new/studio)

### 💡 Analysis & Actionability
> [!important] Opinion: **Industry Leading / Game Changer** (Rating: 9.5/10)
> Unsloth is the gold standard for resource-efficient local fine-tuning. The introduction of Unsloth Studio makes local model training accessible on consumer hardware (including Apple Silicon/Mac).

* **How to use it:** 
  * Follow the [Docs/Guide](https://unsloth.ai/docs/new/studio) to install Unsloth Studio locally.
  * Use it to fine-tune a small model (like Llama-3-8B) on your Obsidian notes or codebase to build a private, hyper-personalized local assistant.

---

## 6. Metric Oriented Prompt Template

### 📄 Summary
A structured system prompt template designed to analyze [Question]/[Answer] pairs and refine them:
* **Persona:** Expert Prompt Engineer and Communication Analyst.
* **Task:** Evaluate the original question's ambiguity/structure, proposed refinement for higher quality, and 3 specific optimization metrics to measure improvements.

### 💡 Analysis & Actionability
> [!tip] Opinion: **High Utility for Prompt Engineering** (Rating: 8/10)
> Essential for systematic prompt engineering. It helps eliminate vague prompts and replaces them with structured, measurable instructions.

* **How to use it:** 
  * Save this template in `second_brain/Templates/Metric Prompt Optimizer.md`.
  * Copy-paste any poor interaction into it to let the AI rewrite the prompt and establish clear performance metrics.

---

## 7. 150 SMA Theory Simulator

### 📄 Summary
A trading system idea to build a simulator testing the **150-day Simple Moving Average (SMA)** strategy:
* **Rule:** Buy stocks when price crosses above the 150 SMA; sell/liquidate when price drops below the 150 SMA.
* **Scope:** 50 tickers from the S&P 500 over the last 2 years.
* **Comparison:** Compare performance against the SPX index to evaluate alpha.

### 💡 Analysis & Actionability
> [!success] Opinion: **Actionable Programming Task** (Rating: 9/10)
> Trend-following strategies are standard, but backtesting them across a broad basket is the only way to evaluate if they generate excess return (alpha) or just follow market beta.

* **How to use it:** 
  * Use a Python script with `yfinance` and `pandas` to download S&P 500 historical prices.
  * Code the simple cross-over strategy and compute cumulative returns, drawdown, and Sharpe ratio compared to `^GSPC`.

---

## 8. Auto-Trained Domain-Specific SLMs

### 📄 Summary
An architectural foresight stating that the next wave of AI will consist of auto-trained agents that systematically fine-tune themselves as they interact. For every domain or specific workflow, a unique small language model (SLM) is fine-tuned to the user's specific habits and files.

### 💡 Analysis & Actionability
> [!info] Opinion: **Strategic Vision** (Rating: 9/10)
> Captures the paradigm shift from massive general-purpose LLMs to highly specialized, local, self-improving agents.

* **How to use it:** 
  * Keep this in mind when designing tools: favor lightweight, modular pipelines that can save fine-tuning datasets (prompts and corrected outputs) automatically.
  * Begin building dataset collector scripts that format your daily work or code modifications into JSONL format for future training.

---

## 🛠️ Next Steps & Action Plan

1. [ ] **Log in to Google Keep on browser profile:** Run the `/browser` command in the chat UI, navigate to `https://keep.google.com/`, and log in to refresh the cookies for subsequent automatic ingestion tasks.
2. [ ] **Implement 150 SMA Backtester:** Create a simple Python script in `/Users/itaiharpaz/Code/second_brain/scratch/` to run the backtest request.
3. [ ] **Test Voicebox / Unsloth:** Visit the respective sites to inspect compatibility with your Mac.
