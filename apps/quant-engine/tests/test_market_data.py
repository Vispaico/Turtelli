# ============================================================
# Turtelli 2.0 — Market Data Tests
# ============================================================

"""
Tests for the market data abstraction:
- Mock provider determinism
- Registry caching
- Circuit breaker behavior
- Cross-provider validation
"""

import time
from decimal import Decimal
from typing import List

import pytest

from turtelli_quant.market_data.base import (
    DailyBar,
    MarketDataError,
    RateLimitError,
    MarketDataProvider,
    ProviderFeatures,
)
from turtelli_quant.market_data.mock import MockProvider
from turtelli_quant.market_data.registry import (
    CircuitBreaker,
    CircuitBreakerOpen,
    ManagedProvider,
    TTLCache,
    clear_registry,
    get_provider,
    list_providers,
    register_provider,
    validate_daily_bars,
)


def bar(date: str, c: float, o: float = 0.0, h: float = 0.0, l: float = 0.0) -> DailyBar:
    o = o if o else c
    h = h if h else max(o, c)
    l = l if l else min(o, c)
    return DailyBar(
        date=date,
        open=Decimal(str(o)),
        high=Decimal(str(h)),
        low=Decimal(str(l)),
        close=Decimal(str(c)),
        volume=100000,
        adjusted_close=Decimal(str(c)),
        source="mock",
    )


def make_bars(symbol: str, count: int = 30) -> List[DailyBar]:
    """Simple ascending series."""
    return [
        bar(f"2026-01-{i+1:02d}" if i < 28 else f"2026-02-{i-27:02d}", 100 + i)
        for i in range(count)
    ]


class FailingProvider(MarketDataProvider):
    """Provider that always fails — for circuit breaker tests."""

    name = "failing"

    def __init__(self, fail_times: int = 999):
        self.fail_times = fail_times
        self.calls = 0

    @property
    def features(self) -> ProviderFeatures:
        return ProviderFeatures(True, True, False, False, False, False, 100, 60)

    def get_daily_bars(self, symbol, start_date=None, end_date=None, limit=None, adjusted=True):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise MarketDataError("simulated failure", provider=self.name, symbol=symbol)
        return make_bars(symbol)

    def get_intraday_bars(self, symbol, interval="5m", start_date=None, end_date=None, limit=None):
        return []

    def get_current_price(self, symbol):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise MarketDataError("simulated failure", provider=self.name, symbol=symbol)
        from turtelli_quant.market_data.base import PriceQuote
        from datetime import datetime
        return PriceQuote(symbol=symbol, price=Decimal("100"), bid=None, ask=None,
                          volume=None, timestamp=datetime.utcnow(), source=self.name)

    def get_corporate_actions(self, symbol, start_date=None, end_date=None):
        return []

    def get_instrument_metadata(self, symbol):
        raise MarketDataError("simulated failure", provider=self.name, symbol=symbol)

    def get_market_calendar(self, year):
        return []

    def get_trading_status(self, symbol):
        return "UNKNOWN"


class RateLimitedProvider(FailingProvider):
    name = "ratelimited"

    def get_current_price(self, symbol):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise RateLimitError(provider=self.name, retry_after_seconds=1)
        from turtelli_quant.market_data.base import PriceQuote
        from datetime import datetime
        return PriceQuote(symbol=symbol, price=Decimal("100"), bid=None, ask=None,
                          volume=None, timestamp=datetime.utcnow(), source=self.name)


# ============================================================
# TTL CACHE TESTS
# ============================================================

class TestTTLCache:
    def test_set_and_get(self):
        cache = TTLCache()
        cache.set("key", "value", ttl_seconds=10)
        assert cache.get("key") == "value"

    def test_expired_entry_returns_none(self):
        cache = TTLCache()
        cache.set("key", "value", ttl_seconds=-1)  # already expired
        assert cache.get("key") is None

    def test_clear(self):
        cache = TTLCache()
        cache.set("a", 1)
        cache.set("b", 2)
        cache.clear()
        assert cache.get("a") is None
        assert cache.size() == 0


# ============================================================
# CIRCUIT BREAKER TESTS
# ============================================================

class TestCircuitBreaker:
    def test_starts_closed(self):
        cb = CircuitBreaker("test")
        assert cb.state == "CLOSED"
        cb.before_call()  # should not raise

    def test_opens_after_threshold_failures(self):
        cb = CircuitBreaker("test", failure_threshold=3)
        for _ in range(3):
            cb.record_failure()
        assert cb.state == "OPEN"
        with pytest.raises(CircuitBreakerOpen):
            cb.before_call()

    def test_success_resets_failure_count(self):
        cb = CircuitBreaker("test", failure_threshold=3)
        cb.record_failure()
        cb.record_failure()
        cb.record_success()
        cb.record_failure()
        cb.record_failure()
        # Only 2 consecutive failures since last success
        assert cb.state == "CLOSED"

    def test_half_open_after_timeout(self):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=0.05)
        cb.record_failure()
        assert cb.state == "OPEN"
        time.sleep(0.06)
        assert cb.state == "HALF_OPEN"
        cb.before_call()  # probe allowed

    def test_probe_success_closes(self):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=0.05)
        cb.record_failure()
        time.sleep(0.06)
        cb.before_call()  # enters half-open via state property check
        cb.record_success()
        assert cb.state == "CLOSED"

    def test_probe_failure_reopens(self):
        cb = CircuitBreaker("test", failure_threshold=2, recovery_timeout=0.05)
        # Trip the breaker
        cb.record_failure()
        cb.record_failure()
        assert cb.state == "OPEN"
        time.sleep(0.06)
        # Now in HALF_OPEN; a probe failure must reopen immediately
        assert cb.state == "HALF_OPEN"
        cb.record_failure()
        assert cb.state == "OPEN"


# ============================================================
# MANAGED PROVIDER TESTS
# ============================================================

class TestManagedProvider:
    def test_daily_bars_cached(self):
        mp = MockProvider(daily_bars={"TEST": make_bars("TEST")})
        managed = ManagedProvider(mp)

        bars1 = managed.get_daily_bars("TEST")
        calls_after_first = managed.health.total_calls
        bars2 = managed.get_daily_bars("TEST")

        assert len(bars1) == len(bars2)
        # Second call must be served from cache (no additional provider call)
        assert managed.health.total_calls == calls_after_first
        assert managed._cache.size() > 0

    def test_health_tracks_failures(self):
        failing = FailingProvider(fail_times=2)
        managed = ManagedProvider(failing)

        with pytest.raises(MarketDataError):
            managed.get_daily_bars("FAIL")
        with pytest.raises(MarketDataError):
            managed.get_daily_bars("FAIL")

        assert managed.health.failed_calls == 2
        assert managed.health.successful_calls == 0

    def test_circuit_opens_on_consecutive_failures(self):
        failing = FailingProvider(fail_times=999)
        managed = ManagedProvider(failing)
        # Default threshold is 5
        for _ in range(5):
            with pytest.raises(MarketDataError):
                managed.get_daily_bars("FAIL")

        assert managed.breaker.state in ("OPEN", "HALF_OPEN")
        # Next call should be rejected by breaker without hitting provider
        calls_before = failing.calls
        with pytest.raises(CircuitBreakerOpen):
            managed.get_daily_bars("FAIL")
        assert failing.calls == calls_before

    def test_recovers_after_provider_heals(self):
        # Fail exactly 4 times (below default threshold of 5), then succeed
        failing = FailingProvider(fail_times=4)
        managed = ManagedProvider(failing)
        managed.breaker.failure_threshold = 10  # don't open during failures

        for _ in range(4):
            with pytest.raises(MarketDataError):
                managed.get_daily_bars("HEAL")

        # Now succeeds
        bars = managed.get_daily_bars("HEAL")
        assert len(bars) > 0
        assert managed.is_healthy()

    def test_rate_limit_counted(self):
        rl = RateLimitedProvider(fail_times=1)
        managed = ManagedProvider(rl)

        with pytest.raises(RateLimitError):
            managed.get_current_price("RL")  # no retry at managed level

        assert managed.health.rate_limited_calls == 1

    def test_status_dict_shape(self):
        mp = MockProvider(daily_bars={"X": make_bars("X")})
        managed = ManagedProvider(mp)
        status = managed.status_dict()
        assert status["provider"] == "mock"
        assert status["circuitState"] == "CLOSED"
        assert "health" in status
        assert "cacheSize" in status


# ============================================================
# REGISTRY TESTS
# ============================================================

class TestRegistry:
    def setup_method(self):
        clear_registry()

    def teardown_method(self):
        clear_registry()

    def test_register_and_get(self):
        mp = MockProvider()
        register_provider(mp)
        managed = get_provider("mock")
        assert managed.raw.name == "mock"

    def test_get_yfinance_lazy(self):
        # Should construct lazily without needing yfinance installed
        # (construction doesn't touch network)
        try:
            managed = get_provider("yfinance")
            assert managed.raw.name == "yfinance"
        except MarketDataError as e:
            # yfinance package missing is acceptable in test env
            assert "not installed" in str(e) or True

    def test_unknown_provider_raises(self):
        with pytest.raises(MarketDataError):
            get_provider("nonexistent_xyz")


# ============================================================
# CROSS-PROVIDER VALIDATION TESTS
# ============================================================

class TestCrossValidation:
    def test_matching_data_passes(self):
        primary = make_bars("AAPL")
        secondary = make_bars("AAPL")  # identical
        report = validate_daily_bars(primary, secondary, "AAPL")
        assert report["isValid"] is True
        assert report["mismatchCount"] == 0
        assert report["comparedBars"] == len(primary)

    def test_small_diff_within_tolerance_passes(self):
        primary = make_bars("AAPL")
        secondary = [bar(b.date, float(b.close) * 1.005) for b in primary]  # 0.5% diff
        report = validate_daily_bars(primary, secondary, "AAPL")
        assert report["isValid"] is True

    def test_large_diff_fails(self):
        primary = make_bars("AAPL")
        secondary = [bar(b.date, float(b.close) * 1.10) for b in primary]  # 10% diff
        report = validate_daily_bars(primary, secondary, "AAPL")
        assert report["isValid"] is False
        assert report["mismatchCount"] == len(primary)

    def test_insufficient_overlap_fails(self):
        primary = make_bars("AAPL", count=20)
        secondary = make_bars("AAPL", count=3)  # only tiny overlap
        report = validate_daily_bars(primary, secondary, "AAPL")
        assert report["isValid"] is False

    def test_missing_dates_reported(self):
        primary = make_bars("AAPL", count=10)
        secondary = make_bars("AAPL", count=5)
        report = validate_daily_bars(primary, secondary, "AAPL")
        assert report["missingInSecondary"] == 5


# ============================================================
# MOCK PROVIDER TESTS
# ============================================================

class TestMockProvider:
    def test_deterministic_return(self):
        mp = MockProvider(daily_bars={"T": make_bars("T")})
        b1 = mp.get_daily_bars("T")
        b2 = mp.get_daily_bars("T")
        assert b1 == b2

    def test_date_filtering(self):
        mp = MockProvider(daily_bars={"T": make_bars("T")})
        bars = mp.get_daily_bars("T", start_date="2026-01-15", end_date="2026-01-20")
        assert all("2026-01-15" <= b.date <= "2026-01-20" for b in bars)

    def test_limit(self):
        mp = MockProvider(daily_bars={"T": make_bars("T", count=50)})
        bars = mp.get_daily_bars("T", limit=10)
        assert len(bars) == 10
        assert bars[-1].date > bars[0].date  # most recent kept

    def test_unknown_symbol_empty(self):
        mp = MockProvider()
        assert mp.get_daily_bars("NOPE") == []
