# ============================================================
# Turtelli 2.0 — Market Data Validation
# ============================================================

"""
Market data validation rules.

Every bar received from a provider is validated before use.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional
from .turtle_engine import DailyBar


@dataclass
class ValidationResult:
    """Result of data validation."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    validation_type: str


def validate_daily_bar(
    bar: DailyBar,
    previous_bar: Optional[DailyBar] = None,
    max_daily_move_percent: Decimal = Decimal("0.50"),
    min_volume: int = 100_000,
) -> ValidationResult:
    """
    Validate a single daily bar.
    
    Checks:
    - High >= Low
    - High >= Open, High >= Close
    - Low <= Open, Low <= Close
    - Volume >= 0
    - Price > 0
    - Not zero values
    - Abnormal daily moves
    """
    errors = []
    warnings = []
    
    # Basic price validation
    if bar.high < bar.low:
        errors.append(f"High ({bar.high}) < Low ({bar.low})")
    
    if bar.high < bar.open:
        errors.append(f"High ({bar.high}) < Open ({bar.open})")
    
    if bar.high < bar.close:
        errors.append(f"High ({bar.high}) < Close ({bar.close})")
    
    if bar.low > bar.open:
        errors.append(f"Low ({bar.low}) > Open ({bar.open})")
    
    if bar.low > bar.close:
        errors.append(f"Low ({bar.low}) > Close ({bar.close})")
    
    # Zero value checks
    if bar.high <= 0:
        errors.append(f"High ({bar.high}) <= 0")
    
    if bar.low <= 0:
        errors.append(f"Low ({bar.low}) <= 0")
    
    if bar.open <= 0:
        errors.append(f"Open ({bar.open}) <= 0")
    
    if bar.close <= 0:
        errors.append(f"Close ({bar.close}) <= 0")
    
    if bar.volume < 0:
        errors.append(f"Volume ({bar.volume}) < 0")
    
    # Volume warning
    if bar.volume < min_volume:
        warnings.append(f"Low volume: {bar.volume} (min: {min_volume})")
    
    # Abnormal move check
    if previous_bar and previous_bar.close > 0:
        daily_return = abs(bar.close - previous_bar.close) / previous_bar.close
        if daily_return > max_daily_move_percent:
            warnings.append(
                f"Abnormal daily move: {daily_return:.2%} "
                f"(max: {max_daily_move_percent:.2%})"
            )
    
    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        validation_type="daily_bar",
    )


def validate_bar_sequence(
    bars: List[DailyBar],
    expected_trading_days: Optional[List[str]] = None,
) -> ValidationResult:
    """
    Validate a sequence of bars.
    
    Checks:
    - No duplicate dates
    - Chronological order
    - Missing sessions (if expected dates provided)
    - Consistent data
    """
    errors = []
    warnings = []
    
    if not bars:
        errors.append("Empty bar sequence")
        return ValidationResult(
            is_valid=False,
            errors=errors,
            warnings=warnings,
            validation_type="bar_sequence",
        )
    
    # Check for duplicates
    dates = [b.date for b in bars]
    unique_dates = set(dates)
    if len(dates) != len(unique_dates):
        duplicates = [d for d in dates if dates.count(d) > 1]
        errors.append(f"Duplicate dates found: {set(duplicates)}")
    
    # Check chronological order
    for i in range(1, len(bars)):
        if bars[i].date <= bars[i - 1].date:
            errors.append(
                f"Non-chronological order: {bars[i].date} <= {bars[i-1].date}"
            )
    
    # Check for missing sessions
    if expected_trading_days:
        bar_dates = set(dates)
        missing = set(expected_trading_days) - bar_dates
        if missing:
            warnings.append(f"Missing sessions: {sorted(missing)[:5]}...")
    
    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        validation_type="bar_sequence",
    )


def validate_atr_reasonability(
    atr: Decimal,
    current_price: Decimal,
    min_atr_percent: Decimal = Decimal("0.005"),  # 0.5%
    max_atr_percent: Decimal = Decimal("0.20"),    # 20%
) -> ValidationResult:
    """
    Validate that ATR is reasonable relative to price.
    
    ATR should be between 0.5% and 20% of price for most stocks.
    """
    errors = []
    warnings = []
    
    if atr <= 0:
        errors.append(f"ATR ({atr}) <= 0")
        return ValidationResult(
            is_valid=False,
            errors=errors,
            warnings=warnings,
            validation_type="atr_reasonability",
        )
    
    if current_price <= 0:
        errors.append(f"Price ({current_price}) <= 0")
        return ValidationResult(
            is_valid=False,
            errors=errors,
            warnings=warnings,
            validation_type="atr_reasonability",
        )
    
    atr_percent = atr / current_price
    
    if atr_percent < min_atr_percent:
        warnings.append(
            f"ATR very low: {atr_percent:.4%} of price "
            f"(min: {min_atr_percent:.4%})"
        )
    
    if atr_percent > max_atr_percent:
        warnings.append(
            f"ATR very high: {atr_percent:.4%} of price "
            f"(max: {max_atr_percent:.4%})"
        )
    
    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        validation_type="atr_reasonability",
    )
