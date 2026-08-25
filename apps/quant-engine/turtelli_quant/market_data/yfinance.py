# ============================================================
# Turtelli 2.0 — yfinance Market Data Provider
# ============================================================

"""
yfinance adapter (development tier — free, unofficial Yahoo Finance API).

Known limitations (declared honestly in `features`):
- 15-minute delayed quotes (no real-time)
- Intraday bars limited to last ~60 days
- No corporate actions endpoint -> returns [] and uses auto-adjusted closes
- Unofficial API, may break or rate-limit at any time
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import List, Optional

from .base import (
    DailyBar,
    IntradayBar,
    PriceQuote,
    InstrumentMetadata,
    CorporateAction,
    MarketHoliday,
    ProviderFeatures,
    MarketDataProvider,
    MarketDataError,
    SymbolNotFoundError,
    DataUnavailableError,
)

logger = logging.getLogger(__name__)

# Lazy import so the package works without yfinance installed for tests
_yf = None


def _get_yf():
    global _yf
    if _yf is None:
        try:
            import yfinance as yf
            _yf = yf
        except ImportError as e:
            raise DataUnavailableError(
                "yfinance", "", "yfinance package not installed"
            ) from e
    return _yf


def _to_decimal(value) -> Optional[Decimal]:
    """Convert a float/None to Decimal safely. NaN -> None."""
    if value is None:
        return None
    try:
        d = Decimal(str(value))
        if d != d:  # NaN check
            return None
        return d
    except (InvalidOperation, ValueError):
        return None


class YFinanceProvider(MarketDataProvider):
    """Yahoo Finance adapter via yfinance. Development tier."""

    name = "yfinance"

    def __init__(self):
        self._ticker_cache: dict = {}

    @property
    def features(self) -> ProviderFeatures:
        return ProviderFeatures(
            real_time_quotes=False,      # 15-min delay
            historical_bars=True,
            intraday_bars=True,
            corporate_actions=False,     # no endpoint; splits embedded in adjusted close
            market_calendar=False,
            instrument_metadata=True,
            max_history_days=8000,
            rate_limit_rpm=60,
        )

    def _ticker(self, symbol: str):
        yf = _get_yf()
        if symbol not in self._ticker_cache:
            self._ticker_cache[symbol] = yf.Ticker(symbol)  # type: ignore[attr-defined]
        return self._ticker_cache[symbol]

    def get_daily_bars(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
        adjusted: bool = True,
    ) -> List[DailyBar]:
        try:
            tk = self._ticker(symbol)
            auto_adjust = False  # we want raw OHLC + explicit adjusted close
            df = tk.history(
                start=start_date,
                end=end_date,
                interval="1d",
                auto_adjust=auto_adjust,
                actions=False,
            )
        except Exception as e:
            raise MarketDataError(f"Failed to fetch daily bars: {e}", provider=self.name, symbol=symbol)

        if df is None or df.empty:
            raise SymbolNotFoundError(self.name, symbol)

        bars: List[DailyBar] = []
        for idx, row in df.iterrows():
            bar_date = idx.strftime("%Y-%m-%d")
            o = _to_decimal(row.get("Open"))
            h = _to_decimal(row.get("High"))
            low = _to_decimal(row.get("Low"))
            c = _to_decimal(row.get("Close"))
            adj = _to_decimal(row.get("Adj Close"))
            if adj is None:
                adj = c if c is not None else Decimal("0")
            vol_raw = row.get("Volume")
            vol = int(vol_raw) if vol_raw is not None and vol_raw == vol_raw else 0

            # Skip rows with missing core prices
            if o is None or h is None or low is None or c is None:
                continue

            bars.append(DailyBar(
                date=bar_date,
                open=o,
                high=h,
                low=low,
                close=c,
                volume=vol,
                adjusted_close=adj,
                source=self.name,
            ))

        if not bars:
            raise DataUnavailableError(self.name, symbol, "all rows had missing prices")

        if limit:
            bars = bars[-limit:]

        return bars

    def get_intraday_bars(
        self,
        symbol: str,
        interval: str = "5m",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[IntradayBar]:
        valid_intervals = {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"}
        if interval not in valid_intervals:
            raise MarketDataError(
                f"Invalid interval '{interval}'. Valid: {sorted(valid_intervals)}",
                provider=self.name, symbol=symbol,
            )

        try:
            tk = self._ticker(symbol)
            df = tk.history(interval=interval, start=start_date, end=end_date, auto_adjust=True)
        except Exception as e:
            raise MarketDataError(f"Failed to fetch intraday bars: {e}", provider=self.name, symbol=symbol)

        if df is None or df.empty:
            raise DataUnavailableError(
                self.name, symbol, f"no {interval} data (yfinance limits intraday history)"
            )

        bars: List[IntradayBar] = []
        for idx, row in df.iterrows():
            ts = idx.to_pydatetime()
            if ts.tzinfo is not None:
                ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
            o = _to_decimal(row.get("Open"))
            h = _to_decimal(row.get("High"))
            low = _to_decimal(row.get("Low"))
            c = _to_decimal(row.get("Close"))
            if o is None or h is None or low is None or c is None:
                continue
            vol_raw = row.get("Volume")
            vol = int(vol_raw) if vol_raw is not None and vol_raw == vol_raw else 0
            bars.append(IntradayBar(
                timestamp=ts,
                open=o,
                high=h,
                low=low,
                close=c,
                volume=vol,
                interval=interval,
                source=self.name,
            ))

        if limit:
            bars = bars[-limit:]
        return bars

    def get_current_price(self, symbol: str) -> PriceQuote:
        try:
            tk = self._ticker(symbol)
            fast = getattr(tk, "fast_info", None)
            price = None
            if fast is not None:
                price = _to_decimal(getattr(fast, "last_price", None))
            if price is None:
                info = tk.history(period="1d", interval="1m")
                if info is not None and not info.empty:
                    price = _to_decimal(info["Close"].iloc[-1])
        except Exception as e:
            raise MarketDataError(f"Failed to fetch quote: {e}", provider=self.name, symbol=symbol)

        if price is None or price <= 0:
            raise DataUnavailableError(self.name, symbol, "no usable last price")

        return PriceQuote(
            symbol=symbol,
            price=price,
            bid=None,   # delayed feed; do not fabricate bid/ask
            ask=None,
            volume=None,
            timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
            source=self.name,
        )

    def get_corporate_actions(
        self,
        symbol: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[CorporateAction]:
        # Declared unsupported in features. Splits/dividends are reflected
        # in adjusted_close of daily bars instead.
        return []

    def get_instrument_metadata(self, symbol: str) -> InstrumentMetadata:
        try:
            tk = self._ticker(symbol)
            info = tk.info or {}
        except Exception as e:
            raise MarketDataError(f"Failed to fetch metadata: {e}", provider=self.name, symbol=symbol)

        if not info.get("symbol") and not info.get("shortName"):
            raise SymbolNotFoundError(self.name, symbol)

        return InstrumentMetadata(
            symbol=symbol,
            name=info.get("shortName") or info.get("longName") or symbol,
            asset_class="ETF" if info.get("quoteType") == "ETF" else "EQUITY",
            exchange=str(info.get("exchange", "UNKNOWN")),
            country=str(info.get("country", "US")),
            currency=str(info.get("currency", "USD")),
            sector=info.get("sector"),
            industry=info.get("industry"),
            fractional=False,  # policy decision lives in DB, not provider
            price_precision=4,
            min_quantity=Decimal("0.0001"),
            source=self.name,
        )

    def get_market_calendar(self, year: int) -> List[MarketHoliday]:
        return []

    def get_trading_status(self, symbol: str) -> str:
        return "UNKNOWN"
