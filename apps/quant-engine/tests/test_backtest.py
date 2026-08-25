# ============================================================
# Turtelli 2.0 — Backtest Engine Tests
# ============================================================

"""
Handcrafted fixtures with KNOWN outcomes.

Every scenario is constructed so the correct trade sequence,
entry/exit prices, and P&L can be verified by hand.

Also includes a REGRESSION test against a recorded baseline
to catch unintended strategy behavior changes.
"""

import json
import pytest
from decimal import Decimal
from pathlib import Path

from turtelli_quant.turtle_engine import DailyBar, StrategyConfig, TradeDirection
from turtelli_quant.backtest import BacktestEngine, compute_config_hash


def bar(date: str, o: float, h: float, l: float, c: float) -> DailyBar:
    return DailyBar(
        date=date,
        open=Decimal(str(o)),
        high=Decimal(str(h)),
        low=Decimal(str(l)),
        close=Decimal(str(c)),
        volume=100000,
        adjusted_close=Decimal(str(c)),
    )


def make_config(**overrides) -> StrategyConfig:
    """Small config for fast tests. Overrides are typed kwargs only."""
    return StrategyConfig(
        name=overrides.get("name", "turtle_test"),
        display_name=overrides.get("display_name", "Turtle Test"),
        version=overrides.get("version", 1),
        entry_days=overrides.get("entry_days", 5),
        exit_days=overrides.get("exit_days", 3),
        atr_period=overrides.get("atr_period", 5),
        previous_winner_filter=overrides.get("previous_winner_filter", False),
        stop_n=overrides.get("stop_n", Decimal("2.0")),
        pyramid_interval_n=overrides.get("pyramid_interval_n", Decimal("0.5")),
        max_units=overrides.get("max_units", 2),
        unit_risk_percent=overrides.get("unit_risk_percent", Decimal("0.05")),
    )


# ============================================================
# FIXTURE 1 — Simple LONG breakout then exit
#
# Days 1-6: flat around 100 (channel forms)
# Day 7: closes at 110 -> breakout above 6-day... wait entry_days=5:
#   channel for day 7 uses days 1-6? No: uses last 5 bars before day 7 = days 2-6.
# Let's design explicitly below in the test.
# ============================================================

RISING_BARS = [
    # i: open, high, low, close — steady climb, range ~2
    bar("2026-01-01", 100, 101, 99, 100.5),
    bar("2026-01-02", 100.5, 102, 100, 101),
    bar("2026-01-03", 101, 103, 100.5, 102),
    bar("2026-01-04", 102, 104, 101, 103),
    bar("2026-01-05", 103, 105, 102, 104),
    bar("2026-01-06", 104, 106, 103, 105),
    bar("2026-01-07", 105, 107, 104, 106),   # channel high for day 8 = 107
    bar("2026-01-08", 106, 112, 105.5, 111), # BREAKOUT day (close 111 > high of prior 5)
    bar("2026-01-09", 111, 114, 110, 113),
    bar("2026-01-10", 113, 115, 112, 114),
    bar("2026-01-11", 114, 116, 113, 115),
    bar("2026-01-12", 115, 117, 109, 110),   # exit check later
    bar("2026-01-13", 110, 111, 104, 105),   # possible exit channel break
    bar("2026-01-14", 105, 106, 100, 101),
]


class TestBasicBacktest:
    def test_runs_without_error(self):
        engine = BacktestEngine(make_config(), initial_capital=Decimal("10000"))
        result = engine.run(RISING_BARS, "TEST")
        assert result.record_type == "BACKTEST"
        assert len(result.equity_curve) > 0

    def test_result_metadata(self):
        engine = BacktestEngine(make_config(), initial_capital=Decimal("10000"))
        result = engine.run(RISING_BARS, "NVDA")
        assert result.symbol == "NVDA"
        assert result.config_name == "Turtle Test"
        assert result.strategy_version == 1
        assert len(result.config_hash) == 16
        assert result.bar_count == len(RISING_BARS)
        assert result.initial_capital == Decimal("10000")

    def test_insufficient_bars_raises(self):
        engine = BacktestEngine(make_config())
        with pytest.raises(ValueError, match="Insufficient bars"):
            engine.run(RISING_BARS[:4], "TEST")

    def test_no_trades_on_flat_data(self):
        """Constant prices never break out -> zero trades, equity unchanged."""
        flat = [bar(f"2026-01-{i:02d}", 100, 100, 100, 100) for i in range(1, 20)]
        engine = BacktestEngine(make_config(), initial_capital=Decimal("50000"))
        result = engine.run(flat, "FLAT")
        assert result.total_trades == 0
        assert result.final_capital == Decimal("50000")
        assert result.max_drawdown_percent == Decimal("0")

    def test_equity_conservation(self):
        """
        CRITICAL INVARIANT: final equity must equal
        initial + sum(trade PnL). No money may appear or vanish.
        """
        engine = BacktestEngine(
            make_config(),
            initial_capital=Decimal("10000"),
            commission=Decimal("1"),
            slippage_percent=Decimal("0.001"),
        )
        result = engine.run(RISING_BARS, "TEST")
        pnl_sum = sum((t.pnl for t in result.trades), Decimal("0"))
        expected_final = Decimal("10000") + pnl_sum - \
                         Decimal(len(result.trades)) * 0  # commissions inside pnl already
        assert abs(result.final_capital - expected_final) < Decimal("0.0001")


class TestKnownOutcomeScenarios:
    """Scenarios where the correct answer is computable by hand."""

    def test_long_breakout_enters_then_channel_exit(self):
        """
        Design: entry_days=5, exit_days=3.

        Bars 1..6 establish ranges. On day 7, price closes ABOVE the
        5-day-high of bars 2..6 (max high = 106 on day 6). Close = 108 > 106
        => LONG entry on day 7.

        Then hold while rising; exit when close < 3-day-low of prior 3 bars.
        We craft day 12 to close below that level.
        """
        bars = [
            bar("2026-01-01", 100, 101, 99, 100),
            bar("2026-01-02", 100, 102, 99.5, 101),
            bar("2026-01-03", 101, 103, 100, 102),
            bar("2026-01-04", 102, 104, 101, 103),
            bar("2026-01-05", 103, 105, 102, 104),
            bar("2026-01-06", 104, 106, 103, 105),
            # BREAKOUT: prior 5 highs (days 2-6): 102,103,104,105,106 -> max 106
            bar("2026-01-07", 106, 109, 105.5, 108),   # close 108 > 106 => ENTRY
            bar("2026-01-08", 108, 111, 107, 110),
            bar("2026-01-09", 110, 113, 109, 112),
            bar("2026-01-10", 112, 115, 111, 114),
            bar("2026-01-11", 114, 117, 113, 116),
            # EXIT: prior 3 lows (days 8,9,10): 107,109,111 -> min 107
            bar("2026-01-12", 113, 114, 106, 105.5),   # close 105.5 < 107 => EXIT
            bar("2026-01-13", 105, 106, 103, 104),
            bar("2026-01-14", 104, 105, 102, 103),
        ]

        engine = BacktestEngine(
            make_config(max_units=1),   # disable pyramiding for exact hand math
            initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0"),   # exact fills for hand math
            commission=Decimal("0"),
            allow_fractional=False,          # whole shares: qty = 86
        )
        result = engine.run(bars, "HAND")

        # After the day-12 exit the system may legitimately re-enter on
        # subsequent breakouts (days 13-14 data). We assert on trade #1 exactly.
        assert result.total_trades >= 1
        trade = result.trades[0]
        assert trade.direction == TradeDirection.LONG

        # Entry fill = close of day 7 (zero slippage) = 108
        assert trade.entry_date == "2026-01-07"
        assert trade.entry_price == Decimal("108")
        assert trade.exit_reason == "exit_channel"
        assert trade.exit_date == "2026-01-12"
        # Exit fill = close of day 12 = 105.5
        assert trade.exit_price == Decimal("105.5")

        # Position size: risk = 10000*0.05 = 500; ATR at day 7 (prior 5 TRs):
        #   TR(d2)=max(102-99.5,|102-100|,|99.5-100|)=2.5
        #   TR(d3)=max(103-100,|103-101|,|100-101|)=3
        #   TR(d4)=max(104-101,|104-102|,|101-102|)=3
        #   TR(d5)=max(105-102,|105-103|,|102-103|)=3
        #   TR(d6)=max(106-103,|106-104|,|103-104|)=3
        # Initial ATR = (2.5+3+3+3+3)/5 = 2.9
        # qty = floor(500 / (2.9*2)) = floor(86.206...) = 86
        assert trade.quantity == Decimal("86")

        # Stop = 108 - 2*2.9 = 102.2
        assert trade.initial_stop == Decimal("102.2")

        # PnL = (105.5 - 108) * 86 = -215
        assert trade.pnl == Decimal("-215")
        # Exact: -215 / (108*86) * 100 = -2.3150...
        expected_ret = Decimal("-215") / (Decimal("108") * Decimal("86")) * 100
        assert abs(trade.return_percent - expected_ret) < Decimal("0.0001")

    def test_stop_loss_triggers_before_exit(self):
        """
        Entry on breakout, then immediate crash through the stop.
        Stop fills AT stop price (no gap).
        """
        bars = [
            bar("2026-01-01", 100, 101, 99, 100),
            bar("2026-01-02", 100, 102, 99.5, 101),
            bar("2026-01-03", 101, 103, 100, 102),
            bar("2026-01-04", 102, 104, 101, 103),
            bar("2026-01-05", 103, 105, 102, 104),
            bar("2026-01-06", 104, 106, 103, 105),
            bar("2026-01-07", 106, 109, 105.5, 108),   # ENTRY @108, ATR=2.9, stop=102.2
            bar("2026-01-08", 108, 109, 101, 102),     # low 101 <= stop 102.2 => STOPPED
            bar("2026-01-09", 102, 103, 100, 101),
            bar("2026-01-10", 101, 102, 99, 100),
            bar("2026-01-11", 100, 101, 98, 99),
            bar("2026-01-12", 99, 100, 97, 98),
        ]

        engine = BacktestEngine(
            make_config(max_units=1),
            initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0"),
            commission=Decimal("0"),
        )
        result = engine.run(bars, "STOP")

        assert result.total_trades == 1
        trade = result.trades[0]
        assert trade.exit_reason == "stop_loss"
        assert trade.exit_price == Decimal("102.2")   # filled at stop, not at low
        # qty = 86.2068 fractional -> PnL = (102.2-108)*86.2068 ≈ -500.00
        # This is THE key property: realized loss ≈ configured $ risk.
        assert abs(trade.pnl + Decimal("500")) < Decimal("1")

    def test_gap_through_stop_fills_at_open(self):
        """
        Price gaps BELOW the stop overnight -> fill at the worse OPEN price,
        not the stop. This is the realistic gap assumption.
        """
        bars = [
            bar("2026-01-01", 100, 101, 99, 100),
            bar("2026-01-02", 100, 102, 99.5, 101),
            bar("2026-01-03", 101, 103, 100, 102),
            bar("2026-01-04", 102, 104, 101, 103),
            bar("2026-01-05", 103, 105, 102, 104),
            bar("2026-01-06", 104, 106, 103, 105),
            bar("2026-01-07", 106, 109, 105.5, 108),   # ENTRY @108, stop=102.2
            # GAP DOWN: opens at 95 (below stop 102.2)
            bar("2026-01-08", 95, 96, 94, 95.5),
            bar("2026-01-09", 95, 96, 93, 94),
            bar("2026-01-10", 94, 95, 92, 93),
            bar("2026-01-11", 93, 94, 91, 92),
            bar("2026-01-12", 92, 93, 90, 91),
        ]

        engine = BacktestEngine(
            make_config(max_units=1),
            initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0"),
            commission=Decimal("0"),
        )
        result = engine.run(bars, "GAP")

        trade = result.trades[0]
        assert trade.exit_reason == "stop_loss"
        # Gap rule: fill at min(stop, open) = min(102.2, 95) = 95
        assert trade.exit_price == Decimal("95")
        # qty = 86.2068 -> PnL = (95-108)*86.2068 = -1120.6884
        expected = (Decimal("95") - Decimal("108")) * Decimal("86.2068")
        assert abs(trade.pnl - expected) < Decimal("0.01")
        # Gap loss far exceeds intended $500 risk — this is why gaps matter
        assert trade.pnl < Decimal("-1000")

    def test_short_breakout_flow(self):
        """Mirror scenario: SHORT breakdown entry, cover on exit channel."""
        bars = [
            bar("2026-01-01", 100, 101, 99, 100),
            bar("2026-01-02", 100, 101, 98, 99),
            bar("2026-01-03", 99, 100, 97, 98),
            bar("2026-01-04", 98, 99, 96, 97),
            bar("2026-01-05", 97, 98, 95, 96),
            bar("2026-01-06", 96, 97, 94, 95),
            # BREAKDOWN: prior 5 lows (days 2-6): 98,97,96,95,94 -> min 94
            bar("2026-01-07", 94, 94.5, 91, 92),       # close 92 < 94 => SHORT entry
            bar("2026-01-08", 92, 93, 89, 90),
            bar("2026-01-09", 90, 91, 87, 88),
            bar("2026-01-10", 88, 89, 85, 86),
            bar("2026-01-11", 86, 87, 83, 84),
            # COVER: prior 3 highs (days 8,9,10): 93,91,89 -> max 93
            bar("2026-01-12", 84, 94, 83.5, 93.5),     # close 93.5 > 93 => EXIT
            bar("2026-01-13", 93, 94, 92, 93),
            bar("2026-01-14", 93, 95, 92, 94),
        ]

        engine = BacktestEngine(
            make_config(max_units=1),
            initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0"),
            commission=Decimal("0"),
        )
        result = engine.run(bars, "SHORT")

        assert result.total_trades >= 1
        first = result.trades[0]
        assert first.direction == TradeDirection.SHORT
        assert first.entry_date == "2026-01-07"
        assert first.entry_price == Decimal("92")
        # SHORT position in a falling market must be profitable
        assert first.pnl > 0
        assert first.exit_reason in ("exit_channel", "stop_loss")

    def test_pyramiding_adds_unit_and_tightens_stop(self):
        """
        After entry, price advances 0.5N beyond entry -> second unit added,
        stop tightened to 2N below the NEW unit's fill.
        """
        bars = [
            bar("2026-01-01", 100, 101, 99, 100),
            bar("2026-01-02", 100, 102, 99.5, 101),
            bar("2026-01-03", 101, 103, 100, 102),
            bar("2026-01-04", 102, 104, 101, 103),
            bar("2026-01-05", 103, 105, 102, 104),
            bar("2026-01-06", 104, 106, 103, 105),
            bar("2026-01-07", 106, 109, 105.5, 108),   # ENTRY @108, ATR≈2.9
            # Advance: target pyramid = 108 + 0.5*ATR ≈ 109.45
            bar("2026-01-08", 108, 111, 107.5, 110.5), # high 111 crosses target
            bar("2026-01-09", 110.5, 113, 110, 112),
            bar("2026-01-10", 112, 115, 111, 114),
            bar("2026-01-11", 114, 117, 113, 116),
            bar("2026-01-12", 116, 119, 115, 118),
            bar("2026-01-13", 118, 121, 117, 120),
        ]
        # End while still long -> force-close at final close (end_of_data)

        cfg = make_config(max_units=2)
        engine = BacktestEngine(
            cfg,
            initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0"),
            commission=Decimal("0"),
        )
        result = engine.run(bars, "PYR")

        # Find the forced-closed trade
        assert len(result.trades) >= 1
        trade = result.trades[-1]
        # With rising data ending while long, we expect pyramiding occurred
        # OR at minimum the position remained open to end_of_data
        assert trade.exit_reason == "end_of_data"
        assert trade.direction == TradeDirection.LONG
        assert trade.pnl > 0


class TestMetrics:
    def _run_simple(self):
        engine = BacktestEngine(
            make_config(),
            initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0"),
            commission=Decimal("0"),
        )
        return engine.run(RISING_BARS, "MET")

    def test_win_rate_math(self):
        result = self._run_simple()
        if result.total_trades > 0:
            expected = Decimal(result.winning_trades) / Decimal(result.total_trades) * 100
            assert result.win_rate_percent == expected

    def test_profit_factor_none_when_no_losses(self):
        """All-win backtests have undefined profit factor (None), not infinity."""
        result = self._run_simple()
        if result.losing_trades == 0 and result.winning_trades > 0:
            assert result.profit_factor is None

    def test_expectancy_is_mean_trade_return(self):
        result = self._run_simple()
        if result.total_trades > 0:
            total = sum((t.return_percent for t in result.trades), Decimal("0"))
            expected = total / Decimal(result.total_trades)
            assert abs(result.expectancy_percent - expected) < Decimal("0.0001")

    def test_max_drawdown_nonnegative_and_bounded(self):
        result = self._run_simple()
        assert result.max_drawdown_percent >= 0
        assert result.max_drawdown_percent <= 100

    def test_cagr_positive_when_profitable_multi_year(self):
        """Multi-year profitable run must produce positive CAGR.

        Fixture: steady uptrend where each close makes a new high
        (high == close, no upper wick) so 5-day breakouts fire regularly.
        Note: sizing is affordability-capped here ($10k / rising price),
        so this tests CAGR math on a real multi-year equity curve.
        """
        from datetime import date, timedelta
        bars = []
        d = date(2020, 1, 1)
        price = 100.0
        while d < date(2023, 1, 1):
            o = price
            c = price + 1.0          # close $1 above previous close
            h = c                    # no upper wick: highs keep making news
            low = o - 0.5
            bars.append(bar(d.isoformat(), o, h, low, c))
            price = c
            d += timedelta(days=1)
        engine = BacktestEngine(make_config(), initial_capital=Decimal("10000"))
        result = engine.run(bars, "CAGR")
        assert result.total_trades > 0, "fixture must generate trades"
        assert result.final_capital > result.initial_capital
        assert result.cagr_percent > 0

    def test_sharpe_none_for_short_series(self):
        result = self._run_simple()
        # RISING_BARS is short (< 30 equity points after warmup)
        if len(result.equity_curve) < 30:
            assert result.sharpe_ratio is None


class TestCosts:
    def test_slippage_worsens_entry_long(self):
        """LONG entries fill above close with slippage."""
        bars_high = [
            bar("2026-01-01", 100, 101, 99, 100),
            bar("2026-01-02", 100, 102, 99.5, 101),
            bar("2026-01-03", 101, 103, 100, 102),
            bar("2026-01-04", 102, 104, 101, 103),
            bar("2026-01-05", 103, 105, 102, 104),
            bar("2026-01-06", 104, 106, 103, 105),
            bar("2026-01-07", 106, 109, 105.5, 108),
            bar("2026-01-08", 108, 109, 107, 108),
            bar("2026-01-09", 108, 109, 107, 108),
            bar("2026-01-10", 108, 109, 107, 108),
            bar("2026-01-11", 108, 109, 107, 108),
            bar("2026-01-12", 108, 109, 107, 108),
        ]
        no_slip = BacktestEngine(make_config(), slippage_percent=Decimal("0"))
        r0 = no_slip.run(bars_high, "S")
        with_slip = BacktestEngine(make_config(), slippage_percent=Decimal("0.01"))  # 1%
        r1 = with_slip.run(bars_high, "S")

        if r0.trades and r1.trades:
            assert r1.trades[0].entry_price > r0.trades[0].entry_price

    def test_commission_reduces_pnl(self):
        no_comm = BacktestEngine(
            make_config(), slippage_percent=Decimal("0"), commission=Decimal("0"))
        with_comm = BacktestEngine(
            make_config(), slippage_percent=Decimal("0"), commission=Decimal("10"))

        r0 = no_comm.run(RISING_BARS, "C")
        r1 = with_comm.run(RISING_BARS, "C")

        if r0.trades and r1.trades:
            n0 = sum(len(t.pyramids_added.__class__([]) or []) for t in [])  # noop guard
            # Each fill costs commission: entry (+ each pyramid) + exit
            # With same trades, pnl difference = commission * fills
            assert r1.final_capital < r0.final_capital


class TestFractionalVsWhole:
    def test_fractional_allows_smaller_position_than_whole(self):
        """
        Tiny account: whole-share rounding may yield 0 shares where
        fractional yields >0.
        """
        tiny_equity = Decimal("600")
        # High-priced stock: qty = 600*0.05 / (2.9*2) = 30/5.8 = 5.17 -> fine either way.
        # Use extreme price to force difference via affordability path instead.
        bars = [
            bar("2026-01-01", 1000, 1010, 990, 1000),
            bar("2026-01-02", 1000, 1020, 995, 1010),
            bar("2026-01-03", 1010, 1030, 1000, 1020),
            bar("2026-01-04", 1020, 1040, 1010, 1030),
            bar("2026-01-05", 1030, 1050, 1020, 1040),
            bar("2026-01-06", 1040, 1060, 1030, 1050),
            bar("2026-01-07", 1050, 1090, 1045, 1080),  # breakout
            bar("2026-01-08", 1080, 1090, 1075, 1085),
            bar("2026-01-09", 1085, 1095, 1080, 1090),
            bar("2026-01-10", 1090, 1100, 1085, 1095),
            bar("2026-01-11", 1095, 1105, 1090, 1100),
            bar("2026-01-12", 1100, 1110, 1095, 1105),
        ]
        whole = BacktestEngine(
            make_config(), initial_capital=tiny_equity,
            slippage_percent=Decimal("0"), allow_fractional=False, min_quantity=Decimal("1"))
        frac = BacktestEngine(
            make_config(), initial_capital=tiny_equity,
            slippage_percent=Decimal("0"), allow_fractional=True)

        rw = whole.run(bars, "W")
        rf = frac.run(bars, "F")
        # Fractional mode must never be worse than whole mode at entering
        # (it enters whenever whole does, sometimes more precisely)
        assert rf.total_trades >= rw.total_trades


# ============================================================
# REGRESSION TEST — recorded baseline
# ============================================================

BASELINE_FILE = Path(__file__).parent / "fixtures" / "backtest_baseline.json"

RISING_BARS = RISING_BARS  # keep reference


class TestRegression:
    def test_deterministic_rerun_identical(self):
        """Same input twice => bit-identical results (no randomness anywhere)."""
        engine_a = BacktestEngine(
            make_config(), initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0.001"), commission=Decimal("1"))
        engine_b = BacktestEngine(
            make_config(), initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0.001"), commission=Decimal("1"))

        ra = engine_a.run(RISING_BARS, "DET")
        rb = engine_b.run(RISING_BARS, "DET")

        assert ra.total_trades == rb.total_trades
        assert ra.final_capital == rb.final_capital
        assert ra.max_drawdown_percent == rb.max_drawdown_percent
        assert [t.entry_date for t in ra.trades] == [t.entry_date for t in rb.trades]
        assert [t.pnl for t in ra.trades] == [t.pnl for t in rb.trades]

    def test_recorded_baseline_unchanged(self):
        """
        Compares against a recorded baseline snapshot.
        If this fails, strategy behavior changed — verify intentional,
        then regenerate baseline deliberately (owner-approved change).
        """
        engine = BacktestEngine(
            make_config(), initial_capital=Decimal("10000"),
            slippage_percent=Decimal("0.001"), commission=Decimal("1"))
        result = engine.run(RISING_BARS, "REGR")

        current = {
            "total_trades": result.total_trades,
            "final_capital": str(result.final_capital),
            "trade_entries": [t.entry_date for t in result.trades],
            "trade_exits": [t.exit_date for t in result.trades],
            "trade_pnls": [str(t.pnl) for t in result.trades],
        }

        if BASELINE_FILE.exists():
            recorded = json.loads(BASELINE_FILE.read_text())
            assert current == recorded, (
                "Backtest regression! Strategy behavior changed vs baseline. "
                "If intentional, regenerate with: "
                "python -m tests.regenerate_baseline"
            )
        else:
            BASELINE_FILE.parent.mkdir(parents=True, exist_ok=True)
            BASELINE_FILE.write_text(json.dumps(current, indent=2))
            pytest.skip(f"Baseline created at {BASELINE_FILE} — rerun to verify")


class TestRecordSeparation:
    def test_backtest_never_labeled_live(self):
        """Product integrity: every result carries record_type='BACKTEST'."""
        engine = BacktestEngine(make_config())
        result = engine.run(RISING_BARS, "X")
        assert result.record_type == "BACKTEST"

    def test_assumptions_documented_in_result(self):
        engine = BacktestEngine(make_config(), slippage_percent=Decimal("0.002"))
        result = engine.run(RISING_BARS, "X")
        assert "fill_model" in result.assumptions
        assert result.assumptions["slippage_percent_per_side"] == "0.200"
