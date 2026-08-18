# ============================================================
# Turtelli 2.0 — Daily Scanner
# ============================================================

"""
Daily market scanner for Turtle Trading signals.

Runs after market close to:
1. Fetch daily OHLCV for universe
2. Calculate Donchian channels and ATR
3. Detect breakouts and near-breakout opportunities
4. Generate signals
"""

import json
import logging
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Dict, Any

from .turtle_engine import (
    DailyBar,
    StrategyConfig,
    DonchianChannel,
    TradeDirection,
    SignalStatus,
    calculate_donchian_channel,
    calculate_atr,
    detect_near_breakout,
)
from .data_validation import validate_daily_bar, validate_bar_sequence

logger = logging.getLogger(__name__)


# Default universe — major US stocks and ETFs
DEFAULT_UNIVERSE = [
    # Tech giants
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
    # Semiconductors
    "AMD", "INTC", "QCOM", "AVGO", "CRM",
    # Finance
    "JPM", "BAC", "WFC", "GS", "MS",
    # Healthcare
    "JNJ", "UNH", "PFE", "ABBV", "MRK",
    # Consumer
    "WMT", "PG", "KO", "PEP", "COST",
    # Industrial
    "CAT", "BA", "HON", "UPS", "RTX",
    # Energy
    "XOM", "CVX", "COP",
    # ETFs
    "SPY", "QQQ", "IWM", "DIA", "VTI",
    "XLF", "XLK", "XLE", "XLV", "XLI",
    # International
    "EEM", "FXI", "EWJ",
]


class DailyScanner:
    """
    Scans the market universe for Turtle Trading opportunities.
    
    This is a stateless scanner — it receives data and returns results.
    """
    
    def __init__(
        self,
        universe: Optional[List[str]] = None,
        system1_config: Optional[StrategyConfig] = None,
        system2_config: Optional[StrategyConfig] = None,
    ):
        self.universe = universe or DEFAULT_UNIVERSE
        self.system1 = system1_config or StrategyConfig(
            name="turtle_system_1",
            display_name="Turtle System 1",
            version=1,
            entry_days=20,
            exit_days=10,
            previous_winner_filter=True,
        )
        self.system2 = system2_config or StrategyConfig(
            name="turtle_system_2",
            display_name="Turtle System 2",
            version=1,
            entry_days=55,
            exit_days=20,
            previous_winner_filter=False,
        )
    
    def scan_instrument(
        self,
        symbol: str,
        bars: List[DailyBar],
        scan_date: str,
    ) -> Dict[str, Any]:
        """
        Scan a single instrument for signals.
        
        Args:
            symbol: Instrument symbol
            bars: Historical daily bars (sorted by date ascending)
            scan_date: Date to scan for (YYYY-MM-DD)
            
        Returns:
            Dictionary with signal data if found
        """
        result = {
            "symbol": symbol,
            "scan_date": scan_date,
            "signals": [],
            "near_breakout": [],
            "validation_errors": [],
            "validation_warnings": [],
        }
        
        # Validate bars
        validation = validate_bar_sequence(bars)
        if not validation.is_valid:
            result["validation_errors"] = validation.errors
            return result
        result["validation_warnings"] = validation.warnings
        
        # Need enough bars for System 2 (55 days)
        if len(bars) < 55:
            result["validation_errors"].append(
                f"Insufficient bars: {len(bars)} (need 55+)"
            )
            return result
        
        # Calculate ATR
        atr = calculate_atr(bars, period=20, current_date=scan_date)
        if atr is None or atr <= 0:
            result["validation_errors"].append("Could not calculate ATR")
            return result
        
        current_bar = bars[-1]
        
        # System 1: 20-day breakout
        channel_20 = calculate_donchian_channel(bars, 20, scan_date)
        if channel_20:
            # Check for breakout
            for direction in [TradeDirection.LONG, TradeDirection.SHORT]:
                if direction == TradeDirection.LONG and current_bar.close > channel_20.high:
                    result["signals"].append({
                        "direction": direction.value,
                        "system": "System 1",
                        "breakout_level": float(channel_20.high),
                        "current_price": float(current_bar.close),
                        "atr": float(atr),
                        "status": "TRIGGERED",
                    })
                elif direction == TradeDirection.SHORT and current_bar.close < channel_20.low:
                    result["signals"].append({
                        "direction": direction.value,
                        "system": "System 1",
                        "breakout_level": float(channel_20.low),
                        "current_price": float(current_bar.close),
                        "atr": float(atr),
                        "status": "TRIGGERED",
                    })
            
            # Check for near-breakout
            near = detect_near_breakout(
                current_price=current_bar.close,
                channel_upper=channel_20.high,
                channel_lower=channel_20.low,
                atr=atr,
            )
            if near:
                direction, dist_pct, dist_atr = near
                result["near_breakout"].append({
                    "direction": direction.value,
                    "system": "System 1",
                    "distance_percent": float(dist_pct),
                    "distance_atr": float(dist_atr),
                    "breakout_level": float(
                        channel_20.high if direction == TradeDirection.LONG else channel_20.low
                    ),
                    "current_price": float(current_bar.close),
                    "atr": float(atr),
                })
        
        # System 2: 55-day breakout
        channel_55 = calculate_donchian_channel(bars, 55, scan_date)
        if channel_55:
            for direction in [TradeDirection.LONG, TradeDirection.SHORT]:
                if direction == TradeDirection.LONG and current_bar.close > channel_55.high:
                    result["signals"].append({
                        "direction": direction.value,
                        "system": "System 2",
                        "breakout_level": float(channel_55.high),
                        "current_price": float(current_bar.close),
                        "atr": float(atr),
                        "status": "TRIGGERED",
                    })
                elif direction == TradeDirection.SHORT and current_bar.close < channel_55.low:
                    result["signals"].append({
                        "direction": direction.value,
                        "system": "System 2",
                        "breakout_level": float(channel_55.low),
                        "current_price": float(current_bar.close),
                        "atr": float(atr),
                        "status": "TRIGGERED",
                    })
            
            near = detect_near_breakout(
                current_price=current_bar.close,
                channel_upper=channel_55.high,
                channel_lower=channel_55.low,
                atr=atr,
            )
            if near:
                direction, dist_pct, dist_atr = near
                result["near_breakout"].append({
                    "direction": direction.value,
                    "system": "System 2",
                    "distance_percent": float(dist_pct),
                    "distance_atr": float(dist_atr),
                    "breakout_level": float(
                        channel_55.high if direction == TradeDirection.LONG else channel_55.low
                    ),
                    "current_price": float(current_bar.close),
                    "atr": float(atr),
                })
        
        return result
    
    def scan_universe(
        self,
        market_data: Dict[str, List[DailyBar]],
        scan_date: str,
    ) -> Dict[str, Any]:
        """
        Scan the entire universe for signals.
        
        Args:
            market_data: Dictionary of symbol -> bars
            scan_date: Date to scan for
            
        Returns:
            Complete scan results
        """
        results = {
            "scan_date": scan_date,
            "universe_size": len(self.universe),
            "instruments_scanned": 0,
            "signals_found": 0,
            "near_breakout_count": 0,
            "validation_errors": 0,
            "instruments": {},
        }
        
        for symbol in self.universe:
            bars = market_data.get(symbol, [])
            if not bars:
                logger.warning(f"No data for {symbol}")
                continue
            
            instrument_result = self.scan_instrument(symbol, bars, scan_date)
            results["instruments"][symbol] = instrument_result
            results["instruments_scanned"] += 1
            results["signals_found"] += len(instrument_result["signals"])
            results["near_breakout_count"] += len(instrument_result["near_breakout"])
            results["validation_errors"] += len(instrument_result["validation_errors"])
        
        return results
