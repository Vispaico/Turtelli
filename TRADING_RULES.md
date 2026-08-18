# Turtelli 2.0 — Trading Rules (Exact Assumptions)

## Overview

This document contains the EXACT rules implemented in the Turtelli quantitative engine. Every assumption is documented here. These rules are deterministic — no AI, LLM, or human discretion is involved.

---

## Donchian Channel Calculation

### Formula
```
Channel High = MAX(high[i] for i in range(current_date - period, current_date))
Channel Low = MIN(low[i] for i in range(current_date - period, current_date))
```

### Anti-Lookahead Rule
- Only uses bars with date **strictly less than** `current_date`
- The current day's prices are **NEVER** included in channel calculation
- This prevents using future information

### Boundary Conditions
- With exactly `period` bars before `current_date`: channel is calculable
- With `period - 1` bars: returns `None` (insufficient data)
- Duplicate dates on the same day are both included in eligible bars

---

## ATR (Average True Range) Calculation

### True Range Formula
```
TR[i] = MAX(
    high[i] - low[i],
    ABS(high[i] - close[i-1]),
    ABS(low[i] - close[i-1])
)
```

### Wilder's Smoothing
```
Initial ATR = SUM(TR[1:period+1]) / period
ATR[i] = (ATR[i-1] * (period - 1) + TR[i]) / period
```

### Anti-Lookahead Rule
- Only uses bars with date **strictly less than** `current_date`
- Requires `period + 1` bars minimum (first bar has no previous close)
- With exactly `period + 1` bars: ATR is calculable
- With `period` bars: returns `None` (insufficient data)

---

## System 1 (Short-Term)

### Entry
- **Channel Period**: 20 trading days
- **Entry Trigger**: Close **strictly greater than** 20-day high
- **Previous Winner Filter**: If previous System 1 trade in same instrument was a winner, skip

### Exit
- **Exit Channel Period**: 10 trading days
- **Exit Trigger**: Close **strictly less than** 10-day low

---

## System 2 (Long-Term)

### Entry
- **Channel Period**: 55 trading days
- **Entry Trigger**: Close **strictly greater than** 55-day high
- **Previous Winner Filter**: Disabled (always take the trade)

### Exit
- **Exit Channel Period**: 20 trading days
- **Exit Trigger**: Close **strictly less than** 20-day low

---

## Position Sizing

### Formula
```
Unit Size = (Equity × Risk%) / (N × Dollar_Per_Point)
```

Where:
- `Equity` = current portfolio equity
- `Risk%` = 1% per unit (configurable)
- `N` = ATR value
- `Dollar_Per_Point` = 1 (for stocks/ETFs)

### Constraints
- If calculated quantity exceeds available equity, reduce to what we can afford
- Fractional shares: round to 4 decimal places (ROUND_DOWN)
- Whole shares: round down to nearest integer
- If quantity < `min_quantity`, return 0

---

## Stop Losses

### Initial Stop
```
LONG: entry_price - (stop_n × ATR)
SHORT: entry_price + (stop_n × ATR)
```

### Stop Updates
- Stops **only move** in the direction of the trade (never loosen)
- LONG: stop can only go UP (tighter)
- SHORT: stop can only go DOWN (tighter)

---

## Pyramiding

### Entry Prices
```
LONG: base_entry + (unit_number × interval_n × ATR)
SHORT: base_entry - (unit_number × interval_n × ATR)
```

### Default Configuration
- `interval_n` = 0.5
- `max_units` = 4

### Example (LONG, base=$100, ATR=$5)
```
Unit 1: $100 + (1 × 0.5 × $5) = $102.50
Unit 2: $100 + (2 × 0.5 × $5) = $105.00
Unit 3: $100 + (3 × 0.5 × $5) = $107.50
Unit 4: $100 + (4 × 0.5 × $5) = $110.00
```

---

## Breakout Detection

### Rules
- **LONG breakout**: Close **strictly greater than** channel high
- **SHORT breakout**: Close **strictly less than** channel low
- Close **exactly at** channel level = **NO** breakout (must exceed)

### Near-Breakout Detection
- Within `threshold_percent` (default 2%) of breakout level
- Within `threshold_atr` (default 0.5 ATR units) of breakout level
- Returns `None` if price or ATR is zero

---

## Exit Detection

### Rules
- **LONG exit**: Close **strictly less than** exit channel low
- **SHORT exit**: Close **strictly greater than** exit channel high

---

## Portfolio Configuration

### Turtelli Micro ($600)
```json
{
  "initialEquity": 600,
  "maxRiskPerTrade": 0.02,
  "maxCorrelatedPositions": 2,
  "maxTotalPositions": 6,
  "allowFractional": false,
  "commission": 0,
  "slippage": 0.001
}
```

### Turtelli Standard ($10,000)
```json
{
  "initialEquity": 10000,
  "maxRiskPerTrade": 0.02,
  "maxCorrelatedPositions": 3,
  "maxTotalPositions": 12,
  "allowFractional": true,
  "commission": 0,
  "slippage": 0.001
}
```

---

## Data Validation Rules

### Daily Bar Validation
- High must be ≥ Low
- High must be ≥ Open and Close
- Low must be ≤ Open and Close
- All prices must be > 0
- Volume must be ≥ 0
- Low volume warning (configurable threshold)
- Abnormal daily move warning (configurable threshold)

### Bar Sequence Validation
- No duplicate dates
- Chronological order required
- Missing sessions generate warnings

### ATR Reasonability
- ATR should be between 0.5% and 20% of price
- Zero ATR is invalid

---

## Key Design Decisions

1. **Close-based breakouts**: Must close above/below, not just intraday touch
2. **Anti-loookahead**: All calculations use only data available before current_date
3. **Strict inequalities**: Breakouts require exceeding, not touching, channel levels
4. **Stops never loosen**: Only tighten in direction of trade
5. **Deterministic**: No randomness, no discretion, no AI involvement in trade decisions

---

## Test Coverage

The quantitative engine has 66 tests covering:
- Donchian channel calculation
- ATR calculation
- Position sizing
- Stop loss calculation
- Pyramid entry calculation
- Breakout detection
- Exit detection
- Near-breakout detection
- Off-by-one errors
- Missing candles
- Duplicate candles
- Price gaps
- Timezone handling
- Integration tests

All tests use handcrafted fixtures with known correct answers.
