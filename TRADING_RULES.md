# Turtelli 2.0 — Trading Rules

## Overview

Turtelli implements the Turtle Trading methodology as described by Curtis Faith in "Way of the Turtle" and the original rules developed by Richard Dennis and William Eckhardt.

All rules are **deterministic** — no AI, LLM, or human discretion is involved in trade decisions.

---

## System 1: Short-Term Breakouts

### Entry
- **Channel Period**: 20 trading days
- **Entry Trigger**: Price breaks above the 20-day high (LONG) or below the 20-day low (SHORT)
- **Previous Winner Filter**: If the previous System 1 trade in this instrument was a winner, skip the signal

### Exit
- **Exit Channel Period**: 10 trading days
- **Exit Trigger**: Price breaks below the 10-day low (for LONG) or above the 10-day high (for SHORT)

### ATR / N
- **Period**: 20 days
- **Smoothing**: Wilder's method (standard Turtle)
- **Calculation**: `ATR = (previous_ATR × 13 + current_TR) / 14`

Where `TR` (True Range) = `max(high - low, abs(high - prev_close), abs(low - prev_close))`

---

## System 2: Long-Term Breakouts

### Entry
- **Channel Period**: 55 trading days
- **Entry Trigger**: Price breaks above the 55-day high (LONG) or below the 55-day low (SHORT)
- **Previous Winner Filter**: Disabled (always take the trade)

### Exit
- **Exit Channel Period**: 20 trading days
- **Exit Trigger**: Price breaks below the 20-day low (for LONG) or above the 20-day high (for SHORT)

---

## Position Sizing

### Unit Calculation
```
unit_size = (equity × risk_percent) / (N × dollar_per_point)
```

Where:
- `equity` = current portfolio equity
- `risk_percent` = 1% per unit (configurable)
- `N` = ATR value
- `dollar_per_point` = 1 for stocks/ETFs (1 point = $1)

### Example (Turtelli Standard)
```
Equity: $10,000
Risk: 1% = $100
N (ATR): $5.00
Unit size: $100 / $5.00 = 20 shares
```

### Example (Turtelli Micro)
```
Equity: $600
Risk: 1% = $6
N (ATR): $5.00
Unit size: $6 / $5.00 = 1.2 shares → 1 share (if fractional disabled)
```

---

## Stop Losses

### Initial Stop
```
LONG: entry_price - (2 × N)
SHORT: entry_price + (2 × N)
```

### Stop Updates
- Stops only move in the direction of the trade (never widen)
- On pyramid additions, stop is adjusted to maintain 2N from the most recent entry

---

## Pyramiding

### Rules
- Maximum 4 units per position
- Each additional unit: add at entry + (0.5 × N × unit_number)
- Each unit is the same size (same risk per unit)

### Example (LONG, N = $5.00)
```
Unit 1: Entry at $100.00, Stop at $90.00 (2N below)
Unit 2: Entry at $102.50 (entry + 0.5N), Stop at $92.50
Unit 3: Entry at $105.00 (entry + 1.0N), Stop at $95.00
Unit 4: Entry at $107.50 (entry + 1.5N), Stop at $97.50
```

### Portfolio Constraints
- **Turtelli Micro**: Max 3 pyramids (limited capital)
- **Turtelli Standard**: Max 4 pyramids (full system)

---

## Risk Management

### Per-Trade Risk
- Maximum 1% of equity per unit
- Maximum 4% total portfolio risk across all positions

### Correlation Limits
- Maximum positions in same sector: configurable (default 2-3)
- Maximum total positions: configurable (default 6-12)

### Portfolio-Specific Rules

| Setting | Micro ($600) | Standard ($10,000) |
|---------|-------------|-------------------|
| Initial Equity | $600 | $10,000 |
| Risk Per Trade | 2% | 2% |
| Max Correlated | 2 | 3 |
| Max Positions | 6 | 12 |
| Fractional | No | Yes |
| Commission | $0 | $0 |
| Slippage | 0.1% | 0.1% |

---

## Anti-Lookahead Rules

### Critical Constraints
1. **Channel Calculation**: Today's channel uses bars up to and including yesterday's close only
2. **ATR Calculation**: Uses completed bars only
3. **Breakout Confirmation**: Requires close above/below channel (not just intraday touch)
4. **Stop Calculation**: Uses entry price, not future prices
5. **Position Sizing**: Uses equity at time of signal, not future equity

### Testing
- Automated tests verify no future data leakage
- Backtesting uses point-in-time data reconstruction
- Daily scan tests verify data cutoff timing

---

## Signal Lifecycle States

```
DISCOVERED → WATCHING → ARMED → TRIGGERED → OPEN
                                                ↓
                                        PYRAMID_1 → PYRAMID_2 → PYRAMID_3
                                                ↓
                                        EXIT_PENDING → CLOSED

Any state → CANCELLED
Any state → INVALIDATED
```

### State Definitions
- **DISCOVERED**: Instrument identified as potential opportunity
- **WATCHING**: Approaching breakout level (within 2%)
- **ARMED**: Breakout level set, waiting for price trigger
- **TRIGGERED**: Price has broken out
- **OPEN**: Position opened
- **PYRAMID_N**: Nth pyramid unit added
- **EXIT_PENDING**: Exit signal generated (opposite channel break)
- **CLOSED**: Position fully closed
- **CANCELLED**: Signal cancelled by user or system
- **INVALIDATED**: Signal no longer valid (data correction, etc.)

---

## Corporate Action Handling

### Stock Splits
- Recalculate all historical prices and levels
- Adjust entry prices, stops, and channel levels
- Record adjustment event in ledger

### Dividends
- Do NOT adjust entry prices for dividends
- Dividends are captured as cash in portfolio
- Channel calculations use adjusted prices

### Delistings
- Force-close any open positions
- Record as forced exit with reason "delisting"
- Update instrument status to inactive

---

## Configuration

All rules are configurable via `packages/strategy-config/src/turtle-defaults.json`.

Example override for custom System 1:
```json
{
  "name": "turtle_system_1_custom",
  "entry": {
    "entryDays": 25,
    "exitDays": 12,
    "previousWinnerFilter": false
  },
  "risk": {
    "stopN": 2.5,
    "maxUnits": 3
  }
}
```

**Never hardcode magic constants in strategy code.**
