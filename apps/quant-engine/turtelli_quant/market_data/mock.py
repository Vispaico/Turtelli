# ============================================================
# Turtelli 2.0 — Mock Market Data Provider
# ============================================================

"""
Deterministic mock provider for tests.

NEVER for production use. Returns exactly the data it was given.
"""

from decimal import Decimal
from typing import Dict, List, Optional
from datetime import datetime

from .base import (
    DailyBar,
    IntradayBar,
    PriceQuote,
    InstrumentMetadata,
    CorporateAction,
    MarketHoliday,
    ProviderFeatures,
    MarketDataProvider,
)


class MockProvider(MarketDataProvider):
    """Returns pre-loaded data. For tests only."""

    name = "mock"

    def __init__(
        self,
        daily_bars: Optional[Dict[str, List[DailyBar]]] = None,
        quotes: Optional[Dict[str, Decimal]] = None,
        metadata: Optional[Dict[str, InstrumentMetadata]] = None,
    ):
        self._daily_bars = daily_bars or {}
        self._quotes = quotes or {}
        self._metadata = metadata or {}

    @property
    def features(self) -> ProviderFeatures:
        return ProviderFeatures(
            real_time_quotes=True,
            historical_bars=True,
            intraday_bars=False,
            corporate_actions=False,
            market_calendar=False,
            instrument_metadata=True,
            max_history_days=99999,
            rate_limit_rpm=9999,
        )

    def get_daily_bars(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        adjusted: bool = True,
    ) -> List[DailyBar]:
        bars = self._daily_bars.get(symbol, [])
        if start_date:
            bars = [b for b in bars if b.date >= start_date]
        if end_date:
            bars = [b for b in bars if b.date <= end_date]
        if limit:
            bars = bars[-limit:]
        return list(bars)

    def get_intraday_bars(
        self,
        symbol: str,
        interval: str = "5m",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[IntradayBar]:
        return []

    def get_current_price(self, symbol: str) -> PriceQuote:
        price = self._quotes.get(symbol)
        if price is None:
            bars = self._daily_bars.get(symbol, [])
            price = bars[-1].close if bars else Decimal("0")
        return PriceQuote(
            symbol=symbol,
            price=price,
            bid=None,
            ask=None,
            volume=None,
            timestamp=datetime.utcnow(),
            source=self.name,
        )

    def get_corporate_actions(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[CorporateAction]:
        return []

    def get_instrument_metadata(self, symbol: str) -> InstrumentMetadata:
        meta = self._metadata.get(symbol)
        if meta:
            return meta
        return InstrumentMetadata(
            symbol=symbol,
            name=f"Mock {symbol}",
            asset_class="EQUITY",
            exchange="MOCK",
            country="US",
            currency="USD",
            sector=None,
            industry=None,
            fractional=False,
            price_precision=2,
            min_quantity=Decimal("1"),
            source=self.name,
        )

    def get_market_calendar(self, year: int) -> List[MarketHoliday]:
        return []

    def get_trading_status(self, symbol: str) -> str:
        return "OPEN"

    # --- Test helpers ---

    def add_daily_bar(self, symbol: str, bar: DailyBar) -> None:
        self._daily_bars.setdefault(symbol, []).append(bar)

    def set_quote(self, symbol: str, price: Decimal) -> None:
        self._quotes[symbol] = price
