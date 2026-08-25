# ============================================================
# Turtelli 2.0 — Dual Public Portfolio Engine
# ============================================================

"""
Two public paper portfolios fed by identical market signals:

  TURTELLI_MICRO    — $600 starting equity
  TURTELLI_STANDARD — $10,000 starting equity

Design guarantees:
- Same signal reaches both portfolios; each sizes independently.
- Every acceptance AND every skip is recorded with a reason.
- Equity compounds; history is append-only.
- NO reset capability exists in this engine. Corrections are only
  possible via explicit auditable correction events that never
  rewrite prior state.
- Fill conventions match the backtester (slippage against direction,
  commission per fill) so BACKTEST and PAPER stay comparable.

This module is pure logic: it receives signals + prices and returns
results. Persistence lives elsewhere; the event lists returned here
are the source of truth for what must be written to the ledger.
"""

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_DOWN, getcontext
from typing import List, Optional, Dict, Any

from .turtle_engine import (
    DailyBar,
    StrategyConfig,
    TradeDirection,
    calculate_initial_stop,
)

getcontext().prec = 28

ZERO = Decimal("0")
ONE = Decimal("1")


# ============================================================
# CONFIG
# ============================================================

@dataclass
class PortfolioSettings:
    """Immutable settings for one portfolio."""
    name: str                       # "TURTELLI_MICRO" | "TURTELLI_STANDARD"
    display_name: str
    initial_equity: Decimal
    max_risk_per_trade: Decimal     # fraction, e.g. 0.02
    max_correlated_positions: int
    max_total_positions: int
    allow_fractional: bool
    commission: Decimal             # per fill
    slippage_percent: Decimal       # per side, e.g. 0.001


MICRO_SETTINGS = PortfolioSettings(
    name="TURTELLI_MICRO",
    display_name="Turtelli Micro",
    initial_equity=Decimal("600"),
    max_risk_per_trade=Decimal("0.02"),
    max_correlated_positions=2,
    max_total_positions=6,
    allow_fractional=False,
    commission=ZERO,
    slippage_percent=Decimal("0.001"),
)

STANDARD_SETTINGS = PortfolioSettings(
    name="TURTELLI_STANDARD",
    display_name="Turtelli Standard",
    initial_equity=Decimal("10000"),
    max_risk_per_trade=Decimal("0.02"),
    max_correlated_positions=3,
    max_total_positions=12,
    allow_fractional=True,
    commission=ZERO,
    slippage_percent=Decimal("0.001"),
)


# ============================================================
# DATA TYPES
# ============================================================

@dataclass
class IncomingSignal:
    """A validated breakout signal routed to portfolios."""
    signal_id: str
    symbol: str
    direction: TradeDirection
    strategy_name: str
    strategy_version: int
    config_hash: str
    trigger_date: str               # YYYY-MM-DD of triggering bar
    trigger_price: Decimal          # bar close that confirmed breakout
    atr: Decimal                    # N at trigger
    sector: Optional[str] = None    # for correlation limits


@dataclass
class OpenPosition:
    symbol: str
    signal_id: str
    direction: TradeDirection
    quantity: Decimal
    entry_price: Decimal            # actual fill price incl. slippage
    invested: Decimal               # qty * entry_price
    entry_commission: Decimal
    initial_stop: Decimal
    current_stop: Decimal
    entry_date: str
    last_price: Decimal
    pyramid_count: int = 1
    mfe_price: Decimal = ZERO
    mae_price: Decimal = ZERO


@dataclass
class ExecutedTrade:
    """Record of an opened or closed trade."""
    event_type: str                 # "position_opened" | "position_closed"
    portfolio: str
    signal_id: str
    symbol: str
    direction: TradeDirection
    date: str
    price: Decimal                  # fill price
    quantity: Decimal
    cost_or_proceeds: Decimal       # cash impact magnitude
    commission: Decimal
    stop: Decimal                   # stop after this event
    pnl: Decimal = ZERO             # realized pnl (closes only)
    return_percent: Decimal = ZERO
    reason: str = ""                # exit reason on close
    holding_days: int = 0


@dataclass
class SkippedTrade:
    """Record of a signal a portfolio could not / did not take."""
    portfolio: str
    signal_id: str
    symbol: str
    direction: TradeDirection
    date: str
    reason: str                     # see SKIP_REASONS
    details: str = ""


SKIP_REASONS = {
    "insufficient_capital",
    "risk_limit",
    "correlation_exposure",
    "max_positions",
    "minimum_quantity",
    "existing_position",
    "invalid_signal",
}


@dataclass
class LedgerEvent:
    """Immutable audit event. Append-only; never mutated."""
    seq: int
    timestamp_hint: str             # date of processing step
    event_type: str
    portfolio: str
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EquitySnapshot:
    date: str
    equity: Decimal
    cash: Decimal
    open_positions: int
    drawdown_percent: Decimal


# ============================================================
# PORTFOLIO ENGINE
# ============================================================

class PortfolioEngine:
    """
    Stateful engine for ONE portfolio.

    Usage:
        pe = PortfolioEngine(MICRO_SETTINGS)
        results = pe.process_signal(signal, bars_for_validation=None)
        # -> list of ExecutedTrade | SkippedTrade | LedgerEvent

    The engine never mutates past events. `events` is append-only.
    """

    def __init__(self, settings: PortfolioSettings):
        self.settings = settings
        self.cash: Decimal = settings.initial_equity
        self.peak_equity: Decimal = settings.initial_equity
        self.open_positions: Dict[str, OpenPosition] = {}   # by symbol
        self.events: List[LedgerEvent] = []
        self.equity_history: List[EquitySnapshot] = []
        self.closed_trades: List[ExecutedTrade] = []
        self.skips: List[SkippedTrade] = []
        self._seq = 0
        self._log("INCEPTION", "portfolio_inception", {
            "initial_equity": str(settings.initial_equity),
            "settings": {
                "max_risk_per_trade": str(settings.max_risk_per_trade),
                "max_total_positions": settings.max_total_positions,
                "allow_fractional": settings.allow_fractional,
            },
        })

    # ---------- internals ----------

    def _log(self, date: str, event_type: str, data: Dict[str, Any]) -> LedgerEvent:
        self._seq += 1
        ev = LedgerEvent(seq=self._seq, timestamp_hint=date,
                         event_type=event_type, portfolio=self.settings.name,
                         data=data)
        self.events.append(ev)
        return ev

    def _fill(self, ref_price: Decimal, direction: TradeDirection, entering: bool) -> Decimal:
        slip = ref_price * self.settings.slippage_percent
        if entering:
            return ref_price + slip if direction == TradeDirection.LONG else ref_price - slip
        return ref_price - slip if direction == TradeDirection.LONG else ref_price + slip

    def equity(self, prices: Optional[Dict[str, Decimal]] = None) -> Decimal:
        """Mark-to-market equity. prices: symbol -> last price override."""
        mv = ZERO
        for sym, pos in self.open_positions.items():
            px = (prices or {}).get(sym, pos.last_price)
            if pos.direction == TradeDirection.LONG:
                mv += (px - pos.entry_price) * pos.quantity + pos.invested
            else:
                mv += (pos.entry_price - px) * pos.quantity + pos.invested
        return self.cash + mv

    def snapshot(self, date: str, prices: Optional[Dict[str, Decimal]] = None) -> EquitySnapshot:
        eq = self.equity(prices)
        if eq > self.peak_equity:
            self.peak_equity = eq
        dd = ((self.peak_equity - eq) / self.peak_equity * 100) if self.peak_equity > 0 else ZERO
        snap = EquitySnapshot(date=date, equity=eq, cash=self.cash,
                              open_positions=len(self.open_positions),
                              drawdown_percent=dd)
        self.equity_history.append(snap)
        return snap

    # ---------- exits ----------

    def check_stops_and_exits(
        self,
        date: str,
        bars: Dict[str, DailyBar],
        exit_levels: Dict[str, tuple],   # symbol -> (exit_low_or_high, direction)
    ) -> List[ExecutedTrade]:
        """
        Process one bar per held symbol: stops first (gap-aware), then
        close-based exit-channel breaks. Mirrors backtester priority.
        exit_levels: for LONG positions pass (channel_low, "LONG");
                     for SHORT pass (channel_high, "SHORT").
        """
        executed: List[ExecutedTrade] = []

        for sym in list(self.open_positions.keys()):
            pos = self.open_positions[sym]
            bar = bars.get(sym)
            if bar is None:
                continue

            # update excursions
            if pos.direction == TradeDirection.LONG:
                pos.mfe_price = max(pos.mfe_price, bar.high)
                pos.mae_price = min(pos.mae_price, bar.low) if pos.mae_price > 0 else bar.low
                stop_hit = bar.low <= pos.current_stop
                stop_fill_ref = min(pos.current_stop, bar.open)
                exit_hit = False
            else:
                pos.mfe_price = max(pos.mfe_price, bar.low)
                pos.mae_price = max(pos.mae_price, bar.high)
                stop_hit = bar.high >= pos.current_stop
                stop_fill_ref = max(pos.current_stop, bar.open)
                exit_hit = False

            exit_reason = None
            if stop_hit:
                exit_reason = "stop_loss"
            else:
                lvl = exit_levels.get(sym)
                if lvl is not None:
                    level, _dir = lvl
                    if pos.direction == TradeDirection.LONG and bar.close < level:
                        exit_hit = True
                    elif pos.direction == TradeDirection.SHORT and bar.close > level:
                        exit_hit = True
                    if exit_hit:
                        exit_reason = "exit_channel"

            if exit_reason is None:
                pos.last_price = bar.close
                continue

            if exit_reason == "stop_loss":
                exit_px = self._fill(stop_fill_ref, pos.direction, entering=False)
            else:
                exit_px = self._fill(bar.close, pos.direction, entering=False)

            proceeds = pos.quantity * exit_px
            exit_comm = self.settings.commission
            pnl = proceeds - pos.invested - exit_comm - pos.entry_commission
            cost_basis = pos.invested + pos.entry_commission
            ret_pct = (pnl / cost_basis * 100) if cost_basis > 0 else ZERO

            del self.open_positions[sym]
            self.cash += proceeds - exit_comm

            trade = ExecutedTrade(
                event_type="position_closed",
                portfolio=self.settings.name,
                signal_id=pos.signal_id,
                symbol=sym,
                direction=pos.direction,
                date=date,
                price=exit_px,
                quantity=pos.quantity,
                cost_or_proceeds=proceeds,
                commission=exit_comm,
                stop=pos.current_stop,
                pnl=pnl,
                return_percent=ret_pct,
                reason=exit_reason,
                holding_days=max(0, self._days(pos.entry_date, date)),
            )
            executed.append(trade)
            self.closed_trades.append(trade)
            self._log(date, "position_closed", {
                "symbol": sym, "signal_id": pos.signal_id,
                "exit_price": str(exit_px), "quantity": str(pos.quantity),
                "pnl": str(pnl), "reason": exit_reason,
            })

        return executed

    @staticmethod
    def _days(a: str, b: str) -> int:
        from datetime import date as _d
        return (_d.fromisoformat(b) - _d.fromisoformat(a)).days

    # ---------- entries ----------

    def process_signal(
        self,
        signal: IncomingSignal,
        min_quantity: Decimal = ONE,
    ) -> List[Any]:
        """
        Attempt to take a signal. Returns [ExecutedTrade] or [SkippedTrade].
        All rejections carry an explicit, auditable reason.
        """
        sym = signal.symbol
        date = signal.trigger_date
        direction = signal.direction

        # --- validation gate ---
        if signal.atr <= 0 or signal.trigger_price <= 0:
            skip = self._skip(signal, date, "invalid_signal", "non-positive ATR or price")
            return [skip]

        if sym in self.open_positions:
            return [self._skip(signal, date, "existing_position")]

        if len(self.open_positions) >= self.settings.max_total_positions:
            return [self._skip(signal, date, "max_positions")]

        same_sector = sum(
            1 for p in self.open_positions.values()
            if signal.sector and getattr(p, "_sector", None) == signal.sector
        )
        # sector tracking via attribute (kept simple for engine-level logic)
        if same_sector >= self.settings.max_correlated_positions:
            return [self._skip(signal, date, "correlation_exposure",
                               f"sector={signal.sector}")]

        # --- size the position ---
        risk_amount = self.equity() * self.settings.max_risk_per_trade
        risk_per_share = signal.atr * Decimal("2")   # stop_n fixed at 2N (config-owned upstream)
        if risk_per_share <= 0:
            return [self._skip(signal, date, "invalid_signal", "risk_per_share<=0")]

        raw_qty = risk_amount / risk_per_share
        fill = self._fill(signal.trigger_price, direction, entering=True)

        # affordability cap against ACTUAL fill cost
        raw_cost = raw_qty * fill + self.settings.commission
        if raw_cost > self.cash:
            raw_qty = (self.cash - self.settings.commission) / fill

        if self.settings.allow_fractional:
            qty = raw_qty.quantize(Decimal("0.0001"), rounding=ROUND_DOWN)
        else:
            qty = raw_qty.to_integral_value(rounding=ROUND_DOWN)

        if qty < min_quantity:
            return [self._skip(signal, date, "insufficient_capital"
                               if raw_qty < min_quantity else "minimum_quantity")]

        cost = qty * fill + self.settings.commission
        if cost > self.cash:
            return [self._skip(signal, date, "insufficient_capital")]

        stop = calculate_initial_stop(fill, direction, signal.atr, Decimal("2"))

        # --- execute ---
        self.cash -= cost
        pos = OpenPosition(
            symbol=sym,
            signal_id=signal.signal_id,
            direction=direction,
            quantity=qty,
            entry_price=fill,
            invested=qty * fill,
            entry_commission=self.settings.commission,
            initial_stop=stop,
            current_stop=stop,
            entry_date=date,
            last_price=fill,
            mfe_price=fill,
            mae_price=fill,
        )
        if signal.sector:
            setattr(pos, "_sector", signal.sector)
        self.open_positions[sym] = pos

        trade = ExecutedTrade(
            event_type="position_opened",
            portfolio=self.settings.name,
            signal_id=signal.signal_id,
            symbol=sym,
            direction=direction,
            date=date,
            price=fill,
            quantity=qty,
            cost_or_proceeds=cost,
            commission=self.settings.commission,
            stop=stop,
        )
        self._log(date, "position_opened", {
            "symbol": sym, "signal_id": signal.signal_id,
            "entry_price": str(fill), "quantity": str(qty),
            "stop": str(stop), "cost": str(cost),
            "strategy": f"{signal.strategy_name}@v{signal.strategy_version}",
        })
        return [trade]

    def _skip(self, signal: IncomingSignal, date: str, reason: str,
              details: str = "") -> SkippedTrade:
        assert reason in SKIP_REASONS, f"unknown skip reason: {reason}"
        s = SkippedTrade(portfolio=self.settings.name, signal_id=signal.signal_id,
                         symbol=signal.symbol, direction=signal.direction,
                         date=date, reason=reason, details=details)
        self.skips.append(s)
        self._log(date, "trade_skipped", {
            "symbol": signal.symbol, "signal_id": signal.signal_id,
            "reason": reason, "details": details,
        })
        return s

    # ---------- stats ----------

    def stats(self) -> Dict[str, Any]:
        wins = [t for t in self.closed_trades if t.pnl > 0]
        losses = [t for t in self.closed_trades if t.pnl <= 0]
        gross_p = sum((t.pnl for t in wins), ZERO)
        gross_l = abs(sum((t.pnl for t in losses), ZERO))
        peak = self.peak_equity
        eq = self.equity()
        dd = ((peak - eq) / peak * 100) if peak > 0 else ZERO
        return {
            "portfolio": self.settings.name,
            "initial_equity": str(self.settings.initial_equity),
            "equity": str(eq),
            "cash": str(self.cash),
            "open_positions": len(self.open_positions),
            "closed_trades": len(self.closed_trades),
            "winners": len(wins),
            "losers": len(losses),
            "skipped_trades": len(self.skips),
            "realized_pnl": str(sum((t.pnl for t in self.closed_trades), ZERO)),
            "total_return_percent": str(
                (eq - self.settings.initial_equity) / self.settings.initial_equity * 100
            ),
            "current_drawdown_percent": str(dd),
            "profit_factor": (str(gross_p / gross_l) if gross_l > 0 else None),
        }


def route_signal_to_portfolios(
    signal: IncomingSignal,
    engines: List[PortfolioEngine],
    min_quantities: Optional[Dict[str, Decimal]] = None,
) -> Dict[str, List[Any]]:
    """
    Fan one validated signal out to every portfolio engine.
    Each decides independently; results keyed by portfolio name.
    """
    mq = min_quantities or {}
    out: Dict[str, List[Any]] = {}
    for eng in engines:
        out[eng.settings.name] = eng.process_signal(
            signal, min_quantity=mq.get(eng.settings.name, ONE)
        )
    return out
