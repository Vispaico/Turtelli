# ============================================================
# Turtelli 2.0 — Data Validation Tests
# ============================================================

"""
Tests for market data validation.
"""

import pytest
from decimal import Decimal
from turtelli_quant.turtle_engine import DailyBar
from turtelli_quant.data_validation import (
    validate_daily_bar,
    validate_bar_sequence,
    validate_atr_reasonability,
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


class TestDailyBarValidation:
    """Tests for daily bar validation."""
    
    def test_valid_bar(self):
        """Test valid bar passes validation."""
        bar = create_bar("2026-01-15", 100, 105, 95, 102)
        result = validate_daily_bar(bar)
        assert result.is_valid is True
        assert len(result.errors) == 0
    
    def test_high_less_than_low(self):
        """Test bar with high < low fails."""
        bar = create_bar("2026-01-15", 100, 95, 105, 102)
        result = validate_daily_bar(bar)
        assert result.is_valid is False
        assert any("High" in e and "Low" in e for e in result.errors)
    
    def test_zero_price(self):
        """Test bar with zero price fails."""
        bar = create_bar("2026-01-15", 0, 105, 95, 102)
        result = validate_daily_bar(bar)
        assert result.is_valid is False
        assert any("0" in e for e in result.errors)
    
    def test_negative_volume(self):
        """Test bar with negative volume fails."""
        bar = DailyBar(
            date="2026-01-15",
            open=Decimal("100"),
            high=Decimal("105"),
            low=Decimal("95"),
            close=Decimal("102"),
            volume=-100,
            adjusted_close=Decimal("102"),
        )
        result = validate_daily_bar(bar)
        assert result.is_valid is False
        assert any("Volume" in e for e in result.errors)
    
    def test_low_volume_warning(self):
        """Test low volume generates warning."""
        bar = create_bar("2026-01-15", 100, 105, 95, 102, v=1000)
        result = validate_daily_bar(bar, min_volume=100000)
        assert result.is_valid is True
        assert len(result.warnings) > 0
    
    def test_abnormal_move_warning(self):
        """Test abnormal daily move generates warning."""
        prev_bar = create_bar("2026-01-14", 100, 105, 95, 102)
        bar = create_bar("2026-01-15", 100, 150, 95, 145)
        result = validate_daily_bar(bar, previous_bar=prev_bar, max_daily_move_percent=Decimal("0.10"))
        assert result.is_valid is True
        assert any("Abnormal" in w for w in result.warnings)


class TestBarSequenceValidation:
    """Tests for bar sequence validation."""
    
    def test_valid_sequence(self):
        """Test valid bar sequence."""
        bars = [create_bar(f"2026-01-{i:02d}", 100, 105, 95, 102) for i in range(1, 6)]
        result = validate_bar_sequence(bars)
        assert result.is_valid is True
    
    def test_duplicate_dates(self):
        """Test duplicate dates fail."""
        bars = [
            create_bar("2026-01-01", 100, 105, 95, 102),
            create_bar("2026-01-01", 100, 105, 95, 102),
        ]
        result = validate_bar_sequence(bars)
        assert result.is_valid is False
        assert any("Duplicate" in e for e in result.errors)
    
    def test_non_chronological(self):
        """Test non-chronological order fails."""
        bars = [
            create_bar("2026-01-02", 100, 105, 95, 102),
            create_bar("2026-01-01", 100, 105, 95, 102),
        ]
        result = validate_bar_sequence(bars)
        assert result.is_valid is False
        assert any("chronological" in e.lower() for e in result.errors)
    
    def test_empty_sequence(self):
        """Test empty sequence fails."""
        result = validate_bar_sequence([])
        assert result.is_valid is False
        assert any("Empty" in e for e in result.errors)


class TestATRReasonability:
    """Tests for ATR reasonability validation."""
    
    def test_reasonable_atr(self):
        """Test reasonable ATR passes."""
        result = validate_atr_reasonability(
            atr=Decimal("5.00"),
            current_price=Decimal("100.00"),
        )
        assert result.is_valid is True
    
    def test_zero_atr(self):
        """Test zero ATR fails."""
        result = validate_atr_reasonability(
            atr=Decimal("0"),
            current_price=Decimal("100.00"),
        )
        assert result.is_valid is False
    
    def test_very_high_atr(self):
        """Test very high ATR generates warning."""
        result = validate_atr_reasonability(
            atr=Decimal("25.00"),
            current_price=Decimal("100.00"),
        )
        assert result.is_valid is True
        assert any("high" in w.lower() for w in result.warnings)
    
    def test_very_low_atr(self):
        """Test very low ATR generates warning."""
        result = validate_atr_reasonability(
            atr=Decimal("0.01"),
            current_price=Decimal("100.00"),
        )
        assert result.is_valid is True
        assert any("low" in w.lower() for w in result.warnings)
