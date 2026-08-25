# ============================================================
# Turtelli 2.0 — Provider Registry, Caching, Circuit Breaker
# ============================================================

"""
Provider registry with:
- In-memory TTL cache
- Retry with exponential backoff
- Circuit breaker per provider
- Health status tracking
- Optional secondary provider for validation
"""

import json
import logging
import threading
import time
from decimal import Decimal
from functools import wraps
from typing import Callable, Dict, List, Optional, Tuple, TypeVar

from .base import (
    DailyBar,
    MarketDataError,
    RateLimitError,
    MarketDataProvider,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")


# ============================================================
# CACHE
# ============================================================

class TTLCache:
    """Thread-safe in-memory TTL cache."""

    def __init__(self, default_ttl_seconds: int = 300):
        self._store: Dict[str, Tuple[float, object]] = {}
        self._default_ttl = default_ttl_seconds
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[object]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: object, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        with self._lock:
            self._store[key] = (time.monotonic() + ttl, value)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)


# ============================================================
# CIRCUIT BREAKER
# ============================================================

class CircuitBreakerOpen(MarketDataError):
    def __init__(self, provider: str):
        super().__init__(
            "Circuit breaker open — provider temporarily disabled",
            provider=provider,
            code="CIRCUIT_OPEN",
        )


class CircuitBreaker:
    """
    Per-provider circuit breaker.

    States: CLOSED (normal) -> OPEN (failing, reject calls) -> HALF_OPEN (probe)

    - Opens after `failure_threshold` consecutive failures
    - Stays open for `recovery_timeout` seconds
    - Then allows one probe call; success closes it, failure reopens it
    """

    def __init__(
        self,
        provider: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 60,
    ):
        self.provider = provider
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout

        self._state = "CLOSED"
        self._failure_count = 0
        self._opened_at: float = 0.0
        # RLock (reentrant): record_failure() holds the lock while calling
        # self.state which re-acquires it. Plain Lock would deadlock.
        self._lock = threading.RLock()

    @property
    def state(self) -> str:
        with self._lock:
            if self._state == "OPEN" and time.monotonic() - self._opened_at > self.recovery_timeout:
                return "HALF_OPEN"
            return self._state

    def before_call(self) -> None:
        if self.state == "OPEN":
            raise CircuitBreakerOpen(self.provider)

    def record_success(self) -> None:
        with self._lock:
            self._state = "CLOSED"
            self._failure_count = 0

    def record_failure(self) -> None:
        with self._lock:
            if self.state == "HALF_OPEN":
                self._open()
                return
            self._failure_count += 1
            if self._failure_count >= self.failure_threshold:
                self._open()

    def _open(self) -> None:
        self._state = "OPEN"
        self._opened_at = time.monotonic()
        logger.warning(f"Circuit breaker OPENED for {self.provider}")


# ============================================================
# HEALTH TRACKING
# ============================================================

class ProviderHealth:
    """Health snapshot for one provider."""

    def __init__(self):
        self.total_calls = 0
        self.successful_calls = 0
        self.failed_calls = 0
        self.rate_limited_calls = 0
        self.last_success_at: Optional[float] = None
        self.last_failure_at: Optional[float] = None
        self.last_error: Optional[str] = None

    @property
    def success_rate(self) -> float:
        if self.total_calls == 0:
            return 1.0
        return self.successful_calls / self.total_calls

    def to_dict(self) -> dict:
        return {
            "totalCalls": self.total_calls,
            "successfulCalls": self.successful_calls,
            "failedCalls": self.failed_calls,
            "rateLimitedCalls": self.rate_limited_calls,
            "successRate": round(self.success_rate, 4),
            "lastSuccessAt": self.last_success_at,
            "lastFailureAt": self.last_failure_at,
            "lastError": self.last_error,
        }


# ============================================================
# RETRY DECORATOR
# ============================================================

def with_retry(max_attempts: int = 3, base_delay: float = 1.0):
    """Retry on transient errors with exponential backoff. Respects rate-limit hints."""
    def decorator(fn: Callable[..., T]) -> Callable[..., T]:
        @wraps(fn)
        def wrapper(*args, **kwargs) -> T:
            last_error: Optional[Exception] = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except RateLimitError as e:
                    last_error = e
                    delay = e.retry_after_seconds or base_delay * (2 ** (attempt - 1))
                    logger.warning(f"Rate limited ({fn.__name__}), waiting {delay}s")
                    time.sleep(min(delay, 30))
                except (MarketDataError, ConnectionError, TimeoutError) as e:
                    last_error = e
                    if attempt < max_attempts:
                        delay = base_delay * (2 ** (attempt - 1))
                        logger.warning(f"{fn.__name__} failed (attempt {attempt}), retrying in {delay}s: {e}")
                        time.sleep(delay)
            assert last_error is not None
            raise last_error
        return wrapper
    return decorator


# ============================================================
# MANAGED PROVIDER WRAPPER
# ============================================================

class ManagedProvider:
    """
    Wraps a raw MarketDataProvider with:
    - TTL caching (daily bars cached longer than quotes)
    - Circuit breaker
    - Retries
    - Health tracking
    """

    DAILY_BARS_TTL = 3600       # 1 hour for historical bars
    QUOTE_TTL = 15              # 15 seconds for current price
    METADATA_TTL = 86400        # 24 hours for metadata

    def __init__(self, provider: MarketDataProvider):
        self.raw = provider
        self.breaker = CircuitBreaker(provider.name)
        self.health = ProviderHealth()
        self._cache = TTLCache(default_ttl_seconds=300)

    # --- internal helpers ---

    def _call(self, cache_key: Optional[str], ttl: int, fn: Callable[[], T], method_name: str) -> T:
        if cache_key is not None:
            cached = self._cache.get(cache_key)
            if cached is not None and not isinstance(cached, Exception):
                return cached  # type: ignore[return-value]

        self.breaker.before_call()
        self.health.total_calls += 1
        try:
            result = fn()
            self.breaker.record_success()
            self.health.successful_calls += 1
            self.health.last_success_at = time.time()
            if cache_key is not None:
                self._cache.set(cache_key, result, ttl)
            return result
        except RateLimitError as e:
            self.health.failed_calls += 1
            self.health.rate_limited_calls += 1
            self.health.last_error = str(e)
            self.breaker.record_failure()
            raise
        except Exception as e:
            self.health.failed_calls += 1
            self.health.last_error = f"{type(e).__name__}: {e}"
            self.health.last_failure_at = time.time()
            self.breaker.record_failure()
            raise

    # --- public interface ---

    def get_daily_bars(self, symbol: str, start_date=None, end_date=None,
                       limit=None, adjusted=True) -> List[DailyBar]:
        key = f"daily:{self.raw.name}:{symbol}:{start_date}:{end_date}:{limit}:{adjusted}"
        return self._call(
            key, self.DAILY_BARS_TTL,
            lambda: self.raw.get_daily_bars(symbol, start_date, end_date, limit, adjusted),
            "get_daily_bars",
        )

    def get_current_price(self, symbol: str):
        key = f"quote:{self.raw.name}:{symbol}"
        return self._call(
            key, self.QUOTE_TTL,
            lambda: self.raw.get_current_price(symbol),
            "get_current_price",
        )

    def get_instrument_metadata(self, symbol: str):
        key = f"meta:{self.raw.name}:{symbol}"
        return self._call(
            key, self.METADATA_TTL,
            lambda: self.raw.get_instrument_metadata(symbol),
            "get_instrument_metadata",
        )

    def get_corporate_actions(self, symbol: str, start_date=None, end_date=None):
        return self._call(
            None, 0,
            lambda: self.raw.get_corporate_actions(symbol, start_date, end_date),
            "get_corporate_actions",
        )

    def invalidate_symbol(self, symbol: str) -> None:
        """Drop all cached entries for a symbol."""
        prefix = f":{self.raw.name}:{symbol}:"
        with self._cache._lock:
            keys_to_delete = [k for k in self._cache._store if prefix in k]
            for k in keys_to_delete:
                del self._cache._store[k]

    def is_healthy(self) -> bool:
        return self.breaker.state != "OPEN"

    def status_dict(self) -> dict:
        return {
            "provider": self.raw.name,
            "circuitState": self.breaker.state,
            "health": self.health.to_dict(),
            "cacheSize": self._cache.size(),
        }


# ============================================================
# REGISTRY
# ============================================================

_providers: Dict[str, ManagedProvider] = {}
_registry_lock = threading.Lock()


def register_provider(provider: MarketDataProvider) -> ManagedProvider:
    """Register (or replace) a provider by name."""
    with _registry_lock:
        managed = ManagedProvider(provider)
        _providers[provider.name] = managed
        return managed


def get_provider(name: Optional[str] = None) -> ManagedProvider:
    """
    Get a managed provider by name.
    Falls back to mock if name is None or unknown.
    """
    with _registry_lock:
        if name and name in _providers:
            return _providers[name]
        if name == "yfinance":
            from .yfinance import YFinanceProvider
            managed = ManagedProvider(YFinanceProvider())
            _providers["yfinance"] = managed
            return managed
        if name == "mock" or name is None:
            if "mock" not in _providers:
                from .mock import MockProvider
                _providers["mock"] = ManagedProvider(MockProvider())
            return _providers["mock"]
        raise MarketDataError(f"Unknown provider '{name}'", provider=name or "")


def list_providers() -> List[dict]:
    with _registry_lock:
        return [mp.status_dict() for mp in _providers.values()]


def clear_registry() -> None:
    """Reset registry (for tests)."""
    with _registry_lock:
        _providers.clear()


# ============================================================
# CROSS-PROVIDER VALIDATION
# ============================================================

def validate_daily_bars(
    primary_bars: List[DailyBar],
    secondary_bars: List[DailyBar],
    symbol: str,
    tolerance_percent: Decimal = Decimal("0.02"),
    min_overlap_bars: int = 5,
) -> dict:
    """
    Validate primary provider's bars against a secondary source.

    Compares close prices on overlapping dates.
    Returns validation report; signals MUST NOT publish when this fails critically.
    """
    secondary_by_date = {b.date: b.close for b in secondary_bars}

    compared = 0
    mismatches: List[dict] = []
    missing_dates: List[str] = []

    for bar in primary_bars:
        sec_close = secondary_by_date.get(bar.date)
        if sec_close is None:
            missing_dates.append(bar.date)
            continue
        compared += 1
        if bar.close > 0:
            diff_pct = abs(bar.close - sec_close) / bar.close
            if diff_pct > tolerance_percent:
                mismatches.append({
                    "date": bar.date,
                    "primaryClose": str(bar.close),
                    "secondaryClose": str(sec_close),
                    "diffPercent": str(round(diff_pct * 100, 4)),
                })

    critical_failures = len(mismatches)
    is_valid = compared >= min_overlap_bars and critical_failures == 0

    return {
        "symbol": symbol,
        "isValid": is_valid,
        "comparedBars": compared,
        "missingInSecondary": len(missing_dates),
        "mismatchCount": critical_failures,
        "mismatches": mismatches[:10],
        "tolerancePercent": str(tolerance_percent * 100),
    }
