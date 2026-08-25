# ============================================================
# Turtelli 2.0 — Dual Portfolio Engine Tests
# ============================================================

"""
Known-outcome tests for the dual portfolio system.

Key invariants tested:
- Equity conservation (money never appears/vanishes)
- Independent sizing per portfolio from identical signals
- Every skip carries an explicit reason
- Append-only event ledger; no reset capability
- Micro vs Standard behavioral divergence is legitimate and recorded
"""

import pytest
from decimal import Decimal
from typing import List

from turtelli_quant.turtle_engine import DailyBar, TradeDirection
from turtelli_quant.portfolio_engine import (
    IncomingSignal,
    PortfolioEngine,
    PortfolioSettings,
    MICRO_SETTINGS,
    STANDARD_SETTINGS,
    SKIP_REASONS,
    route_signal_to_portfolios,
)

D = Decimal


def signal(
    symbol: str = "NVDA",
    direction: TradeDirection = TradeDirection.LONG,
    price: str = "100",
    atr: str = "5",
    date: str = "2026-01-15",
    sector: str | None = "Technology",
) -> IncomingSignal:
    return IncomingSignal(
        signal_id=f"sig-{symbol}-{date}",
        symbol=symbol,
        direction=direction,
        strategy_name="turtle_system_1",
        strategy_version=1,
        config_hash="abc123",
        trigger_date=date,
        trigger_price=D(price),
        atr=D(atr),
        sector=sector,
    )


def bar(date, o, h, l, c):
    return DailyBar(date, D(str(o)), D(str(h)), D(str(l)), D(str(c)), 100000, D(str(c)))


class TestInception:
    def test_micro_starts_at_600(self):
        pe = PortfolioEngine(MICRO_SETTINGS)
        assert pe.cash == D("600")
        assert pe.equity() == D("600")

    def test_standard_starts_at_10000(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        assert pe.cash == D("10000")

    def test_inception_event_logged(self):
        pe = PortfolioEngine(MICRO_SETTINGS)
        assert len(pe.events) == 1
        assert pe.events[0].event_type == "portfolio_inception"
        assert pe.events[0].seq == 1


class TestSignalExecution:
    def test_identical_signal_taken_by_both(self):
        micro = PortfolioEngine(MICRO_SETTINGS)
        std = PortfolioEngine(STANDARD_SETTINGS)
        sig = signal()

        rmicro = micro.process_signal(sig)
        rstd = std.process_signal(sig)

        assert isinstance(rmicro[0], object)
        assert not isinstance(rmicro[0], type(None))
        # Both opened positions on same symbol
        assert "NVDA" in micro.open_positions
        assert "NVDA" in std.open_positions

    def test_sizes_independently(self):
        """
        Same signal, different portfolios:
        risk = equity * 2% ; qty = risk / (atr * 2N)
        fill = price * 1.001 (long slippage)

        Standard: risk=200, qty_raw=200/10=20 shares -> cost ~2004 << cash
        Micro:    risk=12,  qty_raw=12/10=1.2 -> floor to 1 share (no fractional)
        """
        micro = PortfolioEngine(MICRO_SETTINGS)
        std = PortfolioEngine(STANDARD_SETTINGS)
        sig = signal(atr="5", price="100")

        micro.process_signal(sig)
        std.process_signal(sig)

        mp = micro.open_positions["NVDA"]
        sp = std.open_positions["NVDA"]

        # Micro: whole shares only -> exactly 1
        assert mp.quantity == D("1")
        # Standard: fractional allowed -> 20.0000
        assert sp.quantity == D("20.0000")
        # Different quantities prove independent sizing
        assert sp.quantity != mp.quantity

    def test_entry_fill_has_slippage(self):
        """LONG entries fill above the trigger close."""
        pe = PortfolioEngine(STANDARD_SETTINGS)
        sig = signal(price="100")   # default slippage 0.1%
        pe.process_signal(sig)
        pos = pe.open_positions["NVDA"]
        expected = D("100") * D("1.001")
        assert pos.entry_price == expected

    def test_stop_is_2N_below_entry(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        sig = signal(price="100", atr="5")
        pe.process_signal(sig)
        pos = pe.open_positions["NVDA"]
        # stop = entry - 2*ATR = 100.1 - 10 = 90.1
        assert pos.current_stop == D("100.1") - D("10")

    def test_cash_deducted_exactly(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        before = pe.cash
        sig = signal(price="100", atr="5")
        pe.process_signal(sig)
        pos = pe.open_positions["NVDA"]
        assert pe.cash == before - pos.invested - pos.entry_commission


class TestSkipReasons:
    def test_insufficient_capital_micro(self):
        """
        Micro ($600): high-priced stock with wide ATR.
        risk = 600*0.02 = $12; ATR=$50, stopN=2 -> risk/share=$100
        raw qty = 0.12 -> floors to 0 -> skip insufficient_capital.
        """
        micro = PortfolioEngine(MICRO_SETTINGS)
        sig = signal(symbol="BRKA", price="500", atr="50")
        result = micro.process_signal(sig)
        assert result[0].reason == "insufficient_capital"
        assert "BRKA" not in micro.open_positions
        # skip is auditable
        assert any(e.event_type == "trade_skipped" for e in micro.events)

    def test_existing_position_skip(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        pe.process_signal(signal())
        result = pe.process_signal(signal(date="2026-01-16"))
        assert result[0].reason == "existing_position"

    def test_max_positions(self):
        settings = PortfolioSettings(
            name="TEST", display_name="T", initial_equity=D("100000"),
            max_risk_per_trade=D("0.02"), max_correlated_positions=99,
            max_total_positions=2, allow_fractional=True,
            commission=D("0"), slippage_percent=D("0"),
        )
        pe = PortfolioEngine(settings)
        for i, sym in enumerate(["A", "B"]):
            pe.process_signal(signal(symbol=sym, sector=None))
        result = pe.process_signal(signal(symbol="C", sector=None))
        assert result[0].reason == "max_positions"

    def test_all_skip_reasons_are_known_values(self):
        """Guards against typos in reason strings."""
        known = {"insufficient_capital", "risk_limit", "correlation_exposure",
                 "max_positions", "minimum_quantity", "existing_position",
                 "invalid_signal"}
        assert known == SKIP_REASONS

    def test_invalid_signal_rejected(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        bad = signal(atr="0")
        result = pe.process_signal(bad)
        assert result[0].reason == "invalid_signal"
        assert len(pe.open_positions) == 0


class TestExits:
    def _open_position(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        sig = signal(price="100", atr="5")     # stop at 90.1
        pe.process_signal(sig)
        return pe

    def test_stop_loss_closes_position(self):
        pe = self._open_position()
        bars = {"NVDA": bar("2026-01-16", 95, 96, 89, 90)}  # low breaches stop
        executed = pe.check_stops_and_exits("2026-01-16", bars, {})
        assert len(executed) == 1
        t = executed[0]
        assert t.event_type == "position_closed"
        assert t.reason == "stop_loss"
        # gap-aware fill: min(stop=90.1, open=95) = 90.1, minus slippage
        assert t.price == D("90.1") * D("0.999")
        assert "NVDA" not in pe.open_positions

    def test_gap_through_stop_fills_at_open(self):
        pe = self._open_position()
        bars = {"NVDA": bar("2026-01-16", 80, 85, 78, 84)}  # open way below stop
        executed = pe.check_stops_and_exits("2026-01-16", bars, {})
        t = executed[0]
        # fill ref = min(90.1, open=80) = 80; exit px = 80*0.999 = 79.92
        assert t.price == D("79.92")
        # qty=20, entry=100.10 -> loss = (79.92-100.10)*20 = -403.60
        # vs intended risk of $200 — gap doubled the loss, as gaps do.
        assert t.pnl == D("-403.60")
        assert t.pnl < D("-200")  # exceeded intended risk

    def test_exit_channel_close_based(self):
        pe = self._open_position()
        bars = {"NVDA": bar("2026-01-16", 92, 93, 91, 91.5)}
        # exit level 91.8: close 91.5 < 91.8 -> exit
        executed = pe.check_stops_and_exits(
            "2026-01-16", bars, {"NVDA": (D("91.8"), "LONG")})
        assert len(executed) == 1
        assert executed[0].reason == "exit_channel"

    def test_no_premature_exit_when_close_holds(self):
        pe = self._open_position()
        bars = {"NVDA": bar("2026-01-16", 92, 98, 91.9, 97)}
        # low 91.9 > stop 90.1 (no stop); close 97 > exit level 91.8 (no exit)
        executed = pe.check_stops_and_exits(
            "2026-01-16", bars, {"NVDA": (D("91.8"), "LONG")})
        assert len(executed) == 0
        assert pe.open_positions["NVDA"].last_price == D("97")

    def test_winning_close_realizes_profit(self):
        """Exit channel break at 105 with close at 104 -> profitable exit."""
        pe = self._open_position()   # entry 100.10
        bars = {"NVDA": bar("2026-01-16", 104, 105.5, 103, 104)}
        executed = pe.check_stops_and_exits(
            "2026-01-16", bars, {"NVDA": (D("105"), "LONG")})
        assert len(executed) == 1
        t = executed[0]
        assert t.reason == "exit_channel"
        assert t.pnl > 0                      # sold 103.896 vs entry 100.10
        assert pe.cash > D("10000")


class TestEquityConservation:
    def test_money_never_appears_or_vanishes(self):
        """
        CRITICAL INVARIANT across a full trade lifecycle:
        equity(t) == initial + sum(realized pnl of closed trades)
                       + unrealized pnl of open trades
        """
        micro = PortfolioEngine(MICRO_SETTINGS)
        std = PortfolioEngine(STANDARD_SETTINGS)

        sig1 = signal(symbol="A", price="50", atr="2", date="2026-01-05", sector=None)
        sig2 = signal(symbol="B", price="30", atr="3", date="2026-01-06", sector=None)

        for eng in (micro, std):
            eng.process_signal(sig1)
            eng.process_signal(sig2)

            # close both via stops
            bars = {
                "A": bar("2026-01-07", 44, 45, 43.9, 44),
                "B": bar("2026-01-07", 30, 33, 29, 32),   # B survives day 1
            }
            eng.check_stops_and_exits("2026-01-07", bars, {})

            realized = sum((t.pnl for t in eng.closed_trades), D("0"))
            eq = eng.equity()

            # equity = initial + realized(closed) + unrealized(open)
            unrealized = D("0")
            for sym_, pos_ in eng.open_positions.items():
                if pos_.direction == TradeDirection.LONG:
                    unrealized += (pos_.last_price - pos_.entry_price) * pos_.quantity
                else:
                    unrealized += (pos_.entry_price - pos_.last_price) * pos_.quantity

            expected = eng.settings.initial_equity + realized + unrealized
            assert abs(eq - expected) < D("0.0001")

            # And after closing everything, conservation reduces to initial+realized
            final_bars = {
                "A": bar("2026-01-08", 40, 41, 39, 40),
                "B": bar("2026-01-08", 25, 26, 24, 25),
            }
            eng.check_stops_and_exits("2026-01-08", final_bars, {})
            total_realized = sum((t.pnl for t in eng.closed_trades), D("0"))
            assert len(eng.open_positions) == 0
            assert abs(eng.equity() - (eng.settings.initial_equity + total_realized)) < D("0.0001")

    def test_equity_snapshot_tracks_drawdown(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        snap0 = pe.snapshot("2026-01-01")
        assert snap0.equity == D("10000")
        assert snap0.drawdown_percent == D("0")


class TestLedgerIntegrity:
    def test_events_are_append_only_sequential(self):
        micro = PortfolioEngine(MICRO_SETTINGS)
        std = PortfolioEngine(STANDARD_SETTINGS)
        micro.process_signal(signal())
        micro.process_signal(signal(symbol="TSLA", date="2026-01-16"))
        micro.check_stops_and_exits(
            "2026-01-17", {"NVDA": bar("2026-01-17", 90, 91, 88, 89)}, {})

        seqs = [e.seq for e in micro.events]
        assert seqs == sorted(seqs)
        assert seqs == list(range(1, len(seqs) + 1))

    def test_no_reset_method_exists(self):
        """
        PRODUCT INTEGRITY GUARANTEE:
        The engine must expose NO capability to reset balances.
        """
        public_api = [m for m in dir(PortfolioEngine) if not m.startswith("_")]
        forbidden = {"reset", "reset_portfolio", "set_cash", "set_equity",
                     "clear_history", "rewind"}
        actual = set(public_api)
        assert actual.isdisjoint(forbidden), f"Forbidden methods found: {actual & forbidden}"

    def test_every_skip_produces_ledger_event(self):
        micro = PortfolioEngine(MICRO_SETTINGS)
        micro.process_signal(signal(symbol="BRKA", price="500", atr="50"))  # skipped
        skip_events = [e for e in micro.events if e.event_type == "trade_skipped"]
        assert len(skip_events) == 1
        assert skip_events[0].data["reason"] == "insufficient_capital"


class TestRouting:
    def test_route_fans_out_to_both_portfolios(self):
        micro = PortfolioEngine(MICRO_SETTINGS)
        std = PortfolioEngine(STANDARD_SETTINGS)
        results = route_signal_to_portfolios(signal(), [micro, std])
        assert set(results.keys()) == {"TURTELLI_MICRO", "TURTELLI_STANDARD"}
        assert len(results["TURTELLI_MICRO"]) == 1
        assert len(results["TURTELLI_STANDARD"]) == 1

    def test_legitimate_divergence_recorded(self):
        """
        The spec's core story: same signal, different outcomes,
        each outcome explained.
        """
        micro = PortfolioEngine(MICRO_SETTINGS)
        std = PortfolioEngine(STANDARD_SETTINGS)

        # High-priced / wide-ATR stock micro can't afford but standard can
        sig = signal(symbol="BRKB", price="400", atr="20", sector=None)
        rm = route_signal_to_portfolios(sig, [micro, std])

        micro_result = rm["TURTELLI_MICRO"][0]
        std_result = rm["TURTELLI_STANDARD"][0]

        # Micro skipped with a reason; standard took it
        assert getattr(micro_result, "reason", None) in SKIP_REASONS
        assert std_result.event_type == "position_opened"

    def test_stats_shape(self):
        pe = PortfolioEngine(STANDARD_SETTINGS)
        s = pe.stats()
        for key in ("portfolio", "equity", "cash", "open_positions",
                    "closed_trades", "skipped_trades", "total_return_percent"):
            assert key in s
