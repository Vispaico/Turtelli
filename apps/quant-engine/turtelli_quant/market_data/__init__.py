# ============================================================
# Turtelli 2.0 — Market Data Provider Abstraction
# ============================================================

"""
Provider-independent market data access.

The rest of Turtelli MUST NOT know which provider is underneath.
Every adapter declares what it honestly supports via ProviderFeatures.
"""

from .base import (
    DailyBar,
    IntradayBar,
    PriceQuote,
    InstrumentMetadata,
    CorporateAction,
    MarketHoliday,
    AssetClass,
    CorporateActionType,
    ProviderFeatures,
    MarketDataProvider,
    MarketDataError,
    RateLimitError,
)
from .mock import MockProvider
from .yfinance import YFinanceProvider
from .registry import get_provider, list_providers

__all__ = [
    "DailyBar",
    "IntradayBar",
    "PriceQuote",
    "InstrumentMetadata",
    "CorporateAction",
    "MarketHoliday",
    "AssetClass",
    "CorporateActionType",
    "ProviderFeatures",
    "MarketDataProvider",
    "MarketDataError",
    "RateLimitError",
    "MockProvider",
    "YFinanceProvider",
    "get_provider",
    "list_providers",
]
