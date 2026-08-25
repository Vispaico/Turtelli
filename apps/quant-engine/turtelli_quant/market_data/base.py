# ============================================================
# Turtelli 2.0 — Market Data Base Types & Interface
# ============================================================

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional
from datetime import date, datetime


class AssetClass:
    EQUITY = "EQUITY"
    ETF = "ETF"
    INDEX = "INDEX"
    COMMODITY = "COMMODITY"
    FOREX = "FOREX"
    CRYPTO = "CRYPTO"
    FUTURE = "FUTURE"


class CorporateActionType:
    SPLIT = "SPLIT"
    REVERSE_SPLIT = "REVERSE_SPLIT"
    DIVIDEND = "DIVIDEND"
    SYMBOL_CHANGE = "SYMBOL_CHANGE"
    DELISTING = "DELISTING"


@dataclass
class DailyBar:
    """Single daily OHLCV bar. Dates are YYYY-MM-DD strings (exchange-local)."""
    date: str
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int
    adjusted_close: Decimal
    source: str = ""


@dataclass
class IntradayBar:
    """Single intraday OHLCV bar."""
    timestamp: datetime  # UTC, exchange-local converted by adapter
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int
    interval: str  # "1m", "5m", "15m", "1h"
    source: str = ""


@dataclass
class PriceQuote:
    """Current price quote."""
    symbol: str
    price: Decimal
    bid: Optional[Decimal]
    ask: Optional[Decimal]
    volume: Optional[int]
    timestamp: datetime
    source: str


@dataclass
class InstrumentMetadata:
    """Instrument reference data."""
    symbol: str
    name: str
    asset_class: str
    exchange: str
    country: str
    currency: str
    sector: Optional[str]
    industry: Optional[str]
    fractional: bool
    price_precision: int
    min_quantity: Decimal
    source: str


@dataclass
class CorporateAction:
    """Corporate action record."""
    action_type: str
    date: date
    ratio: Optional[Decimal]      # split ratio (2.0 = 2-for-1)
    dividend_per_share: Optional[Decimal]
    description: Optional[str]
    source: str


@dataclass
class MarketHoliday:
    """Market holiday / early close."""
    date: date
    name: str
    early_close_time: Optional[str]  # HH:MM exchange local, None = full day closed


@dataclass
class ProviderFeatures:
    """What this provider honestly supports."""
    real_time_quotes: bool
    historical_bars: bool
    intraday_bars: bool
    corporate_actions: bool
    market_calendar: bool
    instrument_metadata: bool
    max_history_days: int
    rate_limit_rpm: int


class MarketDataProvider(ABC):
    """
    Abstract market data provider.

    Adapters MUST:
    - Return Decimal prices (never float)
    - Use YYYY-MM-DD date strings for daily bars (exchange-local dates)
    - Declare honest ProviderFeatures (return empty/None where unsupported)
    - Raise MarketDataError subclasses on failure (never return fake data)
    - Set `source` on every returned object
    """

    name: str = "abstract"

    @property
    @abstractmethod
    def features(self) -> ProviderFeatures:
        ...

    @abstractmethod
    def get_daily_bars(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        adjusted: bool = True,
    ) -> List[DailyBar]:
        ...

    @abstractmethod
    def get_intraday_bars(
        self,
        symbol: str,
        interval: str = "5m",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[IntradayBar]:
        ...

    @abstractmethod
    def get_current_price(self, symbol: str) -> PriceQuote:
        ...

    @abstractmethod
    def get_corporate_actions(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[CorporateAction]:
        ...

    @abstractmethod
    def get_instrument_metadata(self, symbol: str) -> InstrumentMetadata:
        ...

    @abstractmethod
    def get_market_calendar(self, year: int) -> List[MarketHoliday]:
        ...

    @abstractmethod
    def get_trading_status(self, symbol: str) -> str:
        """Return one of: OPEN, CLOSED, PRE_MARKET, AFTER_HOURS, HALTED, UNKNOWN"""
        ...


class MarketDataError(Exception):
    """Base error for market data failures."""

    def __init__(self, message: str, provider: str, symbol: str = "", code: str = "ERROR"):
        self.provider = provider
        self.symbol = symbol
        self.code = code
        super().__init__(f"[{provider}] {symbol}: {message}" if symbol else f"[{provider}] {message}")


class RateLimitError(MarketDataError):
    def __init__(self, provider: str, retry_after_seconds: int):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(
            f"Rate limited, retry after {retry_after_seconds}s",
            provider=provider,
            code="RATE_LIMIT",
        )


class SymbolNotFoundError(MarketDataError):
    def __init__(self, provider: str, symbol: str):
        super().__init__("Symbol not found", provider=provider, symbol=symbol, code="NOT_FOUND")


class DataUnavailableError(MarketDataError):
    def __init__(self, provider: str, symbol: str, detail: str = ""):
        super().__init__(
            f"Data unavailable{': ' + detail if detail else ''}",
            provider=provider,
            symbol=symbol,
            code="UNAVAILABLE",
        )
