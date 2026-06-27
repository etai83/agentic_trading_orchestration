---
tags:
  - resource/keep-digest
  - status/triage
date: 2026-06-27
source: Google Keep Export
---

# 📝 Google Keep Digest & Analysis — 2026-06-27

> [!note] Session Status & Source
> This report aggregates and evaluates the Google Keep notes created or edited in the last 24 hours. A total of 1 note met the time criteria. It has been categorized with an analysis of its value, further reading recommendations, and practical applications.

---

## 1. Strategy for max the average profit per trade

### 📄 Summary
A note outlining ideas for a new trading strategy focusing on maximizing average profit per trade rather than purely win rate:
* **Focus:** High average gain percentage per trade.
* **Risk Management:** Place a stop loss on the current candle's low.
* **Macro Inputs:** Integrate broader liquidity and macroeconomic indicators, specifically M2 money supply data and bond yields (like the 10-year Treasury yield).
* **Labels:** `Tradings`

### 💡 Analysis & Actionability
> [!success] Opinion: **High Value / Quantitative Strategy** (Rating: 9/10)
> Maximizing the average profit per trade (expectancy) is the most robust way to build a system resilient to transaction fees and slippage. Using the current candle low as a stop loss is a clean, dynamic way to manage risk. Combining this with macroeconomic indicators (M2, 10Y Yield) is excellent for detecting market regime shifts (e.g., liquidity expansion/contraction, interest rate expectations).

* **How to use it:**
  * **Regime Filter:** Retrieve Fred M2 money supply data and 10-Year Treasury Yields (`^TNX` via Yahoo Finance) to construct a binary market regime filter (e.g., expansionary vs. contractionary).
  * **Dynamic Stop-Loss Backtest:** Implement a backtesting script (e.g. in `[[Trading_Experiments]]`) to evaluate entering long/short positions and setting the stop-loss strictly at the low/high of the entry candle.
  * **Expectancy Optimization:** When optimizing the strategy, target the expectancy metric ($E = (\text{Win Rate} \times \text{Avg Win}) - (\text{Loss Rate} \times \text{Avg Loss})$) to maximize the average profit per trade.
  * **Cross-References:** Link this concept to your other active trading notes like [[Ratio Trading]] and [[Strata Technique with Markov Chain Modeling]] to see how regime filters can enhance those models.

---
