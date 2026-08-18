# ============================================================
# Turtelli 2.0 — Backtesting Engine
# ============================================================

"""
High-quality backtesting system using the exact same strategy code
as live operation.

Avoids having one set of rules for backtesting and another for live.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional, Dict, Any
from enum import Enum

from .turtle_engine import (
    DailyBar,
    StrategyConfig,
    TradeDirection,
    SignalStatus,
    calculate_donchian_channel,
    calculate_atr,
    calculate_initial_stop,
    calculate_position_size,
    check_breakout,
    check_exit,
)


class BacktestTradeStatus(Enum):
    PENDING = "PENDING"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    STOPPED = "STOPPED"


@dataclass
class BacktestTrade:
    """Single backtest trade record."""
    symbol: str
    direction: TradeDirection
    system: str
    
    # Entry
    entry_date: str
    entry_price: Decimal
    
    # Exit
    exit_date: Optional[str] = None
    exit_price: Optional[Decimal] = None
    exit_reason: Optional[str] = None
    
    # Position
    quantity: Decimal = Decimal("1")
    total_cost: Decimal = Decimal("0")
    
    # Risk
    initial_stop: Decimal = Decimal("0")
    current_stop: Decimal = Decimal("0")
    
    # Performance
    pnl: Decimal = Decimal("0")
    return_percent: Decimal = Decimal("0")
    holding_days: int = 0
    
    # State
    status: BacktestTradeStatus = BacktestTradeStatus.PENDING
    
    # Tracking
    max_favorable: Decimal = Decimal("0")
    max_adverse: Decimal = Decimal("0")


@dataclass
class BacktestResult:
    """Complete backtest result."""
    config: StrategyConfig
    start_date: str
    end_date: str
    
    # Performance
    initial_capital: Decimal
    final_capital: Decimal
    total_return: Decimal
    annualized_return: Decimal
    
    # Risk metrics
    max_drawdown: Decimal
    sharpe_ratio: Decimal
    win_rate: Decimal
    profit_factor: Decimal
    
    # Trade statistics
    total_trades: int
    winning_trades: int
    losing_trades: int
    average_win: Decimal
    average_loss: Decimal
    
    # Trades
    trades: List[BacktestTrade] = field(default_factory=list)
    
    # Equity curve
    equity_curve: List[Dict[str, Any]] = field(default_factory=list)


class BacktestEngine:
    """
    Backtesting engine that uses the same strategy code as live trading.
    
    CRITICAL: This engine uses the EXACT SAME functions from turtle_engine.py
    as the live scanner. No separate rules for backtesting.
    """
    
    def __init__(
        self,
        config: StrategyConfig,
        initial_capital: Decimal = Decimal("10000"),
        commission: Decimal = Decimal("0"),
        slippage: Decimal = Decimal("0.001"),
    ):
        self.config = config
        self.initial_capital = initial_capital
        self.commission = commission
        self.slippage = slippage
    
    def run(
        self,
        bars: List[DailyBar],
        symbol: str,
    ) -> BacktestResult:
        """
        Run backtest on historical data.
        
        Args:
            bars: Historical daily bars (sorted by date ascending)
            symbol: Instrument symbol
            
        Returns:
            BacktestResult with all metrics
        """
        if len(bars) < self.config.entry_days + 10:
            raise ValueError(
                f"Insufficient bars: {len(bars)} "
                f"(need {self.config.entry_days + 10}+)"
            )
        
        # Initialize state
        capital = self.initial_capital
        trades: List[BacktestTrade] = []
        equity_curve = []
        current_trade: Optional[BacktestTrade] = None
        
        # Need to skip first `entry_days` bars for channel calculation
        start_idx = self.config.entry_days
        
        for i in range(start_idx, len(bars)):
            current_bar = bars[i]
            lookback_bars = bars[:i + 1]
            
            # Calculate indicators using EXACT same functions as live
            channel = calculate_donchian_channel(
                lookback_bars,
                self.config.entry_days,
                current_bar.date,
            )
            
            atr = calculate_atr(
                lookback_bars,
                self.config.atr_period,
                current_bar.date,
            )
            
            if channel is None or atr is None or atr <= 0:
                continue
            
            # Check for existing position
            if current_trade and current_trade.status == BacktestTradeStatus.OPEN:
                # Check for exit
                exit_channel = calculate_donchian_channel(
                    lookback_bars,
                    self.config.exit_days,
                    current_bar.date,
                )
                
                if exit_channel and check_exit(
                    lookback_bars,
                    exit_channel,
                    current_trade.direction,
                    current_bar,
                ):
                    # Exit position
                    current_trade.exit_date = current_bar.date
                    current_trade.exit_price = current_bar.close
                    current_trade.exit_reason = "exit_channel"
                    current_trade.status = BacktestTradeStatus.CLOSED
                    
                    # Calculate P&L
                    if current_trade.direction == TradeDirection.LONG:
                        current_trade.pnl = (
                            (current_bar.close - current_trade.entry_price)
                            * current_trade.quantity
                            - self.commission
                        )
                    else:
                        current_trade.pnl = (
                            (current_trade.entry_price - current_bar.close)
                            * current_trade.quantity
                            - self.commission
                        )
                    
                    current_trade.return_percent = (
                        current_trade.pnl / current_trade.total_cost * 100
                    )
                    
                    # Update capital
                    capital += current_trade.pnl
                    trades.append(current_trade)
                    current_trade = None
                
                # Check for stop hit
                elif current_trade:
                    if current_trade.direction == TradeDirection.LONG:
                        if current_bar.low <= current_trade.current_stop:
                            current_trade.exit_date = current_bar.date
                            current_trade.exit_price = current_trade.current_stop
                            current_trade.exit_reason = "stop_loss"
                            current_trade.status = BacktestTradeStatus.STOPPED
                            
                            current_trade.pnl = (
                                (current_trade.current_stop - current_trade.entry_price)
                                * current_trade.quantity
                                - self.commission
                            )
                            current_trade.return_percent = (
                                current_trade.pnl / current_trade.total_cost * 100
                            )
                            
                            capital += current_trade.pnl
                            trades.append(current_trade)
                            current_trade = None
                    else:
                        if current_bar.high >= current_trade.current_stop:
                            current_trade.exit_date = current_bar.date
                            current_trade.exit_price = current_trade.current_stop
                            current_trade.exit_reason = "stop_loss"
                            current_trade.status = BacktestTradeStatus.STOPPED
                            
                            current_trade.pnl = (
                                (current_trade.entry_price - current_trade.current_stop)
                                * current_trade.quantity
                                - self.commission
                            )
                            current_trade.return_percent = (
                                current_trade.pnl / current_trade.total_cost * 100
                            )
                            
                            capital += current_trade.pnl
                            trades.append(current_trade)
                            current_trade = None
            
            # Check for new entry
            if current_trade is None:
                for direction in [TradeDirection.LONG, TradeDirection.SHORT]:
                    if check_breakout(lookback_bars, channel, direction, current_bar):
                        # Calculate position size using EXACT same function
                        quantity = calculate_position_size(
                            equity=capital,
                            risk_percent=self.config.unit_risk_percent,
                            atr=atr,
                            stop_n=self.config.stop_n,
                            current_price=current_bar.close,
                            allow_fractional=True,
                        )
                        
                        if quantity > 0:
                            # Apply slippage
                            if direction == TradeDirection.LONG:
                                entry_price = current_bar.close * (1 + self.slippage)
                            else:
                                entry_price = current_bar.close * (1 - self.slippage)
                            
                            # Calculate stop using EXACT same function
                            initial_stop = calculate_initial_stop(
                                entry_price,
                                direction,
                                atr,
                                self.config.stop_n,
                            )
                            
                            total_cost = quantity * entry_price + self.commission
                            
                            if total_cost <= capital:
                                current_trade = BacktestTrade(
                                    symbol=symbol,
                                    direction=direction,
                                    system=self.config.display_name,
                                    entry_date=current_bar.date,
                                    entry_price=entry_price,
                                    quantity=quantity,
                                    total_cost=total_cost,
                                    initial_stop=initial_stop,
                                    current_stop=initial_stop,
                                    status=BacktestTradeStatus.OPEN,
                                )
                                capital -= total_cost
                                break
            
            # Record equity
            equity = capital
            if current_trade and current_trade.status == BacktestTradeStatus.OPEN:
                if current_trade.direction == TradeDirection.LONG:
                    equity += current_trade.quantity * current_bar.close
                else:
                    equity += current_trade.quantity * (
                        2 * current_trade.entry_price - current_bar.close
                    )
            
            equity_curve.append({
                "date": current_bar.date,
                "equity": float(equity),
                "capital": float(capital),
            })
        
        # Close any remaining position at last bar
        if current_trade and current_trade.status == BacktestTradeStatus.OPEN:
            last_bar = bars[-1]
            current_trade.exit_date = last_bar.date
            current_trade.exit_price = last_bar.close
            current_trade.exit_reason = "backtest_end"
            current_trade.status = BacktestTradeStatus.CLOSED
            
            if current_trade.direction == TradeDirection.LONG:
                current_trade.pnl = (
                    (last_bar.close - current_trade.entry_price)
                    * current_trade.quantity
                    - self.commission
                )
            else:
                current_trade.pnl = (
                    (current_trade.entry_price - last_bar.close)
                    * current_trade.quantity
                    - self.commission
                )
            
            current_trade.return_percent = (
                current_trade.pnl / current_trade.total_cost * 100
            )
            
            capital += current_trade.pnl
            trades.append(current_trade)
        
        # Calculate metrics
        final_capital = capital
        total_return = (final_capital - self.initial_capital) / self.initial_capital
        
        winning_trades = [t for t in trades if t.pnl > 0]
        losing_trades = [t for t in trades if t.pnl <= 0]
        
        win_rate = (
            len(winning_trades) / len(trades) * 100
            if trades
            else Decimal("0")
        )
        
        # Calculate max drawdown
        peak = self.initial_capital
        max_drawdown = Decimal("0")
        for point in equity_curve:
            equity = Decimal(str(point["equity"]))
            if equity > peak:
                peak = equity
            drawdown = (peak - equity) / peak
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        return BacktestResult(
            config=self.config,
            start_date=bars[0].date,
            end_date=bars[-1].date,
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            total_return=total_return,
            annualized_return=total_return,  # Simplified
            max_drawdown=max_drawdown,
            sharpe_ratio=Decimal("0"),  # TODO: Calculate properly
            win_rate=win_rate,
            profit_factor=Decimal("0"),  # TODO: Calculate properly
            total_trades=len(trades),
            winning_trades=len(winning_trades),
            losing_trades=len(losing_trades),
            average_win=(
                sum(t.pnl for t in winning_trades) / len(winning_trades)
                if winning_trades
                else Decimal("0")
            ),
            average_loss=(
                sum(t.pnl for t in losing_trades) / len(losing_trades)
                if losing_trades
                else Decimal("0")
            ),
            trades=trades,
            equity_curve=equity_curve,
        )
