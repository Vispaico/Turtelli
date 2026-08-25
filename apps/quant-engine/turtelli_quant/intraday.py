# ============================================================
# Turtelli 2.0 — Intraday Watcher
# ============================================================

"""
Adaptive intraday monitoring built on the scanner + portfolio engines.

Responsibilities:
1. Schedule-driven polls honoring per-symbol cadences from the
   AdaptiveMonitorQueue (two-speed principle).
2. Market-hours awareness: skip polls outside sessions, handle
   weekends/holidays via injected calendar.
3. Idempotent triggers: a breakout is triggered AT MOST ONCE per
   signal key (symbol+system+direction+channel date). Duplicate
   intraday polls re-hitting the level are suppressed.
4. Gap handling across poll boundaries: stops evaluated against
   bar/quote ranges with open-gap fills (same rule as backtester).
5. Every state change returns an immutable event for the ledger.

Pure logic + injected quote/bar source. No DB, no network of its own.
Concurrency-safe: a symbol lock registry prevents double-processing
when workers run in parallel.
"""

import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime, time as dtime, date as _date
from decimal import Decimal
from typing import Callable, Dict, List, Optional, Set, Tuple

from .turtle_engine import DailyBar, TradeDirection
from .portfolio_engine import (
    IncomingSignal,
    PortfolioEngine,
    ExecutedTrade,
    SkippedTrade,
    route_signal_to_portfolios,
)

logger = logging.getLogger(__name__)

ZERO = Decimal("0")


# ============================================================
# MARKET CALENDAR
# ============================================================

@dataclass
class SessionTimes:
    """Exchange session for one day (exchange-local)."""
    open: dtime = dtime(9, 30)
    close: dtime = dtime(16, 0)
    is_trading_day: bool = True


class MarketCalendar:
    """
    Trading calendar interface.
    Default implementation: weekdays only, no holidays.
    Production should inject exchange-specific holidays.
    """

    def session_for(self, day: _date) -> SessionTimes:
        if day.weekday() >= 5:   # Sat/Sun
            return SessionTimes(is_trading_day=False)
        return SessionTimes()

    def is_open(self, now: datetime) -> bool:
        s = self.session_for(now.date())
        return s.is_trading_day and s.open <= now.time() < s.close


# ============================================================
# TRIGGER DEDUP REGISTRY
# ============================================================

def _signal_key(symbol: str, system: str, direction: TradeDirection,
                channel_date: str) -> str:
    """
    Idempotency key: one trigger per symbol/system/direction per
    channel formation date. If the channel rolls to a new window,
    a fresh breakout may legitimately fire again.
    """
    return f"{symbol}|{system}|{direction.value}|{channel_date}"


class TriggerRegistry:
    """
    Thread-safe set of already-fired signal keys.

    In production this is backed by the DB (signal table); in-process
    it prevents concurrent workers double-firing within one tick.
    """

    def __init__(self, preloaded: Optional[Set[str]] = None):
        self._fired: Set[str] = set(preloaded or set())
        self._lock = threading.Lock()

    def try_claim(self, key: str) -> bool:
        """
        Atomically claim a trigger key.
        Returns True if newly claimed (proceed), False if already fired.
        """
        with self._lock:
            if key in self._fired:
                return False
            self._fired.add(key)
            return True

    def release(self, key: str) -> None:
        """Roll back a claim if downstream processing failed."""
        with self._lock:
            self._fired.discard(key)

    @property
    def fired_count(self) -> int:
        return len(self._fired)


class SymbolLocks:
    """Per-symbol locks so parallel workers never process one symbol twice."""

    def __init__(self):
        self._locks: Dict[str, threading.Lock] = {}
        self._guard = threading.Lock()

    def acquire(self, symbol: str) -> threading.Lock:
        with self._guard:
            if symbol not in self._locks:
                self._locks[symbol] = threading.Lock()
            lock = self._locks[symbol]
        lock.acquire()
        return lock


# ============================================================
# WATCHER
# ============================================================

@dataclass
class WatchEvent:
    """Immutable record of anything the watcher decided or did."""
    timestamp_hint: str          # ISO datetime of the poll
    event_type: str              # see EVENT_TYPES
    symbol: str
    data: dict = field(default_factory=dict)


EVENT_TYPES = {
    "poll_skipped_market_closed",
    "poll_skipped_not_due",
    "poll_executed",
    "breakout_confirmed",       # intraday confirmation of a known candidate
    "trigger_fired",
    "trigger_duplicate_suppressed",
    "position_opened",
    "position_closed",
    "trade_skipped",
    "stop_would_trigger_gap",
}


@dataclass
class WatchedSymbol:
    """Everything needed to watch one instrument intraday."""
    symbol: str
    direction: TradeDirection
    system_name: str
    strategy_version: int
    config_hash: str

    # Levels frozen at daily-scan time (anti-lookahead basis)
    breakout_level: Decimal      # entry trigger level
    exit_level: Decimal          # opposite channel reference
    initial_stop: Decimal
    atr: Decimal
    channel_date: str            # date the channel was computed from

    # Scheduling
    poll_interval_minutes: int
    last_polled_at: Optional[datetime] = None


@dataclass
class Quote:
    """Lightweight quote used for intraday checks."""
    symbol: str
    price: Decimal
    low: Optional[Decimal]       # session low so far (for stop checks)
    high: Optional[Decimal]
    open: Optional[Decimal]
    timestamp: datetime


class IntradayWatcher:
    """
    Watches armed candidates and open positions intraday.

    Design notes:
    - Trigger levels come from the DAILY scan (frozen), never recomputed
      intraday from partial bars. This keeps live triggers identical to
      what the nightly engine would have computed.
    - LONG triggers when price > breakout_level (intrabar touch counts —
      real orders fill on touch; close-confirmation belongs to the daily
      system per TRADING_RULES.md).
    - Dedup via TriggerRegistry makes processing idempotent.
    """

    def __init__(
        self,
        calendar: Optional[MarketCalendar] = None,
        registry: Optional[TriggerRegistry] = None,
    ):
        self.calendar = calendar or MarketCalendar()
        self.registry = registry or TriggerRegistry()
        self.locks = SymbolLocks()
        self.events: List[WatchEvent] = []
        self.watched: Dict[str, WatchedSymbol] = {}
        self._seq = 0

    # ---------- registration ----------

    def arm_candidate(self, w: WatchedSymbol) -> None:
        """Register a daily-scan candidate for intraday watching."""
        self.watched[w.symbol] = w

    def disarm(self, symbol: str) -> None:
        self.watched.pop(symbol, None)

    def _log(self, ts: str, event_type: str, symbol: str, **data) -> WatchEvent:
        assert event_type in EVENT_TYPES, f"unknown event type {event_type}"
        self._seq += 1
        ev = WatchEvent(timestamp_hint=ts, event_type=event_type,
                        symbol=symbol, data=data)
        self.events.append(ev)
        return ev

    # ---------- main entry point ----------

    def poll(
        self,
        now: datetime,
        quotes: Dict[str, Quote],
        portfolios: List[PortfolioEngine],
        build_signal_fn: Optional[Callable[[WatchedSymbol, Quote], object]] = None,
    ) -> List[object]:
        """
        One scheduling tick.

        - Skips non-trading times (weekend/holiday/outside session).
        - For each due watched symbol: check trigger idempotently.
        - On fire: claim key -> route signal through portfolios ->
          log events. On downstream failure: release claim.
        - Checks stops on OPEN positions using session lows/highs
          with gap-aware fill references.

        Returns list of results (ExecutedTrade | SkippedTrade | WatchEvent).
        """
        results: List[object] = []
        ts = now.isoformat(timespec="seconds")

        # --- market-hours gate ---
        if not self.calendar.is_open(now):
            for sym in list(self.watched.keys()):
                results.append(self._log(ts, "poll_skipped_market_closed", sym))
            # Stops can still be hit at open gaps; but outside sessions there
            # is nothing to act on. Position checks resume next session tick.
            return results

        for symbol, w in list(self.watched.items()):
            # --- per-symbol cadence gate ---
            if w.last_polled_at is not None:
                elapsed = (now - w.last_polled_at).total_seconds() / 60.0
                if elapsed < w.poll_interval_minutes:
                    continue

            q = quotes.get(symbol)
            if q is None:
                w.last_polled_at = now
                continue

            # serialize per-symbol work
            lock = self.locks.acquire(symbol)
            try:
                out = self._process_symbol(w, q, now, portfolios, build_signal_fn)
                results.extend(out)
                w.last_polled_at = now
            finally:
                lock.release()

        # --- position protection: stops on open positions ---
        for pe in portfolios:
            for sym in list(pe.open_positions.keys()):
                pos = pe.open_positions[sym]
                q = quotes.get(sym)
                if q is None:
                    continue
                hit, fill_ref = self._check_stop(pos.direction,
                                                 pos.current_stop, q)
                if hit:
                    results.append(self._log(
                        ts, "stop_would_trigger_gap", sym,
                        stop=str(pos.current_stop),
                        session_low=str(q.low) if q.low else None,
                        session_high=str(q.high) if q.high else None,
                        fill_ref=str(fill_ref),
                    ))
                    # Actual close execution is delegated to the portfolio's
                    # own check_stops_and_exits with full OHLC bars; here we
                    # only flag + record the intraday observation so ops/
                    # ledger sees the gap context.

        return results

    # ---------- internals ----------

    @staticmethod
    def _check_stop(direction: TradeDirection, stop: Decimal,
                    q: Quote) -> Tuple[bool, Decimal]:
        """Gap-aware stop touch check. Returns (hit, fill_reference)."""
        if direction == TradeDirection.LONG:
            ref_low = q.low if q.low is not None else q.price
            if ref_low <= stop:
                open_px = q.open if q.open is not None else ref_low
                return True, min(stop, open_px)
        else:
            ref_high = q.high if q.high is not None else q.price
            if ref_high >= stop:
                open_px = q.open if q.open is not None else ref_high
                return True, max(stop, open_px)
        return False, ZERO

    def _process_symbol(
        self,
        w: WatchedSymbol,
        q: Quote,
        now: datetime,
        portfolios: List[PortfolioEngine],
        build_signal_fn: Optional[Callable],
    ) -> List[object]:
        ts = now.isoformat(timespec="seconds")
        out: List[object] = []

        # --- trigger condition ---
        triggered = (
            q.price > w.breakout_level
            if w.direction == TradeDirection.LONG
            else q.price < w.breakout_level
        )
        if not triggered:
            out.append(self._log(ts, "poll_executed", w.symbol,
                                 price=str(q.price),
                                 distance=str(q.price - w.breakout_level)))
            return out

        key = _signal_key(w.symbol, w.system_name, w.direction, w.channel_date)

        # --- IDEMPOTENCY GATE ---
        if not self.registry.try_claim(key):
            out.append(self._log(ts, "trigger_duplicate_suppressed",
                                 w.symbol, key=key))
            return out

        out.append(self._log(ts, "trigger_fired", w.symbol,
                             price=str(q.price),
                             breakout_level=str(w.breakout_level)))

        try:
            # Build IncomingSignal (or use injected builder for custom flows)
            if build_signal_fn is not None:
                sig = build_signal_fn(w, q)
            else:
                sig = IncomingSignal(
                    signal_id=f"sig-{w.symbol}-{w.channel_date}-{w.system_name}",
                    symbol=w.symbol,
                    direction=w.direction,
                    strategy_name=w.system_name,
                    strategy_version=w.strategy_version,
                    config_hash=w.config_hash,
                    trigger_date=q.timestamp.date().isoformat(),
                    trigger_price=q.price,
                    atr=w.atr,
                )

            routed = route_signal_to_portfolios(sig, portfolios)
            out.extend(r for batch in routed.values() for r in batch)

            out.append(self._log(ts, "position_opened" if any(
                hasattr(r, "event_type") and r.event_type == "position_opened"
                for batch in routed.values() for r in batch
            ) else "trade_skipped", w.symbol, signal_id=sig.signal_id))

            # Once fired and processed, stop watching intraday;
            # the position lifecycle takes over.
            self.disarm(w.symbol)
        except Exception as e:
            # Release the claim so a healthy retry can occur later.
            self.registry.release(key)
            logger.exception("Trigger processing failed for %s", w.symbol)
            out.append(self._log(ts, "poll_executed", w.symbol,
                                 error=str(e)))
        return out
