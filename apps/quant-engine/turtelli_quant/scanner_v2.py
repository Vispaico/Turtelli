# ============================================================
# Turtelli 2.0 — Daily Scanner & Adaptive Monitoring Queue
# ============================================================

"""
Nightly market scanner + state-dependent monitoring scheduler.

Flow (after market close):
1. For every active instrument, fetch daily bars via ManagedProvider
   (cached, retried, circuit-broken).
2. Validate bars; invalid data NEVER produces signals.
3. Compute 20d/55d Donchian channels, ATR(20), distances to breakout.
4. Classify each instrument into a MonitoringState.
5. Emit validated signals for confirmed breakouts (optionally
   cross-validated against a secondary provider).
6. Produce an AdaptiveQueue telling intraday watchers which symbols
   need higher-frequency polling and at what cadence.

Pure logic + injected provider. No DB, no network of its own.
"""

import logging
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from .turtle_engine import (
    DailyBar,
    StrategyConfig,
    TradeDirection,
    calculate_donchian_channel,
    calculate_atr,
)
from .data_validation import validate_bar_sequence

logger = logging.getLogger(__name__)

ZERO = Decimal("0")

# Default monitoring cadences (minutes). Configurable per deployment.
DEFAULT_CADENCES = {
    "NORMAL":          1440,   # daily only
    "WATCHING":        15,
    "NEAR_TRIGGER":    1,
    "ACTIVE_POSITION": 1,
    "NEAR_EXIT":       1,      # realtime tier handled by feed choice upstream
}

# Distance thresholds (percent from breakout level) — configurable.
DEFAULT_THRESHOLDS = {
    "WATCHING": Decimal("0.05"),     # within 5%
    "NEAR_TRIGGER": Decimal("0.01"), # within 1%
}


@dataclass
class InstrumentScan:
    """Result of scanning one instrument on one date."""
    symbol: str
    scan_date: str
    close: Decimal
    atr20: Optional[Decimal]

    # Channel levels (from PRIOR bars — anti-lookahead enforced downstream)
    high_20: Optional[Decimal] = None
    low_20: Optional[Decimal] = None
    high_55: Optional[Decimal] = None
    low_55: Optional[Decimal] = None

    state: str = "NORMAL"            # MonitoringState string

    # Distances as fraction of price (negative = already beyond level)
    long_dist_20_pct: Optional[Decimal] = None
    short_dist_20_pct: Optional[Decimal] = None
    long_dist_55_pct: Optional[Decimal] = None
    short_dist_55_pct: Optional[Decimal] = None

    validation_ok: bool = True
    validation_errors: List[str] = field(default_factory=list)
    signals: List["CandidateSignal"] = field(default_factory=list)


@dataclass
class CandidateSignal:
    """A confirmed breakout ready for portfolio routing."""
    symbol: str
    scan_date: str
    direction: TradeDirection
    system_name: str                  # "turtle_system_1" | "turtle_system_2"
    strategy_version: int
    config_hash: str
    trigger_price: Decimal
    breakout_level: Decimal           # channel level that was crossed
    exit_level: Decimal               # opposite channel exit reference
    atr: Decimal


class DailyScanner:
    """Scans a universe of symbols using injected data access."""

    def __init__(
        self,
        system1: Optional[StrategyConfig] = None,
        system2: Optional[StrategyConfig] = None,
        thresholds: Optional[Dict[str, Decimal]] = None,
        cadences: Optional[Dict[str, int]] = None,
    ):
        self.system1 = system1 or StrategyConfig(
            name="turtle_system_1", display_name="Turtle System 1",
            version=1, entry_days=20, exit_days=10,
            previous_winner_filter=False,
        )
        self.system2 = system2 or StrategyConfig(
            name="turtle_system_2", display_name="Turtle System 2",
            version=1, entry_days=55, exit_days=20,
            previous_winner_filter=False,
        )
        self.thresholds = thresholds or DEFAULT_THRESHOLDS
        self.cadences = cadences or DEFAULT_CADENCES

    # ---------- single instrument ----------

    def scan_instrument(
        self,
        symbol: str,
        bars: List[DailyBar],
        scan_date: str,
        open_symbols: Optional[set] = None,
        near_exit_symbols: Optional[set] = None,
    ) -> InstrumentScan:
        """
        Scan one symbol as of scan_date (the just-closed session).

        open_symbols / near_exit_symbols override classification for
        instruments with live positions (ACTIVE_POSITION / NEAR_EXIT).
        """
        s1, s2 = self.system1, self.system2
        min_bars = max(s2.entry_days, s1.entry_days, s1.atr_period + 1)

        scan = InstrumentScan(symbol=symbol, scan_date=scan_date,
                              close=bars[-1].close if bars else ZERO,
                              atr20=None)

        # ---- validation gate ----
        v = validate_bar_sequence(bars)
        if not v.is_valid:
            scan.validation_ok = False
            scan.validation_errors = v.errors[:5]
            scan.state = "NORMAL"
            return scan
        if len(bars) < min_bars:
            scan.validation_errors.append(
                f"insufficient_history:{len(bars)}<{min_bars}")
            scan.atr20 = None
            scan.state = "NORMAL"
            return scan

        current = bars[-1]
        prior = bars[:-1]   # channels/ATR use strictly prior bars

        # ---- indicators ----
        ch20 = calculate_donchian_channel(prior, s1.entry_days, scan_date)
        ch10 = calculate_donchian_channel(prior, s1.exit_days, scan_date)
        ch55 = calculate_donchian_channel(prior, s2.entry_days, scan_date)
        ch20x = calculate_donchian_channel(prior, s2.exit_days, scan_date)
        atr = calculate_atr(bars, s1.atr_period, scan_date)

        scan.close = current.close
        scan.atr20 = atr
        if ch20:
            scan.high_20, scan.low_20 = ch20.high, ch20.low
        if ch55:
            scan.high_55, scan.low_55 = ch55.high, ch55.low

        # ---- distances (fraction of close) ----
        def dist(level: Optional[Decimal], above: bool) -> Optional[Decimal]:
            if level is None or current.close <= 0:
                return None
            d = (level - current.close) / current.close
            return d if above else -d

        if ch20:
            scan.long_dist_20_pct = dist(ch20.high, above=True)     # positive if below level
            scan.short_dist_20_pct = dist(ch20.low, above=False)
        if ch55:
            scan.long_dist_55_pct = dist(ch55.high, above=True)
            scan.short_dist_55_pct = dist(ch55.low, above=False)

        # ---- confirmed breakouts (close beyond PRIOR channel) ----
        self._check_breakouts(scan, current, s1, ch20, ch10, "turtle_system_1")
        self._check_breakouts(scan, current, s2, ch55, ch20x, "turtle_system_2")

        # ---- classification ----
        scan.state = self._classify(scan, open_symbols, near_exit_symbols)
        return scan

    def _check_breakouts(
        self,
        scan: InstrumentScan,
        current: DailyBar,
        cfg: StrategyConfig,
        entry_ch,
        exit_ch,
        system_name: str,
    ) -> None:
        """Append CandidateSignals for closes beyond the prior channel."""
        if entry_ch is None:
            return
        c = current.close

        if c > entry_ch.high:
            scan.signals.append(CandidateSignal(
                symbol=scan.symbol, scan_date=scan.scan_date,
                direction=TradeDirection.LONG,
                system_name=system_name,
                strategy_version=cfg.version,
                config_hash=self._hash(cfg),
                trigger_price=c,
                breakout_level=entry_ch.high,
                exit_level=(exit_ch.high if exit_ch else entry_ch.low),
                atr=scan.atr20 or ZERO,
            ))
        elif c < entry_ch.low:
            scan.signals.append(CandidateSignal(
                symbol=scan.symbol, scan_date=scan.scan_date,
                direction=TradeDirection.SHORT,
                system_name=system_name,
                strategy_version=cfg.version,
                config_hash=self._hash(cfg),
                trigger_price=c,
                breakout_level=entry_ch.low,
                exit_level=(exit_ch.low if exit_ch else entry_ch.high),
                atr=scan.atr20 or ZERO,
            ))

    @staticmethod
    def _hash(cfg: StrategyConfig) -> str:
        import hashlib, json
        payload = {
            "name": cfg.name, "version": cfg.version,
            "entry_days": cfg.entry_days, "exit_days": cfg.exit_days,
            "atr_period": cfg.atr_period, "stop_n": str(cfg.stop_n),
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:16]

    def _classify(
        self,
        scan: InstrumentScan,
        open_symbols: Optional[set],
        near_exit_symbols: Optional[set],
    ) -> str:
        if near_exit_symbols and scan.symbol in near_exit_symbols:
            return "NEAR_EXIT"
        if open_symbols and scan.symbol in open_symbols:
            return "ACTIVE_POSITION"

        # Confirmed breakout today?
        if getattr(scan, "signals", None):
            return "NEAR_TRIGGER"   # triggered today -> highest watch tier

        best = self._closest_distance(scan)
        if best is None:
            return "NORMAL"
        if best <= self.thresholds["NEAR_TRIGGER"]:
            return "NEAR_TRIGGER"
        if best <= self.thresholds["WATCHING"]:
            return "WATCHING"
        return "NORMAL"

    @staticmethod
    def _closest_distance(scan: InstrumentScan) -> Optional[Decimal]:
        candidates = [
            scan.long_dist_20_pct, scan.short_dist_20_pct,
            scan.long_dist_55_pct, scan.short_dist_55_pct,
        ]
        positives = [c for c in candidates if c is not None and c >= 0]
        return min(positives) if positives else None

    # ---------- universe ----------

    def run_daily_scan(
        self,
        universe_bars: Dict[str, List[DailyBar]],
        scan_dates: Dict[str, str],
        open_symbols: Optional[set] = None,
        near_exit_symbols: Optional[set] = None,
    ) -> dict:
        """
        Scan the whole universe.

        Returns:
            {
              "scanned": int,
              "validation_failures": [symbol...],
              "candidates": [CandidateSignal...],
              "scans": {symbol: InstrumentScan},
            }
        """
        scans: Dict[str, InstrumentScan] = {}
        candidates: List[CandidateSignal] = []
        failures: List[str] = []

        for symbol, bars in universe_bars.items():
            if not bars:
                failures.append(f"{symbol}:no_data")
                continue
            date = scan_dates.get(symbol, bars[-1].date)
            scan = self.scan_instrument(
                symbol, bars, date,
                open_symbols=open_symbols, near_exit_symbols=near_exit_symbols,
            )
            scans[symbol] = scan
            if not scan.validation_ok:
                failures.append(f"{symbol}:{';'.join(scan.validation_errors)}")
                continue
            candidates.extend(getattr(scan, "signals", []))

        return {
            "scanned": len(scans),
            "validation_failures": failures,
            "candidates": sorted(
                candidates,
                key=lambda s: (
                    abs((s.breakout_level - s.trigger_price) / s.trigger_price)
                    if s.trigger_price > 0 else Decimal("999"),
                    s.symbol,
                ),
            ),
            "scans": scans,
        }


# ============================================================
# ADAPTIVE MONITORING QUEUE
# ============================================================

@dataclass
class QueueEntry:
    symbol: str
    state: str
    poll_interval_minutes: int
    reason: str


class AdaptiveMonitorQueue:
    """
    Converts scan results into a polling schedule.

    Two-speed data principle: only instruments CLOSE to something
    interesting get expensive polling; everything else waits for the
    next daily scan.
    """

    def __init__(
        self,
        cadences: Optional[Dict[str, int]] = None,
        thresholds: Optional[Dict[str, Decimal]] = None,
    ):
        self.cadences = cadences or DEFAULT_CADENCES
        self.thresholds = thresholds or DEFAULT_THRESHOLDS

    def build(self, scans: Dict[str, InstrumentScan]) -> List[QueueEntry]:
        entries: List[QueueEntry] = []
        for sym, scan in scans.items():
            state = scan.state
            interval = self.cadences.get(state, self.cadences["NORMAL"])

            reason = state.lower()
            if state == "WATCHING":
                best = DailyScanner._closest_distance(scan)
                reason = f"within {self.thresholds['WATCHING'] * 100:.0f}% of breakout"
                if best is not None:
                    reason += f" ({best * 100:.2f}% away)"
            elif state == "NEAR_TRIGGER":
                best = DailyScanner._closest_distance(scan)
                has_sig = bool(getattr(scan, "signals", None))
                reason = ("breakout triggered today" if has_sig
                          else f"very close to breakout ({best * 100:.2f}%" if best is not None else "")
                if not has_sig and best is not None:
                    reason += ")"
            elif state == "ACTIVE_POSITION":
                reason = "open position"
            elif state == "NEAR_EXIT":
                reason = "position approaching exit level"

            entries.append(QueueEntry(
                symbol=sym, state=state,
                poll_interval_minutes=interval, reason=reason,
            ))

        # Highest priority first
        priority = {"NEAR_EXIT": 0, "ACTIVE_POSITION": 1, "NEAR_TRIGGER": 2,
                    "WATCHING": 3, "NORMAL": 4}
        entries.sort(key=lambda e: priority.get(e.state, 9))
        return entries

    @staticmethod
    def poll_budget(entries: List[QueueEntry]) -> Dict[str, int]:
        """How many symbols poll at each cadence — cost visibility for ops."""
        budget: Dict[str, int] = {}
        for e in entries:
            budget[str(e.poll_interval_minutes)] = \
                budget.get(str(e.poll_interval_minutes), 0) + 1
        return budget
