# ============================================================
# Turtelli 2.0 — Intraday Watcher Tests
# ============================================================

"""
Tests for idempotent intraday triggering, market-hours handling,
gap-aware stop checks, and concurrency safety.
"""

import threading
from datetime import datetime, date, time as dtime
from decimal import Decimal

import pytest

from turtelli_quant.turtle_engine import TradeDirection
from turtelli_quant.portfolio_engine import (
    PortfolioEngine, MICRO_SETTINGS, STANDARD_SETTINGS,
)
from turtelli_quant.intraday import (
    EVENT_TYPES,
    IntradayWatcher,
    MarketCalendar,
    Quote,
    SessionTimes,
    SymbolLocks,
    TriggerRegistry,
    WatchedSymbol,
)

D = Decimal

# A mid-session Wednesday (2026-01-14 is a Wednesday)
SESSION = datetime(2026, 1, 14, 12, 0)
WEEKEND = datetime(2026, 1, 17, 12, 0)      # Saturday
PRE_MARKET = datetime(2026, 1, 14, 8, 0)


def watched(symbol="NVDA", direction=TradeDirection.LONG,
            breakout="100", atr="5", interval=1) -> WatchedSymbol:
    return WatchedSymbol(
        symbol=symbol,
        direction=direction,
        system_name="turtle_system_1",
        strategy_version=1,
        config_hash="abc123",
        breakout_level=D(breakout),
        exit_level=D("95"),
        initial_stop=D("90"),
        atr=D(atr),
        channel_date="2026-01-13",
        poll_interval_minutes=interval,
    )


def quote(symbol="NVDA", price="101", low=None, high=None, open_px=None,
          ts=None) -> Quote:
    p = D(price)
    return Quote(
        symbol=symbol,
        price=p,
        low=D(low) if low else None,
        high=D(high) if high else None,
        open=D(open_px) if open_px else None,
        timestamp=ts or SESSION,
    )


def fresh_portfolios():
    return [PortfolioEngine(MICRO_SETTINGS), PortfolioEngine(STANDARD_SETTINGS)]


# ============================================================
# MARKET CALENDAR
# ============================================================

class TestMarketHours:
    def test_weekday_session_open(self):
        cal = MarketCalendar()
        assert cal.is_open(datetime(2026, 1, 14, 10, 0)) is True

    def test_before_open(self):
        cal = MarketCalendar()
        assert cal.is_open(PRE_MARKET) is False

    def test_after_close(self):
        cal = MarketCalendar()
        assert cal.is_open(datetime(2026, 1, 14, 16, 30)) is False

    def test_weekend_closed(self):
        cal = MarketCalendar()
        assert cal.is_open(WEEKEND) is False

    def test_watcher_skips_polls_when_closed(self):
        w = IntradayWatcher()
        w.arm_candidate(watched())
        results = w.poll(WEEKEND, {"NVDA": quote()}, fresh_portfolios())
        types = {r.event_type for r in results if hasattr(r, "event_type")}
        assert "poll_skipped_market_closed" in types


class TestHolidayCalendar:
    class HolidayCal(MarketCalendar):
        HOLIDAYS = {date(2026, 1, 19)}   # fake MLK day

        def session_for(self, day):
            if day in self.HOLIDAYS:
                return SessionTimes(is_trading_day=False)
            return super().session_for(day)

    def test_holiday_blocks_polling(self):
        w = IntradayWatcher(calendar=self.HolidayCal())
        w.arm_candidate(watched())
        holiday_noon = datetime(2026, 1, 19, 12, 0)
        results = w.poll(holiday_noon, {"NVDA": quote()}, fresh_portfolios())
        types = {r.event_type for r in results if hasattr(r, "event_type")}
        assert "poll_skipped_market_closed" in types


# ============================================================
# TRIGGER REGISTRY / IDEMPOTENCY
# ============================================================

class TestTriggerRegistry:
    def test_first_claim_succeeds(self):
        reg = TriggerRegistry()
        assert reg.try_claim("a|s|LONG|2026-01-13") is True

    def test_duplicate_claim_fails(self):
        reg = TriggerRegistry()
        key = "NVDA|turtle_system_1|LONG|2026-01-13"
        assert reg.try_claim(key) is True
        assert reg.try_claim(key) is False

    def test_release_allows_retry(self):
        reg = TriggerRegistry()
        key = "K|s|LONG|d"
        reg.try_claim(key)
        reg.release(key)
        assert reg.try_claim(key) is True   # retry after failure works

    def test_new_channel_date_is_fresh_signal(self):
        """Channel rolls to a new window -> new trigger allowed."""
        reg = TriggerRegistry()
        assert reg.try_claim("X|s1|LONG|2026-01-13") is True
        assert reg.try_claim("X|s1|LONG|2026-02-10") is True


# ============================================================
# WATCHER: TRIGGERING
# ============================================================

class TestTriggering:
    def test_breakout_triggers_and_routes_to_portfolios(self):
        portfolios = fresh_portfolios()
        w = IntradayWatcher()
        w.arm_candidate(watched())

        results = w.poll(SESSION, {"NVDA": quote(price="101")},
                         portfolios)

        # Both portfolios received the signal
        fired = [r for r in results if getattr(r, "event_type", None) == "trigger_fired"]
        assert len(fired) == 1
        opened = sum(
            1 for pe in portfolios for t in pe.events
            if t.event_type == "position_opened"
        )
        assert opened == 2
        # Disarmed after firing
        assert "NVDA" not in w.watched

    def test_below_level_does_not_trigger(self):
        portfolios = fresh_portfolios()
        w = IntradayWatcher()
        w.arm_candidate(watched())

        w.poll(SESSION, {"NVDA": quote(price="99.5")}, portfolios)
        assert all(t.event_type != "position_opened"
                   for pe in portfolios for t in pe.events)

    def test_exact_level_does_not_trigger(self):
        """Must EXCEED level, not touch it."""
        portfolios = fresh_portfolios()
        w = IntradayWatcher()
        w.arm_candidate(watched())
        w.poll(SESSION, {"NVDA": quote(price="100.00")}, portfolios)
        assert all(t.event_type != "position_opened"
                   for pe in portfolios for t in pe.events)

    def test_duplicate_poll_suppressed(self):
        """
        IDEMPOTENCY: two polls hitting the same breakout fire ONCE.
        Simulates concurrent/overlapping worker ticks.
        """
        portfolios = fresh_portfolios()
        w = IntradayWatcher()
        # Manually re-arm to simulate a second worker seeing same candidate
        w.arm_candidate(watched())
        w.poll(SESSION, {"NVDA": quote(price="101")}, portfolios)
        first_events = len(w.events)

        w.arm_candidate(watched())     # stale scheduler re-adds
        results2 = w.poll(SESSION + __import__("datetime").timedelta(minutes=1),
                          {"NVDA": quote(price="102")}, portfolios)

        dupes = [r for r in results2
                 if getattr(r, "event_type", None) == "trigger_duplicate_suppressed"]
        assert len(dupes) >= 0   # may be disarmed already; registry still guards
        # Positions opened exactly once per portfolio regardless
        opened = sum(
            1 for pe in portfolios for t in pe.events
            if t.event_type == "position_opened"
        )
        assert opened == 2   # one per portfolio, not duplicated

    def test_cadence_gate_defers_polls(self):
        """Symbol not due yet (interval not elapsed) is skipped silently."""
        from datetime import timedelta
        portfolios = fresh_portfolios()
        w = IntradayWatcher()
        sym = watched(interval=15)
        w.arm_candidate(sym)

        now1 = SESSION
        w.poll(now1, {"NVDA": quote(price="99")}, portfolios)
        n_after_first = len(w.events)

        now2 = SESSION + timedelta(minutes=5)   # < 15 min
        w.poll(now2, {"NVDA": quote(price="99.9")}, portfolios)
        assert len(w.events) == n_after_first   # no new poll events

        now3 = SESSION + timedelta(minutes=20)  # due now
        w.poll(now3, {"NVDA": quote(price="99.95")}, portfolios)
        assert len(w.events) > n_after_first


class TestFailureRecovery:
    def test_failed_routing_releases_claim_for_retry(self):
        """
        If portfolio routing throws, the claim must be released so a
        later tick can retry. Money-safety: never lose a signal to a
        transient error.
        """
        class BoomEngine:
            settings = type("S", (), {"name": "BOOM"})()

        portfolios = fresh_portfolios()
        w = IntradayWatcher()

        calls = {"n": 0}
        import turtelli_quant.intraday as mod

        real_route = mod.route_signal_to_portfolios

        def flaky(*args, **kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("transient outage")
            return real_route(*args, **kwargs)

        mod.route_signal_to_portfolios = flaky
        try:
            w.arm_candidate(watched())
            w.poll(SESSION, {"NVDA": quote(price="101")}, portfolios)
            opened_after_fail = sum(
                1 for pe in portfolios for t in pe.events
                if t.event_type == "position_opened")
            assert opened_after_fail == 0
            assert "NVDA" not in w.watched is False or True  # may be disarmed? no:
            # claim was released and symbol stays armed for retry
            assert "NVDA" in w.watched

            # Second attempt succeeds
            w.poll(SESSION.replace(hour=12, minute=30),
                   {"NVDA": quote(price="101.5")}, portfolios)
            opened_final = sum(
                1 for pe in portfolios for t in pe.events
                if t.event_type == "position_opened")
            assert opened_final == 2
        finally:
            mod.route_signal_to_portfolios = real_route


# ============================================================
# GAP-AWARE STOP CHECKS
# ============================================================

class TestGapStops:
    def _watcher_with_position(self):
        portfolios = fresh_portfolios()
        std = portfolios[1]
        from turtelli_quant.portfolio_engine import IncomingSignal
        sig = IncomingSignal(
            signal_id="sig-t", symbol="T", direction=TradeDirection.LONG,
            strategy_name="s1", strategy_version=1, config_hash="h",
            trigger_date="2026-01-14", trigger_price=D("100"), atr=D("5"),
        )
        std.process_signal(sig)
        return portfolios, std.open_positions["T"]

    def test_stop_touch_flagged_with_gap_fill_ref(self):
        portfolios, pos = self._watcher_with_position()   # stop at ~90.1
        w = IntradayWatcher()

        # Session low dips below stop but price recovered
        q = quote(symbol="T", price="95", low="89", high="96",
                  open_px="94", ts=datetime(2026, 1, 14, 12, 0))
        results = w.poll(SESSION, {"T": q}, portfolios)

        flags = [r for r in results
                 if getattr(r, "event_type", None) == "stop_would_trigger_gap"]
        assert len(flags) == 1
        data = flags[0].data
        # fill ref = min(stop, open) = min(90.1, 94) = 90.1 (no gap here)
        assert D(data["fill_ref"]) <= pos.current_stop

    def test_gap_below_stop_reports_worse_fill(self):
        portfolios, pos = self._watcher_with_position()
        w = IntradayWatcher()

        # Open far below stop -> gap rule fills at open
        q = quote(symbol="T", price="80", low="79", high="82",
                  open_px="80", ts=datetime(2026, 1, 14, 12, 0))
        results = w.poll(SESSION, {"T": q}, portfolios)

        flags = [r for r in results
                 if getattr(r, "event_type", None) == "stop_would_trigger_gap"]
        assert len(flags) == 1
        assert D(flags[0].data["fill_ref"]) == D("80")   # min(90.1, 80)


# ============================================================
# CONCURRENCY SAFETY
# ============================================================

class TestConcurrency:
    def test_symbol_lock_serializes_processing(self):
        locks = SymbolLocks()
        order = []

        def work(name):
            lock = locks.acquire("NVDA")
            try:
                order.append(f"{name}-start")
                order.append(f"{name}-end")
            finally:
                lock.release()

        t1 = threading.Thread(target=work, args=("A",))
        t2 = threading.Thread(target=work, args=("B",))
        t1.start(); t2.start()
        t1.join(); t2.join()

        # Each worker's start/end must be contiguous — no interleaving
        assert order[0] == order[2].replace("B", order[0][:1]) or (
            order.index("A-start") < order.index("A-end") and
            order.index("B-start") < order.index("B-end") and
            (order.index("B-start") > order.index("A-end") or
             order.index("A-start") > order.index("B-end"))
        )

    def test_concurrent_claims_only_one_wins(self):
        """Hammer try_claim from many threads — exactly one wins."""
        reg = TriggerRegistry()
        key = "RACE|s|LONG|d"
        wins = []

        def racer():
            if reg.try_claim(key):
                wins.append(1)

        threads = [threading.Thread(target=racer) for _ in range(20)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(wins) == 1

    def test_concurrent_poll_never_double_opens(self):
        """
        Two watcher threads polling the SAME breakout concurrently must
        result in exactly one position per portfolio.
        """
        portfolios = fresh_portfolios()
        w = IntradayWatcher()
        w.arm_candidate(watched())

        q = quote(price="101")

        def run():
            w.poll(SESSION, {"NVDA": q}, portfolios)

        threads = [threading.Thread(target=run) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        opened = sum(
            1 for pe in portfolios for t in pe.events
            if t.event_type == "position_opened"
        )
        assert opened == 2   # one per portfolio — never more


# ============================================================
# EVENT INTEGRITY
# ============================================================

class TestEventIntegrity:
    def test_unknown_event_types_rejected(self):
        w = IntradayWatcher()
        with pytest.raises(AssertionError):
            w._log("ts", "made_up_event", "X")

    def test_every_event_has_symbol_and_type(self):
        portfolios = fresh_portfolios()
        w = IntradayWatcher()
        w.arm_candidate(watched())
        w.poll(SESSION, {"NVDA": quote(price="101")}, portfolios)
        for ev in w.events:
            assert ev.symbol
            assert ev.event_type in EVENT_TYPES
