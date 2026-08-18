# Turtelli 2.0 — TimesFM Integration

## Overview

TimesFM is Google's time-series foundation model used as an optional research layer. It MUST NOT directly determine whether trades are executed.

## Integration Architecture

```
Turtle Engine (deterministic)
    ↓ generates signal
Signal Store
    ↓ copies features
TimesFM Worker (async)
    ↓ generates forecast
Forecast Store
    ↓ enriches signal
AI Score (informational only)
```

## Usage

### For Each Legitimate Signal
1. Capture model features BEFORE outcome is known
2. Run TimesFM forecast
3. Store forecast alongside signal
4. Later: compare forecast vs actual outcome
5. Build permanent research dataset

### Forecast Outputs
- Return distribution forecast
- Volatility forecast
- Range forecast (low/high)
- Uncertainty estimate
- Quantile forecasts (10%, 25%, 50%, 75%, 90%)
- Trend persistence indicator

## Experiments

### Turtle Classic
- Pure Turtle rules, no AI enhancement
- Baseline for comparison

### Turtle + TimesFM Ranking
- Use TimesFM to rank multiple simultaneous signals
- Allocate capital to highest-ranked

### Turtle + Regime Classification
- Filter signals based on market regime
- Only trade in favorable regimes

### Turtle + TimesFM + Regime
- Combined approach
- Full research dataset

## AI Score

Composed from:
- Signal strength (breakout distance, volume)
- TimesFM forecast confidence
- Market regime favorability
- Historical accuracy in similar conditions

Score range: 0-100
- 0-30: Low confidence
- 30-60: Moderate confidence
- 60-80: High confidence
- 80-100: Very high confidence

**Disclaimer**: This score is informational only. Past performance does not guarantee future results.

## Data Storage

Every forecast stores:
- Model version
- Input features (snapshot)
- Forecast values
- Confidence metrics
- Actual outcome (filled later)
- Resolution timestamp

This creates a permanent, versioned research dataset.
