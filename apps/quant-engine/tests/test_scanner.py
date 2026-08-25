# ============================================================
# Turtelli 2.0 — Daily Scanner & Adaptive Queue Tests
# ============================================================

"""
Known-outcome tests for the scanner and monitoring queue.

Fixtures are handcrafted so channel levels, distances, and
classifications can be verified by hand.
"""

import pytest
from decimal import Decimal
from typing import Dict, List

from turtelli_quant.turtle_engine import DailyBar, TradeDirection
from turtelli_quant.scanner_v2 import (
    AdaptiveMonitorQueue,
    CandidateSignal,
    DailyScanner,
    InstrumentScan,
)

D = Decimal


def bar(date: str, o: float, h: float, l: float, c: float) -> DailyBar:
    return DailyBar(date, D(str(o)), D(str(h)), D(str(l)), D(str(c)),
                    100000, D(str(c)))


from datetime import date, timedelta

_EPOCH = date(2026, 1, 1)


def _dates(n: int, start: "date | None" = None) -> List["date"]:
    d0 = start or _EPOCH
    return [d0 + timedelta(days=i) for i in range(n)]


def flat_series(start_price: float = 100.0, days: int = 30,
                width: float = 1.0,
                start_date: "date | None" = None) -> List[DailyBar]:
    """
    Flat close series with configurable channel width.
    Default width=1 → close sits 1% from breakout (WATCHING/NEAR).
    width=6 → 6% away (NORMAL).
    """
    return [
        bar(d.isoformat(), start_price, start_price + width,
            start_price - width, start_price)
        for d in _dates(days, start_date)
    ]


def rising_series(days: int = 60, base: float = 100.0,
                  start_date: "date | None" = None) -> List[DailyBar]:
    """
    Uptrend where each close makes a new high (high == close).
    Guarantees a LONG breakout on the last bar.
    """
    ds = _dates(days, start_date)
    bars = []
    price = base
    for d in ds:
        o = price
        c = price + 1.0
        bars.append(bar(d.isoformat(), o, c, o - 0.5, c))
        price = c
    return bars


def downtrend_series(days: int = 60, base: float = 200.0) -> List[DailyBar]:
    """Downtrend where each close makes a new low (low == close)."""
    ds = _dates(days)
    bars = []
    price = base
    for d in ds:
        o = price
        c = price - 1.0
        bars.append(bar(d.isoformat(), o, o + 0.5, c, c))
        price = c
    return bars


SCAN_DATE = (_EPOCH + timedelta(days=59)).isoformat()   # matches 60-bar fixtures


# ============================================================
# SCANNER: INDICATORS
# ============================================================

class TestScanIndicators:
    def test_flat_instrument_is_normal(self):
        """Wide-range flat: 6% from breakout → NORMAL."""
        bars = flat_series(days=60, width=6.0)
        scanner = DailyScanner()
        scan = scanner.scan_instrument("FLAT", bars, SCAN_DATE)
        assert scan.validation_ok is True
        assert scan.state == "NORMAL"
        assert len(scan.signals) == 0
        # Channels computed from prior bars
        assert scan.high_20 == D("106")   # max high of prior bars
        assert scan.low_20 == D("94")

    def test_channels_use_prior_bars_only(self):
        """
        ANTI-LOOKAHEAD: the final bar's extreme high must NOT appear in
        the reported channel levels.
        """
        bars = flat_series(days=60)
        extreme_d = _EPOCH + timedelta(days=60)
        bars.append(bar(extreme_d.isoformat(), 100, 500, 50, 400))

        scanner = DailyScanner()
        scan = scanner.scan_instrument("X", bars, extreme_d.isoformat())
        # Channel must still reflect the flat history, not today's spike
        assert scan.high_20 == D("101")
        assert scan.low_20 == D("99")

    def test_uptrend_triggers_long_breakout(self):
        bars = rising_series(days=60)
        scanner = DailyScanner()
        scan = scanner.scan_instrument("UP", bars, SCAN_DATE)

        longs = [s for s in scan.signals if s.direction == TradeDirection.LONG]
        assert len(longs) >= 1
        sig = longs[0]
        # Trigger close exceeds the prior 20-day high
        assert sig.trigger_price > sig.breakout_level
        assert sig.atr > 0
        assert sig.system_name == "turtle_system_1"

    def test_downtrend_triggers_short_breakout(self):
        bars = downtrend_series(days=60)
        scanner = DailyScanner()
        scan = scanner.scan_instrument("DOWN", bars, SCAN_DATE)

        shorts = [s for s in scan.signals if s.direction == TradeDirection.SHORT]
        assert len(shorts) >= 1
        sig = shorts[0]
        assert sig.trigger_price < sig.breakout_level

    def test_both_systems_reported(self):
        """
        A strong trend breaks BOTH the 20-day and 55-day channels.
        Expect signals from system_1 AND system_2.
        """
        bars = rising_series(days=80)
        scanner = DailyScanner()
        scan = scanner.scan_instrument("TRENDY", bars, SCAN_DATE)
        systems = {s.system_name for s in scan.signals}
        assert systems == {"turtle_system_1", "turtle_system_2"}


# ============================================================
# SCANNER: VALIDATION GATE
# ============================================================

class TestValidationGate:
    def test_duplicate_bars_fail_validation(self):
        bars = flat_series(days=30)
        bars.append(bars[-1])   # duplicate last bar
        # keep dates strictly increasing? duplicate dates -> validation error
        scanner = DailyScanner()
        scan = scanner.scan_instrument("DUP", bars, SCAN_DATE)
        assert scan.validation_ok is False
        assert len(scan.signals) == 0   # NO SIGNALS FROM BAD DATA

    def test_non_chronological_fails(self):
        bars = flat_series(days=10)
        bars[3], bars[5] = bars[5], bars[3]
        scanner = DailyScanner()
        scan = scanner.scan_instrument("ORDER", bars, SCAN_DATE)
        assert scan.validation_ok is False

    def test_insufficient_history_no_crash_no_signal(self):
        bars = flat_series(days=10)     # < 55 needed for System 2
        scanner = DailyScanner()
        scan = scanner.scan_instrument("SHORT", bars, SCAN_DATE)
        # May compute System 1 if enough for 20d; must not crash or emit S2
        systems = {s.system_name for s in scan.signals}
        assert "turtle_system_2" not in systems

    def test_empty_universe_entry_recorded_as_failure(self):
        scanner = DailyScanner()
        result = scanner.run_daily_scan({"EMPTY": []}, {"EMPTY": SCAN_DATE})
        assert any("no_data" in f for f in result["validation_failures"])


# ============================================================
# CLASSIFICATION & DISTANCES
# ============================================================

class TestClassification:
    def test_distance_calculations(self):
        """
        Flat at 100 with channel high 101:
        long distance = (101-100)/100 = exactly 1% → NEAR_TRIGGER boundary
        (threshold is <=1%). Verify the math precisely and the tier.
        """
        bars = flat_series(days=60)
        scanner = DailyScanner()
        scan = scanner.scan_instrument("W", bars, SCAN_DATE)
        assert scan.long_dist_20_pct is not None
        expected = (D("101") - D("100")) / D("100")
        assert abs(scan.long_dist_20_pct - expected) < D("0.000001")
        assert scan.long_dist_20_pct <= D("0.01")     # within near-trigger band
        assert scan.state in ("NEAR_TRIGGER", "WATCHING")

    def test_watching_band(self):
        """Between 1% and 5% away → WATCHING."""
        # width=3: close sits 3% below the +3 high
        bars = flat_series(days=60, width=3.0)
        scan = DailyScanner().scan_instrument("MID", bars, SCAN_DATE)
        d = scan.long_dist_20_pct
        assert d is not None and D("0.01") < d <= D("0.05")
        assert scan.state == "WATCHING"

    def test_near_trigger_tier(self):
        """Close within 1% of breakout level -> NEAR_TRIGGER, not triggered."""
        bars = flat_series(days=59)                       # high=101, low=99
        final_d = _EPOCH + timedelta(days=59)
        bars.append(bar(final_d.isoformat(), 100.5, 100.8, 100.4, 100.95))
        scan_date = final_d.isoformat()

        scanner = DailyScanner()
        scan = scanner.scan_instrument("NEAR", bars, scan_date)
        dist = scan.long_dist_20_pct
        assert dist is not None and dist <= D("0.01")
        assert scan.state == "NEAR_TRIGGER"
        # Not a confirmed breakout (close 100.95 < high 101)
        assert len(scan.signals) == 0

    def test_open_position_overrides_to_active(self):
        bars = flat_series(days=60)
        scanner = DailyScanner()
        scan = scanner.scan_instrument(
            "HELD", bars, SCAN_DATE, open_symbols={"HELD"})
        assert scan.state == "ACTIVE_POSITION"

    def test_near_exit_highest_priority(self):
        bars = flat_series(days=60)
        scanner = DailyScanner()
        scan = scanner.scan_instrument(
            "EXITING", bars, SCAN_DATE,
            open_symbols={"EXITING"}, near_exit_symbols={"EXITING"})
        assert scan.state == "NEAR_EXIT"

    def test_triggered_today_classified_near_trigger(self):
        bars = rising_series(days=60)
        scanner = DailyScanner()
        scan = scanner.scan_instrument("TRIG", bars, SCAN_DATE)
        assert scan.signals          # breakout confirmed
        assert scan.state == "NEAR_TRIGGER"


# ============================================================
# UNIVERSE SCAN
# ============================================================

class TestUniverseScan:
    def test_mixed_universe(self):
        universe = {
            "UP": rising_series(days=60),
            "DOWN": downtrend_series(days=60),
            "FLAT": flat_series(days=60),
        }
        dates = {sym: SCAN_DATE for sym in universe}
        scanner = DailyScanner()
        result = scanner.run_daily_scan(universe, dates)

        assert result["scanned"] == 3
        assert result["validation_failures"] == []

        by_symbol_dir = {(c.symbol, c.direction) for c in result["candidates"]}
        assert ("UP", TradeDirection.LONG) in by_symbol_dir
        assert ("DOWN", TradeDirection.SHORT) in by_symbol_dir

        states = {sym: s.state for sym, s in result["scans"].items()}
        assert states["UP"] == "NEAR_TRIGGER"      # breakout confirmed today
        assert states["DOWN"] == "NEAR_TRIGGER"

    def test_candidates_sorted_by_breakout_proximity(self):
        """
        Two breakouts: one barely beyond its level, one far beyond.
        The marginal one should sort first.
        """
        near = rising_series(days=60)                    # close just past high
        far = [bar(b.date, float(b.open), float(b.high),
                   float(b.low), float(b.close) * 1.05)
               for b in rising_series(days=60)]           # close ~5% past high

        result = DailyScanner().run_daily_scan(
            {"NEARLY": near, "FARAWAY": far},
            {"NEARLY": SCAN_DATE, "FARAWAY": SCAN_DATE})

        assert len(result["candidates"]) >= 2
        first = result["candidates"][0]
        # Sorted ascending by |level-price|/price → marginal breakout first
        overshoot_first = abs(first.breakout_level - first.trigger_price) / first.trigger_price
        for other in result["candidates"][1:]:
            o = abs(other.breakout_level - other.trigger_price) / other.trigger_price
            assert overshoot_first <= o


# ============================================================
# ADAPTIVE QUEUE
# ============================================================

class TestAdaptiveQueue:
    def _scans(self):
        # Realistic mix: mostly quiet instruments, a few hot ones
        universe = {
            "UP": rising_series(days=60),                       # triggered today
            "HELD": flat_series(days=60, width=6.0),            # open position
            "EXITING": flat_series(days=60, width=6.0),         # near exit
            **{f"QUIET{i}": flat_series(days=60, width=6.0)
               for i in range(6)},                              # daily-only
        }
        dates = {s: SCAN_DATE for s in universe}
        return DailyScanner().run_daily_scan(
            universe, dates,
            open_symbols={"HELD"},
            near_exit_symbols={"EXITING"},
        )

    def test_priority_ordering(self):
        scans = self._scans()["scans"]
        queue = AdaptiveMonitorQueue().build(scans)
        states = [e.state for e in queue]
        # NEAR_EXIT first, NORMAL last
        assert states[0] == "NEAR_EXIT"
        assert states[-1] == "NORMAL"

    def test_cadences_assigned(self):
        scans = self._scans()["scans"]
        queue = AdaptiveMonitorQueue().build(scans)
        cadence_by_state = {e.state: e.poll_interval_minutes for e in queue}
        assert cadence_by_state.get("NEAR_EXIT") == 1
        assert cadence_by_state.get("ACTIVE_POSITION") == 1
        assert cadence_by_state.get("NEAR_TRIGGER") == 1
        assert cadence_by_state.get("NORMAL") == 1440
        # WATCHING band tested separately via test_watching_band pipeline

    def test_two_speed_budget(self):
        """
        THE POINT of two-speed monitoring: most of the universe stays on
        daily polling; only a small fraction gets expensive intraday.
        """
        scans = self._scans()["scans"]
        entries = AdaptiveMonitorQueue().build(scans)
        budget = AdaptiveMonitorQueue.poll_budget(entries)

        daily_count = budget.get("1440", 0)
        frequent = sum(v for k, v in budget.items() if k != "1440")
        assert daily_count >= frequent, (
            "Two-speed violation: more instruments on expensive "
            "polling than daily"
        )
        assert sum(budget.values()) == len(entries)

    def test_every_entry_has_reason(self):
        scans = self._scans()["scans"]
        queue = AdaptiveMonitorQueue().build(scans)
        for e in queue:
            assert e.reason, f"empty reason for {e.symbol}"


# ============================================================
# INTEGRATION: SCANNER -> PORTFOLIOS
# ============================================================

class TestScanToPortfolioPipeline:
    def test_candidate_routes_through_dual_portfolios(self):
        """
        Full pipeline: scan produces candidate -> both portfolios respond.
        """
        from turtelli_quant.portfolio_engine import (
            PortfolioEngine, MICRO_SETTINGS, STANDARD_SETTINGS,
            IncomingSignal, route_signal_to_portfolios,
        )

        bars = rising_series(days=60)
        scan = DailyScanner().scan_instrument("PIPE", bars, SCAN_DATE)
        cand = next(s for s in scan.signals if s.direction == TradeDirection.LONG)

        signal = IncomingSignal(
            signal_id=f"sig-{cand.symbol}-{cand.scan_date}",
            symbol=cand.symbol,
            direction=cand.direction,
            strategy_name=cand.system_name,
            strategy_version=cand.strategy_version,
            config_hash=cand.config_hash,
            trigger_date=cand.scan_date,
            trigger_price=cand.trigger_price,
            atr=cand.atr,
        )

        micro = PortfolioEngine(MICRO_SETTINGS)
        std = PortfolioEngine(STANDARD_SETTINGS)
        results = route_signal_to_portfolios(signal, [micro, std])

        # Rising prices from ~100: Micro affords it, Standard affords it
        assert any(hasattr(r, "event_type") for r in results.values()) or all(
            hasattr(r[0], "reason") for r in results.values())
        # Every portfolio produced exactly ONE outcome (open or skip)
        assert all(len(r) == 1 for r in results.values())

    def test_end_to_end_with_real_provider_shape(self):
        """
        Scan using MockProvider-shaped data (deterministic), verifying the
        interface boundary works without network.
        """
        from turtelli_quant.market_data.mock import MockProvider
        from turtelli_quant.market_data.registry import ManagedProvider

        bars = rising_series(days=70)
        mp = MockProvider(daily_bars={"REAL": bars})
        managed = ManagedProvider(mp)

        fetched = managed.get_daily_bars("REAL")
        result = DailyScanner().run_daily_scan(
            {"REAL": fetched}, {"REAL": fetched[-1].date})
        assert result["scanned"] == 1
        assert len(result["candidates"]) >= 1
