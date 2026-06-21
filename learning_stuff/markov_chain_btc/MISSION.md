# Mission: Markov Chain Bitcoin Trading

## Why
Build and backtest a Python-based Markovian model (Markov Chain / Hidden Markov Model) to identify market regimes in Bitcoin price dynamics, with the goal of developing a systematic trading strategy that improves win rate and risk-adjusted returns relative to buy-and-hold.

## Success looks like
- [ ] Explain the mathematical difference between discrete Markov Chains (first-order transitions) and Hidden Markov Models (HMM) applied to financial returns.
- [ ] Write a clean, type-safe Python script/notebook that ingests historical BTC/USD data and fits transition probabilities.
- [ ] Backtest a regime-switching strategy (e.g. trading only in bullish regimes or using different parameters for bull/bear regimes) and measure key metrics (Win Rate, Sharpe Ratio, Max Drawdown).
- [ ] Document transition matrices and model characteristics in a dedicated reference guide.

## Constraints
- **Simulation only:** Focused purely on backtesting and mathematical modeling; no live API execution or real-money risk.
- **Python-centric:** Standard quant libraries (`pandas`, `numpy`, `hmmlearn`, `backtesting.py`).

## Out of scope
- Live trading integration with crypto exchanges (Binance, Coinbase, etc.).
- Deep learning architectures (LSTMs, reinforcement learning) unless explicitly requested later.
