# Markov Chain Trading Strategy Design

This document outlines the design, mathematical formulation, performance metrics, and implementation plan for a first-order Markov Chain trading strategy. The results will be presented in an interactive Jupyter Notebook.

---

## 1. Goal & Objectives
The goal of this project is to build a mathematical trading system using a **first-order Markov Chain** to predict daily equity return regimes (Down, Neutral, Up) and generate Long/Short/Cash trading signals. 

### Core Features:
- **Volatility-Adjusted States**: Price return regimes are defined dynamically using a 14-period Average True Range (ATR14).
- **Rolling Matrix Estimation**: Transition probabilities are calculated on a rolling window to adapt to shifting market regimes.
- **Backtesting Engine**: Simulates the strategy, comparing it directly to a Buy-and-Hold benchmark while accounting for transaction costs.
- **Premium Visualizations**: Interactive parameters via Jupyter widgets, Heatmaps, Drawdown charts, and Volatility overlays.

---

## 2. Mathematical Formulation

### 2.1 State Space Definition
Let $R_t$ be the close-to-close daily return of the stock at day $t$:
$$R_t = \frac{\text{Close}_t - \text{Close}_{t-1}}{\text{Close}_{t-1}}$$

Let $\text{ATR}_{14, t}\%$ be the 14-period Average True Range normalized by the closing price:
$$\text{ATR}_{14, t}\% = \frac{\text{ATR}_{14, t}}{\text{Close}_t}$$

We define the threshold boundary at day $t$ using multiplier $k = 0.2$:
$$T_t = 0.2 \times \text{ATR}_{14, t}\%$$

The daily state $S_t \in \{0, 1, 2\}$ is classified as:
*   **State 0 (Down)**: $R_t < -T_t$
*   **State 1 (Neutral)**: $-T_t \le R_t \le T_t$
*   **State 2 (Up)**: $R_t > T_t$

### 2.2 Transition Probability Matrix Estimation
For each day $t$, we estimate a $3 \times 3$ transition probability matrix $P^{(t)}$ using a rolling lookback window of size $W = 252$ trading days.
Let $C_{ij}$ be the count of transitions from state $i$ to state $j$ in the sequence $S_{t-W+1}, \dots, S_t$:
$$C_{ij} = \sum_{\tau=t-W+2}^{t} \mathbb{I}(S_{\tau-1} = i \text{ and } S_{\tau} = j)$$

The transition probability $P_{ij}^{(t)}$ is:
$$P_{ij}^{(t)} = \frac{C_{ij}}{\sum_{m=0}^{2} C_{im}}$$

If state $i$ never occurred in the lookback window ($\sum_{m} C_{im} = 0$), we assign a uniform distribution to represent maximum uncertainty:
$$P_{ij}^{(t)} = \frac{1}{3} \quad \text{for } j \in \{0, 1, 2\}$$

### 2.3 Signal Generation (Long/Short)
At the close of day $t$, we observe the current state $S_t$ and predict tomorrow's state $j^*$ using the row $S_t$ of $P^{(t)}$:
$$j^* = \arg\max_{j \in \{0, 1, 2\}} P_{S_t, j}^{(t)}$$

The trading signal for tomorrow's trade (decided at close of day $t$, executed on day $t+1$) is:
$$\text{Signal}_t = \begin{cases} 
1 & \text{if } j^* = 2 \text{ (Up)} \\
-1 & \text{if } j^* = 0 \text{ (Down)} \\
0 & \text{if } j^* = 1 \text{ (Neutral)}
\end{cases}$$

### 2.4 Performance and Backtest returns
The strategy return on day $t+1$ is:
$$R_{\text{raw}, t+1} = \text{Signal}_t \times R_{t+1}$$

To account for commission and slippage, we apply transaction cost $C_{\text{cost}} = 0.05\%$ (5 basis points) per trade:
$$\text{Cost}_{t+1} = C_{\text{cost}} \times |\text{Signal}_t - \text{Signal}_{t-1}|$$
$$R_{\text{strategy}, t+1} = R_{\text{raw}, t+1} - \text{Cost}_{t+1}$$

---

## 3. Architecture & File Structure

All code is contained within a self-contained, modularly structured Jupyter Notebook and a requirements file:
```
markov-trading-strategy/
├── requirements.txt
└── markov_chain_trading.ipynb
```

### Notebook Outline & Cell Structure:
1.  **Imports & Dependencies**: Standard library imports, `yfinance`, `pandas`, `numpy`, `matplotlib`, `seaborn`, `ipywidgets`.
2.  **Data Acquisition & Feature Engineering**: 
    *   Helper function `load_and_prepare_data(ticker, start, end)`
    *   Calculates daily returns, ATR14, ATR%, and thresholds.
    *   Classifies states.
3.  **Markov Chain Model**:
    *   Helper function `calculate_rolling_transition_matrices(states, window_size)`
    *   Outputs transition matrices and next-day predicted states.
4.  **Backtest Engine**:
    *   Function `run_backtest(data, signals, cost=0.0005)`
    *   Computes returns, transaction costs, and portfolio values.
5.  **Metrics Calculator**:
    *   Function `calculate_performance_metrics(strategy_returns, benchmark_returns)`
    *   Calculates Cumulative Return, Annualized Sharpe Ratio, Max Drawdown, Win Rate, and Profit Factor.
6.  **Interactive Sandbox & Visualizations**:
    *   An interactive widget combining parameter configuration (Lookback Window, ATR Multiplier, Ticker, Date Range) with real-time chart updates.

---

## 4. Visualizations

The notebook will display 4 primary figures:
1.  **Price & Regime Boundaries**: Time-series plot of the asset price with shaded regions highlighting the "Down" (red), "Neutral" (gray), and "Up" (green) regimes.
2.  **Transition Probability Heatmap**: $3 \times 3$ matrix showing the mean transition probability.
3.  **Rolling Transition Probabilities**: Line plot showing rolling probabilities $P(\text{Up}|\text{Up})$ and $P(\text{Down}|\text{Down})$ to visualize structural shifts.
4.  **Equity Curve & Drawdowns**:
    *   Cumulative returns of the strategy vs. Buy-and-Hold.
    *   Rolling drawdown profile (percentage drop from peak).

---

## 5. Verification Plan

We will programmatically verify the correctness of the model and backtester via assertion tests in the notebook:

### 5.1 Automated Invariant Checks:
- **Matrix Row Sums**:
  $$\text{Assert } \left| \sum_{j} P_{ij}^{(t)} - 1.0 \right| < 10^{-7} \quad \forall i, t$$
- **Lookahead Bias Prevention**:
  *   Confirm that `Signal_t` is indexed to day $t$ and multiplied by `Return_t+1`.
  *   Assert that `Signal_t` only uses data from the window $[t-W+1, t]$.
- **State Classification Bound Test**:
  *   Confirm that any day marked State 2 has return $> T_t$, and State 0 has return $< -T_t$.

### 5.2 Performance Benchmarking:
- Compare results against a known control dataset (e.g. constant trend or random walk) to verify the logic performs exactly as expected.

---

## 6. Definition of Success
The project is successful when the Jupyter notebook runs end-to-end without errors, passes all mathematical assertions, and produces interactive visualizations and performance tables comparing the Markov Chain model to the Buy-and-Hold benchmark.
