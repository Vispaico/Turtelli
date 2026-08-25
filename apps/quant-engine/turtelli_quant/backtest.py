# ============================================================
# Turtelli 2.0 — Backtesting Engine (v2)
# ============================================================

"""
High-quality backtesting system.

CRITICAL DESIGN RULE:
This engine calls the EXACT SAME functions from turtle_engine.py as the
live scanner. There is NO second strategy implementation. If a rule
changes, both live and backtest change together.

All prices are Decimal. All calculations are deterministic.
"""

import json
import logging
from dataclasses import dataclass, field, asdict
from decimal import Decimal, ROUND_DOWN, getcontext
from typing import List, Optional, Dict, Any

from .turtle_engine import (
    DailyBar,
    StrategyConfig,
    TradeDirection,
    calculate_donchian_channel,
    calculate_atr,
    calculate_initial_stop,
    calculate_position_size,
    check_breakout,
    check_exit,
)

logger = logging.getLogger(__name__)

# Precision for intermediate equity math
getcontext().prec = 28

ZERO = Decimal("0")
ONE = Decimal("1")


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class BacktestTrade:
    """Single completed backtest trade."""
    symbol: str
    direction: TradeDirection
    system_name: str
    strategy_version: int
    config_hash: str

    entry_date: str
    entry_price: Decimal
    quantity: Decimal
    total_cost: Decimal          # incl. commission + slippage cost

    exit_date: Optional[str] = None
    exit_price: Optional[Decimal] = None
    exit_reason: Optional[str] = None   # "exit_channel" | "stop_loss" | "end_of_data"

    initial_stop: Decimal = ZERO
    current_stop: Decimal = ZERO

    pnl: Decimal = ZERO
    return_percent: Decimal = ZERO
    holding_days: int = 0

    # Excursions measured on close-to-extreme basis
    mfe_percent: Decimal = ZERO   # max favorable excursion (%)
    mae_percent: Decimal = ZERO   # max adverse excursion (%)

    pyramids_added: int = 0


@dataclass
class EquityPoint:
    date: str
    equity: Decimal
    cash: Decimal
    open_positions: int
    drawdown_percent: Decimal


@dataclass
class BacktestResult:
    """Complete backtest result. Clearly labeled BACKTEST — never mix with live."""
    record_type: str = "BACKTEST"  # permanent marker

    config_name: str = ""
    config_hash: str = ""
    strategy_version: int = 0
    symbol: str = ""
    start_date: str = ""
    end_date: str = ""
    bar_count: int = 0

    initial_capital: Decimal = ZERO
    final_capital: Decimal = ZERO
    total_return_percent: Decimal = ZERO
    cagr_percent: Decimal = ZERO
    max_drawdown_percent: Decimal = ZERO
    sharpe_ratio: Optional[Decimal] = None

    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate_percent: Decimal = ZERO
    profit_factor: Optional[Decimal] = None   # gross profit / gross loss; None if no losses
    expectancy_percent: Decimal = ZERO        # avg return per trade
    average_win_percent: Decimal = ZERO
    average_loss_percent: Decimal = ZERO
    avg_holding_days: Decimal = ZERO

    trades: List[BacktestTrade] = field(default_factory=list)
    equity_curve: List[EquityPoint] = field(default_factory=list)

    assumptions: Dict[str, Any] = field(default_factory=dict)


def compute_config_hash(config: StrategyConfig) -> str:
    """Deterministic hash of strategy configuration for versioning."""
    import hashlib
    payload = {
        "name": config.name,
        "version": config.version,
        "entry_days": config.entry_days,
        "exit_days": config.exit_days,
        "atr_period": config.atr_period,
        "stop_n": str(config.stop_n),
        "pyramid_interval_n": str(config.pyramid_interval_n),
        "max_units": config.max_units,
        "unit_risk_percent": str(config.unit_risk_percent),
        "previous_winner_filter": config.previous_winner_filter,
    }
    raw = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def days_between(date_a: str, date_b: str) -> int:
    """Calendar days between two YYYY-MM-DD strings (b - a)."""
    from datetime import date as _date
    a = _date.fromisoformat(date_a)
    b = _date.fromisoformat(date_b)
    return (b - a).days


# ============================================================
# BACKTEST ENGINE
# ============================================================

class BacktestEngine:
    """
    Event-driven backtester for one instrument / one strategy.

    Execution model (documented in `assumptions` of every result):
    - Signals are evaluated at each bar using only PRIOR bars (anti-lookahead
      enforced by turtle_engine itself).
    - Entries/exits fill at the bar's CLOSE after the signal is confirmed.
      (Conservative alternative would be next-open; see TRADING_RULES.md.)
    - Slippage applied against the trade direction.
    - Stop fills AT the stop price when the bar's range touches it
      (gap-through fills at worse open price).
    - Exit channel break fills at close.
    - Pyramiding: adds one unit per 0.5N advance beyond last unit entry,
      up to max_units; stop tightened to 2N below latest unit entry.
    """

    def __init__(
        self,
        config: StrategyConfig,
        initial_capital: Decimal = Decimal("10000"),
        commission: Decimal = Decimal("0"),
        slippage_percent: Decimal = Decimal("0.001"),   # 0.1% per side
        allow_fractional: bool = True,
        min_quantity: Decimal = ONE,
    ):
        self.config = config
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage_percent = slippage_percent
        self.allow_fractional = allow_fractional
        self.min_quantity = min_quantity

    # ---------- fill helpers ----------

    def _entry_fill_price(self, close: Decimal, direction: TradeDirection) -> Decimal:
        slip = close * self.slippage_percent
        return close + slip if direction == TradeDirection.LONG else close - slip

    def _exit_fill_price(self, ref_price: Decimal, direction: TradeDirection) -> Decimal:
        slip = ref_price * self.slippage_percent
        return ref_price - slip if direction == TradeDirection.LONG else ref_price + slip

    def _position_pnl(
        self,
        units: List[tuple],   # list of (entry_price, quantity)
        mark_price: Decimal,
        direction: TradeDirection,
    ) -> Decimal:
        """Mark-to-market PnL for all units at given price (before exit slippage)."""
        pnl = ZERO
        for entry_price, qty in units:
            if direction == TradeDirection.LONG:
                pnl += (mark_price - entry_price) * qty
            else:
                pnl += (entry_price - mark_price) * qty
        return pnl

    # ---------- main loop ----------

    def run(self, bars: List[DailyBar], symbol: str) -> BacktestResult:
        cfg = self.config
        min_bars_needed = max(cfg.entry_days, cfg.atr_period + 1) + 2
        if len(bars) < min_bars_needed:
            raise ValueError(
                f"Insufficient bars for {symbol}: {len(bars)} (need {min_bars_needed})"
            )

        cash = self.initial_capital
        trades: List[BacktestTrade] = []
        equity_curve: List[EquityPoint] = []

        # Open position state
        position_active = False
        pos_direction: Optional[TradeDirection] = None
        units: List[tuple] = []            # [(entry_price, qty), ...]
        invested_amount = ZERO             # sum(entry_price*qty), excl commissions
        entry_commissions = ZERO           # commissions paid on entries
        current_stop = ZERO
        initial_stop_of_trade = ZERO
        last_unit_entry = ZERO
        pyramid_count = 0
        peak_close = ZERO                  # best close since entry (for MFE)
        trough_close = ZERO                # worst close since entry (for MAE)
        first_entry_date = ""

        peak_equity = self.initial_capital
        max_drawdown = ZERO

        def _close_position(
            exit_px: Decimal,
            reason: str,
            exit_date: str,
            mfe_base_high: Decimal,
            mfe_base_low: Decimal,
            base_entry: Decimal,
        ) -> None:
            nonlocal cash, position_active, pos_direction, units
            nonlocal invested_amount, entry_commissions, pyramid_count
            proceeds = sum((q * exit_px for _, q in units), ZERO)
            exit_commissions = self.commission * Decimal(len(units))
            pnl = proceeds - invested_amount - exit_commissions - entry_commissions
            cost_basis = invested_amount + entry_commissions
            ret_pct = (pnl / cost_basis * 100) if cost_basis > 0 else ZERO
            holding = days_between(first_entry_date, exit_date)
            if pos_direction == TradeDirection.LONG:
                mfe = ((mfe_base_high - base_entry) / base_entry * 100) if base_entry > 0 else ZERO
                mae = ((base_entry - mfe_base_low) / base_entry * 100) if base_entry > 0 else ZERO
            else:
                mfe = ((base_entry - mfe_base_low) / base_entry * 100) if base_entry > 0 else ZERO
                mae = ((mfe_base_high - base_entry) / base_entry * 100) if base_entry > 0 else ZERO
            trades.append(BacktestTrade(
                symbol=symbol,
                direction=pos_direction,
                system_name=cfg.display_name,
                strategy_version=cfg.version,
                config_hash=compute_config_hash(cfg),
                entry_date=first_entry_date,
                entry_price=units[0][0],
                quantity=sum((q for _, q in units), ZERO),
                total_cost=cost_basis,
                exit_date=exit_date,
                exit_price=exit_px,
                exit_reason=reason,
                initial_stop=initial_stop_of_trade,
                current_stop=current_stop,
                pnl=pnl,
                return_percent=ret_pct,
                holding_days=max(holding, 0),
                mfe_percent=mfe,
                mae_percent=mae,
                pyramids_added=pyramid_count,
            ))
            cash += proceeds - exit_commissions
            position_active = False
            pos_direction = None
            units = []
            invested_amount = ZERO
            entry_commissions = ZERO
            pyramid_count = 0

        start_idx = max(cfg.entry_days, cfg.atr_period + 1)

        for i in range(start_idx, len(bars)):
            current_bar = bars[i]
            lookback = bars[:i]  # strictly prior bars — engine enforces cutoff internally

            # ---- indicators from shared engine (prior bars only) ----
            entry_channel = calculate_donchian_channel(lookback, cfg.entry_days, current_bar.date)
            exit_channel = calculate_donchian_channel(lookback, cfg.exit_days, current_bar.date)
            atr = calculate_atr(lookback, cfg.atr_period, current_bar.date)

            if entry_channel is None or exit_channel is None or atr is None or atr <= 0:
                continue

            # =====================================================
            # MANAGE OPEN POSITION
            # =====================================================
            if position_active:
                assert pos_direction is not None

                # --- 1. Stop check FIRST (intrabar priority) ---
                stop_hit = False
                stop_fill = current_stop
                if pos_direction == TradeDirection.LONG:
                    if current_bar.low <= current_stop:
                        stop_hit = True
                        # Gap through stop -> fill at worse open
                        stop_fill = min(current_stop, current_bar.open)
                else:
                    if current_bar.high >= current_stop:
                        stop_hit = True
                        stop_fill = max(current_stop, current_bar.open)

                if stop_hit:
                    exit_px = self._exit_fill_price(stop_fill, pos_direction)
                    _close_position(
                        exit_px=exit_px,
                        reason="stop_loss",
                        exit_date=current_bar.date,
                        mfe_base_high=peak_close,
                        mfe_base_low=trough_close,
                        base_entry=units[0][0],
                    )

                # --- 2. Exit channel check (close-based) ---
                elif check_exit(exit_channel, pos_direction, current_bar):
                    exit_px = self._exit_fill_price(current_bar.close, pos_direction)
                    _close_position(
                        exit_px=exit_px,
                        reason="exit_channel",
                        exit_date=current_bar.date,
                        mfe_base_high=peak_close,
                        mfe_base_low=trough_close,
                        base_entry=units[0][0],
                    )

                # --- 3. Pyramid check ---
                elif pyramid_count < cfg.max_units - 1:
                    interval = atr * cfg.pyramid_interval_n
                    target = (
                        last_unit_entry + interval
                        if pos_direction == TradeDirection.LONG
                        else last_unit_entry - interval
                    )
                    crossed = (
                        current_bar.high >= target
                        if pos_direction == TradeDirection.LONG
                        else current_bar.low <= target
                    )
                    if crossed and atr > 0:
                        fill = self._entry_fill_price(target, pos_direction)
                        qty = calculate_position_size(
                            equity=cash,
                            risk_percent=cfg.unit_risk_percent,
                            atr=atr,
                            stop_n=cfg.stop_n,
                            current_price=fill,
                            allow_fractional=self.allow_fractional,
                            min_quantity=self.min_quantity,
                        )
                        cost = qty * fill + self.commission
                        if qty > 0 and cost <= cash:
                            cash -= cost
                            units.append((fill, qty))
                            invested_amount += qty * fill
                            entry_commissions += self.commission
                            last_unit_entry = fill
                            pyramid_count += 1
                            # Tighten stop to 2N beyond latest unit
                            new_stop = calculate_initial_stop(fill, pos_direction, atr, cfg.stop_n)
                            current_stop = new_stop  # engine guarantees tighter direction

                # --- update excursion tracking ---
                closes_so_far = [u[0] for u in units]
                base_entry = closes_so_far[0] if closes_so_far else ZERO
                if base_entry > 0:
                    if pos_direction == TradeDirection.LONG:
                        peak_close = max(peak_close, current_bar.high)
                        trough_close = min(trough_close, current_bar.low)
                    else:
                        peak_close = max(peak_close, current_bar.low)
                        trough_close = min(trough_close, current_bar.high)

            # =====================================================
            # NEW ENTRY (only if flat)
            # =====================================================
            if not position_active:
                for direction in (TradeDirection.LONG, TradeDirection.SHORT):
                    if not check_breakout(entry_channel, direction, current_bar):
                        continue

                    # Size against the ACTUAL fill price (incl. slippage),
                    # otherwise affordability-capped positions can exceed
                    # available cash and get silently dropped.
                    fill = self._entry_fill_price(current_bar.close, direction)
                    qty = calculate_position_size(
                        equity=cash,
                        risk_percent=cfg.unit_risk_percent,
                        atr=atr,
                        stop_n=cfg.stop_n,
                        current_price=fill,
                        allow_fractional=self.allow_fractional,
                        min_quantity=self.min_quantity,
                    )
                    if qty <= 0:
                        continue

                    cost = qty * fill + self.commission
                    if cost > cash:
                        continue

                    stop = calculate_initial_stop(fill, direction, atr, cfg.stop_n)

                    cash -= cost
                    position_active = True
                    pos_direction = direction
                    units = [(fill, qty)]
                    invested_amount = qty * fill
                    entry_commissions = self.commission
                    current_stop = stop
                    initial_stop_of_trade = stop
                    last_unit_entry = fill
                    pyramid_count = 0
                    first_entry_date = current_bar.date
                    peak_close = current_bar.high if direction == TradeDirection.LONG else current_bar.low
                    trough_close = current_bar.low if direction == TradeDirection.LONG else current_bar.high
                    break  # one entry per bar

            # =====================================================
            # EQUITY CURVE
            # =====================================================
            market_value = ZERO
            if position_active and pos_direction is not None:
                market_value = self._position_pnl(units, current_bar.close, pos_direction) + \
                               sum((e * q for e, q in units), ZERO)
            equity = cash + market_value
            if equity > peak_equity:
                peak_equity = equity
            dd = ((peak_equity - equity) / peak_equity * 100) if peak_equity > 0 else ZERO
            if dd > max_drawdown:
                max_drawdown = dd

            equity_curve.append(EquityPoint(
                date=current_bar.date,
                equity=equity,
                cash=cash,
                open_positions=1 if position_active else 0,
                drawdown_percent=dd,
            ))

        # ---- force-close any remaining position at final close ----
        if position_active and pos_direction is not None and units:
            last_bar = bars[-1]
            exit_px = self._exit_fill_price(last_bar.close, pos_direction)
            _close_position(
                exit_px=exit_px,
                reason="end_of_data",
                exit_date=last_bar.date,
                mfe_base_high=peak_close,
                mfe_base_low=trough_close,
                base_entry=units[0][0],
            )
            equity_curve.append(EquityPoint(
                date=last_bar.date,
                equity=cash,
                cash=cash,
                open_positions=0,
                drawdown_percent=max_drawdown,
            ))

        return self._build_result(symbol, bars, trades, equity_curve, max_drawdown)

    # ---------- metrics ----------

    def _build_result(
        self,
        symbol: str,
        bars: List[DailyBar],
        trades: List[BacktestTrade],
        equity_curve: List[EquityPoint],
        max_drawdown: Decimal,
    ) -> BacktestResult:
        final_capital = equity_curve[-1].equity if equity_curve else self.initial_capital
        total_return = (
            (final_capital - self.initial_capital) / self.initial_capital * 100
            if self.initial_capital > 0 else ZERO
        )

        # CAGR (calendar-day based)
        cagr = ZERO
        if equity_curve and self.initial_capital > 0:
            years = days_between(equity_curve[0].date, equity_curve[-1].date) / 365.25
            if years > 0.25 and final_capital > 0:
                ratio = final_capital / self.initial_capital
                cagr = (Decimal(str(ratio)) ** (Decimal("1") / Decimal(str(years))) - 1) * 100

        winners = [t for t in trades if t.pnl > 0]
        losers = [t for t in trades if t.pnl <= 0]

        win_rate = (
            Decimal(len(winners)) / Decimal(len(trades)) * 100 if trades else ZERO
        )

        gross_profit = sum((t.pnl for t in winners), Decimal("0"))
        gross_loss = abs(sum((t.pnl for t in losers), Decimal("0")))
        profit_factor = (
            gross_profit / gross_loss if gross_loss > 0 else None
        )

        expectancy = (
            sum(t.return_percent for t in trades) / Decimal(len(trades))
            if trades else ZERO
        )

        avg_win = (
            sum(t.return_percent for t in winners) / Decimal(len(winners))
            if winners else ZERO
        )
        avg_loss = (
            sum(t.return_percent for t in losers) / Decimal(len(losers))
            if losers else ZERO
        )
        avg_hold = (
            sum(Decimal(t.holding_days) for t in trades) / Decimal(len(trades))
            if trades else ZERO
        )

        # Sharpe from daily equity returns, annualized
        sharpe = self._sharpe(equity_curve)

        return BacktestResult(
            record_type="BACKTEST",
            config_name=self.config.display_name,
            config_hash=compute_config_hash(self.config),
            strategy_version=self.config.version,
            symbol=symbol,
            start_date=bars[0].date,
            end_date=bars[-1].date,
            bar_count=len(bars),
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            total_return_percent=total_return,
            cagr_percent=cagr,
            max_drawdown_percent=max_drawdown,
            sharpe_ratio=sharpe,
            total_trades=len(trades),
            winning_trades=len(winners),
            losing_trades=len(losers),
            win_rate_percent=win_rate,
            profit_factor=profit_factor,
            expectancy_percent=expectancy,
            average_win_percent=avg_win,
            average_loss_percent=avg_loss,
            avg_holding_days=avg_hold,
            trades=trades,
            equity_curve=equity_curve,
            assumptions={
                "fill_model": "close_after_signal_confirmation",
                "slippage_percent_per_side": str(self.slippage_percent * 100),
                "commission_per_fill": str(self.commission),
                "stop_fill": "at_stop_price_unless_gapped_then_open",
                "pyramiding": f"every {self.config.pyramid_interval_n}N, "
                              f"max {self.config.max_units} units",
                "fractional_shares": self.allow_fractional,
            },
        )

    def _sharpe(self, equity_curve: List[EquityPoint]) -> Optional[Decimal]:
        """Annualized Sharpe of daily equity returns (rf = 0)."""
        if len(equity_curve) < 30:
            return None
        returns: List[Decimal] = []
        for i in range(1, len(equity_curve)):
            prev = equity_curve[i - 1].equity
            curr = equity_curve[i].equity
            if prev > 0:
                returns.append((curr - prev) / prev)
        if not returns:
            return None
        n = Decimal(len(returns))
        mean = sum(returns) / n
        variance = sum((r - mean) ** 2 for r in returns) / (n - 1) if n > 1 else ZERO
        std = variance.sqrt() if hasattr(variance, "sqrt") else Decimal(str(variance ** Decimal("0.5")))
        if std == 0:
            return None
        daily_sharpe = mean / std
        annualized = daily_sharpe * Decimal(str(252)) ** Decimal("0.5")
        return annualized.quantize(Decimal("0.0001"))
