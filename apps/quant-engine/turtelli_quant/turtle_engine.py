# ============================================================
# Turtelli 2.0 — Turtle Trading Engine (Core)
# ============================================================

"""
Deterministic Turtle Trading rules implementation.

This module contains the pure trading logic.
It is stateless — receives data, returns signals.
No I/O, no database, no network calls.

CRITICAL: This code is the source of truth for all trading decisions.
AI systems MUST NOT override or modify these rules.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_DOWN
from typing import List, Optional, Tuple
from enum import Enum


class TradeDirection(Enum):
    LONG = "LONG"
    SHORT = "SHORT"


class SignalStatus(Enum):
    DISCOVERED = "DISCOVERED"
    WATCHING = "WATCHING"
    ARMED = "ARMED"
    TRIGGERED = "TRIGGERED"
    OPEN = "OPEN"
    PYRAMID_1 = "PYRAMID_1"
    PYRAMID_2 = "PYRAMID_2"
    PYRAMID_3 = "PYRAMID_3"
    EXIT_PENDING = "EXIT_PENDING"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"
    INVALIDATED = "INVALIDATED"


@dataclass
class DailyBar:
    """Single daily OHLCV bar."""
    date: str  # YYYY-MM-DD
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int
    adjusted_close: Decimal


@dataclass
class DonchianChannel:
    """Donchian channel values for a given date."""
    date: str
    high: Decimal  # Upper channel (highest high)
    low: Decimal   # Lower channel (lowest low)
    period: int


@dataclass
class StrategyConfig:
    """Configuration for a Turtle strategy."""
    name: str
    display_name: str
    version: int
    
    # Entry
    entry_days: int  # Donchian channel period for entry
    exit_days: int   # Donchian channel period for exit
    previous_winner_filter: bool = False
    
    # ATR
    atr_period: int = 20
    
    # Risk
    stop_n: Decimal = Decimal("2.0")
    pyramid_interval_n: Decimal = Decimal("0.5")
    max_units: int = 4
    unit_risk_percent: Decimal = Decimal("0.01")
    max_portfolio_risk_percent: Decimal = Decimal("0.04")


@dataclass
class ATRResult:
    """ATR calculation result."""
    date: str
    atr: Decimal
    period: int


@dataclass
class SignalResult:
    """Result of signal calculation for a single instrument."""
    symbol: str
    direction: TradeDirection
    status: SignalStatus
    strategy_name: str
    strategy_version: int
    
    # Breakout levels
    breakout_level: Decimal
    exit_level: Decimal
    
    # ATR / N
    atr: Decimal
    n_value: Decimal
    
    # Risk
    initial_stop: Decimal
    stop_distance: Decimal
    
    # Current state
    current_price: Decimal
    distance_percent: Decimal
    distance_atr: Decimal
    
    # Metadata
    calculation_date: str
    bar_count: int


def calculate_donchian_channel(
    bars: List[DailyBar],
    period: int,
    current_date: str,
) -> Optional[DonchianChannel]:
    """
    Calculate Donchian channel high/low for a given period.
    
    CRITICAL ANTI-LOOKAHEAD RULE:
    Only uses bars UP TO AND INCLUDING the bar BEFORE current_date.
    The current day's prices are NOT included in channel calculation.
    
    Args:
        bars: List of daily bars, sorted by date ascending
        period: Channel period (e.g., 20 for System 1)
        current_date: The date we're calculating for
        
    Returns:
        DonchianChannel with high/low or None if insufficient data
    """
    if len(bars) < period:
        return None
    
    # Filter to bars BEFORE current_date (anti-lookahead)
    eligible_bars = [b for b in bars if b.date < current_date]
    
    if len(eligible_bars) < period:
        return None
    
    # Take the last `period` bars
    period_bars = eligible_bars[-period:]
    
    # Find highest high and lowest low
    highest_high = max(b.high for b in period_bars)
    lowest_low = min(b.low for b in period_bars)
    
    return DonchianChannel(
        date=current_date,
        high=highest_high,
        low=lowest_low,
        period=period,
    )


def calculate_atr(
    bars: List[DailyBar],
    period: int = 20,
    current_date: str = "",
) -> Optional[Decimal]:
    """
    Calculate Average True Range using Wilder's smoothing.
    
    CRITICAL ANTI-LOOKAHEAD RULE:
    Only uses completed bars before current_date.
    
    True Range = max(
        high - low,
        abs(high - previous_close),
        abs(low - previous_close)
    )
    
    ATR = (previous_ATR * (period - 1) + current_TR) / period
    
    Args:
        bars: List of daily bars, sorted by date ascending
        period: ATR period (default 20)
        current_date: Date we're calculating for
        
    Returns:
        ATR value or None if insufficient data
    """
    if len(bars) < period + 1:
        return None
    
    # Filter to bars BEFORE current_date (anti-lookahead)
    eligible_bars = [b for b in bars if b.date < current_date]
    
    if len(eligible_bars) < period + 1:
        return None
    
    # Calculate True Range for each bar
    true_ranges: List[Decimal] = []
    for i in range(1, len(eligible_bars)):
        bar = eligible_bars[i]
        prev_bar = eligible_bars[i - 1]
        
        tr = max(
            bar.high - bar.low,
            abs(bar.high - prev_bar.close),
            abs(bar.low - prev_bar.close),
        )
        true_ranges.append(tr)
    
    # Initial ATR = simple average of first `period` true ranges
    initial_atr = sum(true_ranges[:period]) / period
    
    # Wilder's smoothing for subsequent values
    atr = initial_atr
    for tr in true_ranges[period:]:
        atr = (atr * (period - 1) + tr) / period
    
    return atr  # type: ignore[return-value]


def calculate_position_size(
    equity: Decimal,
    risk_percent: Decimal,
    atr: Decimal,
    stop_n: Decimal,
    current_price: Decimal,
    allow_fractional: bool = False,
    min_quantity: Decimal = Decimal("1"),
) -> Decimal:
    """
    Calculate position size based on volatility-adjusted risk.
    
    Unit size = (equity × risk_percent) / (N × dollar_per_point)
    
    For stocks: dollar_per_point = 1 (1 point = $1 movement per share)
    
    Args:
        equity: Current portfolio equity
        risk_percent: Risk per trade (e.g., 0.01 = 1%)
        atr: Current ATR value (N)
        stop_n: Stop distance in N units
        current_price: Current price
        allow_fractional: Whether fractional shares are allowed
        min_quantity: Minimum tradable quantity
        
    Returns:
        Number of shares to trade
    """
    if atr <= 0 or current_price <= 0 or equity <= 0:
        return Decimal("0")
    
    # Risk amount in dollars
    risk_amount = equity * risk_percent
    
    # Risk per share (stop distance in dollars)
    risk_per_share = atr * stop_n
    
    if risk_per_share <= 0:
        return Decimal("0")
    
    # Calculate raw quantity
    raw_quantity = risk_amount / risk_per_share
    
    # Check if we can afford the position
    total_cost = raw_quantity * current_price
    if total_cost > equity:
        raw_quantity = equity / current_price
    
    # Apply rounding
    if allow_fractional:
        # Round to 4 decimal places for fractional
        quantity = raw_quantity.quantize(Decimal("0.0001"), rounding=ROUND_DOWN)
    else:
        # Round down to whole shares
        quantity = raw_quantity.to_integral_value(rounding=ROUND_DOWN)
    
    # Enforce minimum
    if quantity < min_quantity:
        quantity = Decimal("0")
    
    return quantity


def calculate_initial_stop(
    entry_price: Decimal,
    direction: TradeDirection,
    atr: Decimal,
    stop_n: Decimal = Decimal("2.0"),
) -> Decimal:
    """
    Calculate initial stop loss.
    
    LONG: entry - (stop_n × ATR)
    SHORT: entry + (stop_n × ATR)
    
    Args:
        entry_price: Entry price
        direction: LONG or SHORT
        atr: Current ATR value
        stop_n: Stop distance in N units
        
    Returns:
        Stop loss price
    """
    stop_distance = atr * stop_n
    
    if direction == TradeDirection.LONG:
        return entry_price - stop_distance
    else:
        return entry_price + stop_distance


def calculate_pyramid_entry(
    base_entry: Decimal,
    unit_number: int,
    atr: Decimal,
    interval_n: Decimal = Decimal("0.5"),
    direction: TradeDirection = TradeDirection.LONG,
) -> Decimal:
    """
    Calculate pyramid entry price.
    
    LONG: base_entry + (unit_number × interval_n × ATR)
    SHORT: base_entry - (unit_number × interval_n × ATR)
    
    Args:
        base_entry: Original entry price
        unit_number: Which unit (1, 2, 3, 4)
        atr: Current ATR value
        interval_n: Pyramid interval in N units
        direction: LONG or SHORT
        
    Returns:
        Pyramid entry price
    """
    pyramid_offset = Decimal(str(unit_number)) * interval_n * atr
    
    if direction == TradeDirection.LONG:
        return base_entry + pyramid_offset
    else:
        return base_entry - pyramid_offset


def check_breakout(
    channel: DonchianChannel,
    direction: TradeDirection,
    current_bar: DailyBar,
) -> bool:
    """
    Check if a breakout has occurred.
    
    CRITICAL: Requires CLOSE above/below channel (not just intraday touch).
    
    LONG breakout: close > channel upper
    SHORT breakout: close < channel lower
    
    Args:
        channel: Donchian channel
        direction: Expected direction
        current_bar: Today's bar (to check close)
        
    Returns:
        True if breakout occurred
    """
    if direction == TradeDirection.LONG:
        return current_bar.close > channel.high
    else:
        return current_bar.close < channel.low


def check_exit(
    exit_channel: DonchianChannel,
    position_direction: TradeDirection,
    current_bar: DailyBar,
) -> bool:
    """
    Check if exit signal has occurred.
    
    LONG exit: close < exit channel lower
    SHORT exit: close > exit channel upper
    
    Args:
        exit_channel: Exit Donchian channel
        position_direction: Direction of open position
        current_bar: Today's bar
        
    Returns:
        True if exit signal
    """
    if position_direction == TradeDirection.LONG:
        return current_bar.close < exit_channel.low
    else:
        return current_bar.close > exit_channel.high


def calculate_stop_update(
    current_stop: Decimal,
    new_stop: Decimal,
    direction: TradeDirection,
) -> Decimal:
    """
    Update stop loss — stops only move in the direction of the trade.
    
    LONG: stop can only go UP (tighter)
    SHORT: stop can only go DOWN (tighter)
    
    Args:
        current_stop: Current stop level
        new_stop: Proposed new stop level
        direction: Position direction
        
    Returns:
        Updated stop level (never worse than current)
    """
    if direction == TradeDirection.LONG:
        # Stop can only go up (tighter)
        return max(current_stop, new_stop)
    else:
        # Stop can only go down (tighter)
        return min(current_stop, new_stop)


def detect_near_breakout(
    current_price: Decimal,
    channel_upper: Decimal,
    channel_lower: Decimal,
    atr: Decimal,
    threshold_percent: Decimal = Decimal("0.02"),
    threshold_atr: Decimal = Decimal("0.5"),
) -> Optional[Tuple[TradeDirection, Decimal, Decimal]]:
    """
    Detect if an instrument is near a breakout.
    
    Returns:
        Tuple of (direction, distance_percent, distance_atr) or None
    """
    if current_price <= 0 or atr <= 0:
        return None
    
    # Check LONG proximity
    distance_to_upper = (channel_upper - current_price) / current_price
    if distance_to_upper <= threshold_percent and distance_to_upper >= 0:
        distance_atr = (channel_upper - current_price) / atr
        if distance_atr <= threshold_atr:
            return (TradeDirection.LONG, distance_to_upper, distance_atr)
    
    # Check SHORT proximity
    distance_to_lower = (current_price - channel_lower) / current_price
    if distance_to_lower <= threshold_percent and distance_to_lower >= 0:
        distance_atr = (current_price - channel_lower) / atr
        if distance_atr <= threshold_atr:
            return (TradeDirection.SHORT, distance_to_lower, distance_atr)
    
    return None
