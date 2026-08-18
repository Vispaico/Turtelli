# ============================================================
# Turtelli 2.0 — Turtle Engine Tests
# ============================================================

"""
Tests for the deterministic Turtle Trading engine.

CRITICAL: These tests verify anti-lookahead behavior.
"""

import pytest
from decimal import Decimal
from turtelli_quant.turtle_engine import (
    DailyBar,
    StrategyConfig,
    TradeDirection,
    SignalStatus,
    calculate_donchian_channel,
    calculate_atr,
    calculate_position_size,
    calculate_initial_stop,
    calculate_pyramid_entry,
    check_breakout,
    check_exit,
    calculate_stop_update,
    detect_near_breakout,
)


def create_bar(date: str, o: float, h: float, l: float, c: float, v: int = 100000) -> DailyBar:
    """Helper to create a DailyBar."""
    return DailyBar(
        date=date,
        open=Decimal(str(o)),
        high=Decimal(str(h)),
        low=Decimal(str(l)),
        close=Decimal(str(c)),
        volume=v,
        adjusted_close=Decimal(str(c)),
    )


class TestDonchianChannel:
    """Tests for Donchian channel calculation."""
    
    def test_basic_channel(self):
        """Test basic channel calculation."""
        bars = [create_bar(f"2026-01-{i:02d}", 100, 105, 95, 102) for i in range(1, 21)]
        channel = calculate_donchian_channel(bars, 20, "2026-01-21")
        assert channel is not None
        assert channel.high == Decimal("105")
        assert channel.low == Decimal("95")
    
    def test_anti_lookahead(self):
        """CRITICAL: Verify no lookahead bias."""
        bars = [create_bar(f"2026-01-{i:02d}", 100, 105, 95, 102) for i in range(1, 21)]
        # Add a bar with extreme values on the calculation date
        bars.append(create_bar("2026-01-21", 100, 200, 50, 150))
        
        channel = calculate_donchian_channel(bars, 20, "2026-01-21")
        # Channel should NOT include 2026-01-21's high/low
        assert channel.high == Decimal("105")
        assert channel.low == Decimal("95")
    
    def test_insufficient_data(self):
        """Test with insufficient bars."""
        bars = [create_bar(f"2026-01-{i:02d}", 100, 105, 95, 102) for i in range(1, 10)]
        channel = calculate_donchian_channel(bars, 20, "2026-01-10")
        assert channel is None


class TestATR:
    """Tests for ATR calculation."""
    
    def test_basic_atr(self):
        """Test basic ATR calculation."""
        bars = [create_bar(f"2026-01-{i:02d}", 100, 105, 95, 102) for i in range(1, 22)]
        atr = calculate_atr(bars, 20, "2026-01-21")
        assert atr is not None
        assert atr > 0
    
    def test_anti_lookahead(self):
        """CRITICAL: Verify ATR doesn't use future data."""
        bars = [create_bar(f"2026-01-{i:02d}", 100, 105, 95, 102) for i in range(1, 22)]
        # Add extreme bar on calculation date
        bars.append(create_bar("2026-01-21", 100, 200, 50, 150))
        
        atr_with_future = calculate_atr(bars, 20, "2026-01-22")
        # ATR should NOT include the extreme bar from 2026-01-21
        assert atr_with_future is not None
    
    def test_insufficient_data(self):
        """Test with insufficient bars."""
        bars = [create_bar(f"2026-01-{i:02d}", 100, 105, 95, 102) for i in range(1, 15)]
        atr = calculate_atr(bars, 20, "2026-01-15")
        assert atr is None


class TestPositionSize:
    """Tests for position sizing."""
    
    def test_basic_sizing(self):
        """Test basic position sizing."""
        quantity = calculate_position_size(
            equity=Decimal("10000"),
            risk_percent=Decimal("0.01"),
            atr=Decimal("5.00"),
            stop_n=Decimal("2.0"),
            current_price=Decimal("100.00"),
            allow_fractional=True,
        )
        # Risk = 10000 * 0.01 = 100
        # Risk per share = 5 * 2 = 10
        # Quantity = 100 / 10 = 10
        assert quantity == Decimal("10.0000")
    
    def test_whole_shares(self):
        """Test whole share rounding."""
        quantity = calculate_position_size(
            equity=Decimal("600"),
            risk_percent=Decimal("0.01"),
            atr=Decimal("5.00"),
            stop_n=Decimal("2.0"),
            current_price=Decimal("100.00"),
            allow_fractional=False,
        )
        # Risk = 600 * 0.01 = 6
        # Risk per share = 5 * 2 = 10
        # Quantity = 6 / 10 = 0.6 -> 0 (below min)
        assert quantity == Decimal("0")
    
    def test_affordability(self):
        """Test position doesn't exceed available capital."""
        quantity = calculate_position_size(
            equity=Decimal("1000"),
            risk_percent=Decimal("0.01"),
            atr=Decimal("5.00"),
            stop_n=Decimal("2.0"),
            current_price=Decimal("100.00"),
            allow_fractional=True,
        )
        # Risk = 1000 * 0.01 = 10
        # Risk per share = 10
        # Quantity = 1
        # Cost = 100, which is < 1000
        assert quantity == Decimal("1.0000")


class TestStopLoss:
    """Tests for stop loss calculation."""
    
    def test_long_stop(self):
        """Test LONG stop loss."""
        stop = calculate_initial_stop(
            entry_price=Decimal("100.00"),
            direction=TradeDirection.LONG,
            atr=Decimal("5.00"),
            stop_n=Decimal("2.0"),
        )
        # Stop = 100 - (2 * 5) = 90
        assert stop == Decimal("90")
    
    def test_short_stop(self):
        """Test SHORT stop loss."""
        stop = calculate_initial_stop(
            entry_price=Decimal("100.00"),
            direction=TradeDirection.SHORT,
            atr=Decimal("5.00"),
            stop_n=Decimal("2.0"),
        )
        # Stop = 100 + (2 * 5) = 110
        assert stop == Decimal("110")


class TestPyramidEntry:
    """Tests for pyramid entry calculation."""
    
    def test_long_pyramid(self):
        """Test LONG pyramid entries."""
        entry1 = calculate_pyramid_entry(
            base_entry=Decimal("100.00"),
            unit_number=1,
            atr=Decimal("5.00"),
            interval_n=Decimal("0.5"),
            direction=TradeDirection.LONG,
        )
        # Entry = 100 + (1 * 0.5 * 5) = 102.50
        assert entry1 == Decimal("102.50")
        
        entry2 = calculate_pyramid_entry(
            base_entry=Decimal("100.00"),
            unit_number=2,
            atr=Decimal("5.00"),
            interval_n=Decimal("0.5"),
            direction=TradeDirection.LONG,
        )
        # Entry = 100 + (2 * 0.5 * 5) = 105.00
        assert entry2 == Decimal("105.00")


class TestBreakout:
    """Tests for breakout detection."""
    
    def test_long_breakout(self):
        """Test LONG breakout detection."""
        channel = DailyBar(
            date="2026-01-21",
            open=Decimal("100"),
            high=Decimal("105"),
            low=Decimal("95"),
            close=Decimal("102"),
            volume=0,
            adjusted_close=Decimal("102"),
        )
        current_bar = create_bar("2026-01-21", 100, 110, 99, 108)
        
        assert check_breakout([], channel, TradeDirection.LONG, current_bar) is True
    
    def test_no_breakout(self):
        """Test no breakout when price below channel."""
        channel = DailyBar(
            date="2026-01-21",
            open=Decimal("100"),
            high=Decimal("105"),
            low=Decimal("95"),
            close=Decimal("102"),
            volume=0,
            adjusted_close=Decimal("102"),
        )
        current_bar = create_bar("2026-01-21", 100, 104, 99, 103)
        
        assert check_breakout([], channel, TradeDirection.LONG, current_bar) is False


class TestNearBreakout:
    """Tests for near-breakout detection."""
    
    def test_near_long(self):
        """Test near LONG breakout detection."""
        result = detect_near_breakout(
            current_price=Decimal("104.50"),
            channel_upper=Decimal("105.00"),
            channel_lower=Decimal("95.00"),
            atr=Decimal("5.00"),
            threshold_percent=Decimal("0.02"),
            threshold_atr=Decimal("0.5"),
        )
        assert result is not None
        direction, dist_pct, dist_atr = result
        assert direction == TradeDirection.LONG
        assert dist_pct < Decimal("0.02")
        assert dist_atr < Decimal("0.5")
    
    def test_not_near(self):
        """Test when not near breakout."""
        result = detect_near_breakout(
            current_price=Decimal("100.00"),
            channel_upper=Decimal("105.00"),
            channel_lower=Decimal("95.00"),
            atr=Decimal("5.00"),
            threshold_percent=Decimal("0.02"),
            threshold_atr=Decimal("0.5"),
        )
        assert result is None
