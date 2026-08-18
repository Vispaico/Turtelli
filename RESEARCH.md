# Turtelli 2.0 — Research

## Overview

Turtelli maintains a research layer that uses AI/ML to enhance (but never replace) the deterministic Turtle Trading engine.

## Research Components

### 1. TimesFM Forecasts
Google's time-series foundation model for market predictions.
- See [TIMESFM.md](./TIMESFM.md) for details

### 2. Market Regime Classification
Classifies market conditions to provide context for trades.
- See below

### 3. Browser Research Agents
Collects contextual information about instruments.
- Earnings dates
- SEC filings
- Market news
- Economic calendars

## Market Regime Classification

### Regimes
- **TRENDING_UP**: Strong upward price movement
- **TRENDING_DOWN**: Strong downward price movement
- **RANGEBOUND**: Sideways price action
- **VOLATILITY_EXPANSION**: Increasing volatility
- **VOLATILITY_CONTRACTION**: Decreasing volatility
- **TRANSITION**: Changing between regimes

### Implementation
- Initially for analytics only
- Measure whether regimes affect Turtle outcomes
- Only influence strategy decisions after proven value

### Data Sources
- Price action (returns, volatility)
- Volume patterns
- Breadth indicators
- Sector rotation

## Research Dataset

For every Turtle opportunity, store:
- Instrument and timestamp
- Direction and system
- Breakout level and ATR
- Volume and volatility
- Market regime
- TimesFM outputs
- Entry, stop, exit levels
- Trade duration
- MFE (Maximum Favorable Excursion)
- MAE (Maximum Adverse Excursion)
- Maximum drawdown
- Final return
- Whether pyramiding occurred

### Data Integrity
- Never contaminate training data with future information
- Version all model inputs
- Maintain reproducible experiments
- Document methodology changes

## AI Score

Turtelli may generate an AI Score (0-100) combining:
- Turtle signal strength
- TimesFM forecast
- Market regime
- Volume confirmation

**This score is informational only and never represents certainty.**

## Experiments

All research experiments are documented:
- Hypothesis
- Methodology
- Results
- Conclusions

Stored in `ResearchExperiment` table with full audit trail.
