# ============================================================
# Turtelli 2.0 — Position Sizing Engine
# ============================================================

"""
Position sizing logic for Turtle Trading.

Implements volatility-adjusted position sizing with risk constraints.
"""

from decimal import Decimal
from typing import Optional
from dataclasses import dataclass

from .turtle_engine import TradeDirection


@dataclass
class PortfolioConfig:
    """Portfolio configuration for position sizing."""
    name: str
    initial_equity: Decimal
    max_risk_per_trade: Decimal  # e.g., 0.02 = 2%
    max_correlated_positions: int
    max_total_positions: int
    allow_fractional: bool
    commission: Decimal
    slippage: Decimal  # e.g., 0.001 = 0.1%


@dataclass
class PositionSizeResult:
    """Result of position sizing calculation."""
    quantity: Decimal
    total_cost: Decimal
    risk_amount: Decimal
    risk_per_share: Decimal
    can_afford: bool
    skip_reason: Optional[str] = None


def calculate_position_size_for_portfolio(
    equity: Decimal,
    cash: Decimal,
    current_price: Decimal,
    atr: Decimal,
    stop_n: Decimal,
    direction: TradeDirection,
    config: PortfolioConfig,
    open_positions_count: int,
    same_sector_positions: int,
    existing_position: bool = False,
    price_precision: int = 2,
    min_quantity: Decimal = Decimal("1"),
) -> PositionSizeResult:
    """
    Calculate position size with all portfolio constraints.
    
    Args:
        equity: Current portfolio equity
        cash: Available cash
        current_price: Current market price
        atr: Current ATR value
        stop_n: Stop distance in N units
        direction: LONG or SHORT
        config: Portfolio configuration
        open_positions_count: Number of currently open positions
        same_sector_positions: Positions in same sector
        existing_position: Whether we already have a position in this instrument
        price_precision: Decimal places for price
        min_quantity: Minimum tradable quantity
        
    Returns:
        PositionSizeResult with quantity and skip reason if applicable
    """
    # Check constraints
    if existing_position:
        return PositionSizeResult(
            quantity=Decimal("0"),
            total_cost=Decimal("0"),
            risk_amount=Decimal("0"),
            risk_per_share=Decimal("0"),
            can_afford=False,
            skip_reason="existing_position",
        )
    
    if open_positions_count >= config.max_total_positions:
        return PositionSizeResult(
            quantity=Decimal("0"),
            total_cost=Decimal("0"),
            risk_amount=Decimal("0"),
            risk_per_share=Decimal("0"),
            can_afford=False,
            skip_reason="max_positions",
        )
    
    if same_sector_positions >= config.max_correlated_positions:
        return PositionSizeResult(
            quantity=Decimal("0"),
            total_cost=Decimal("0"),
            risk_amount=Decimal("0"),
            risk_per_share=Decimal("0"),
            can_afford=False,
            skip_reason="correlation_exposure",
        )
    
    if atr <= 0 or current_price <= 0:
        return PositionSizeResult(
            quantity=Decimal("0"),
            total_cost=Decimal("0"),
            risk_amount=Decimal("0"),
            risk_per_share=Decimal("0"),
            can_afford=False,
            skip_reason="invalid_price_data",
        )
    
    # Calculate risk parameters
    risk_amount = equity * config.max_risk_per_trade
    risk_per_share = atr * stop_n
    
    if risk_per_share <= 0:
        return PositionSizeResult(
            quantity=Decimal("0"),
            total_cost=Decimal("0"),
            risk_amount=Decimal("0"),
            risk_per_share=Decimal("0"),
            can_afford=False,
            skip_reason="invalid_risk_calculation",
        )
    
    # Calculate raw quantity
    raw_quantity = risk_amount / risk_per_share
    
    # Apply slippage to entry price
    if direction == TradeDirection.LONG:
        adjusted_price = current_price * (1 + config.slippage)
    else:
        adjusted_price = current_price * (1 - config.slippage)
    
    # Check affordability
    total_cost = raw_quantity * adjusted_price + config.commission
    if total_cost > cash:
        # Reduce to what we can afford
        raw_quantity = (cash - config.commission) / adjusted_price
        total_cost = raw_quantity * adjusted_price + config.commission
    
    # Apply rounding
    if config.allow_fractional:
        quantity = raw_quantity.quantize(Decimal("0.0001"))
    else:
        quantity = raw_quantity.to_integral_value(rounding="ROUND_DOWN")
    
    # Enforce minimum
    if quantity < min_quantity:
        return PositionSizeResult(
            quantity=Decimal("0"),
            total_cost=Decimal("0"),
            risk_amount=Decimal("0"),
            risk_per_share=Decimal("0"),
            can_afford=False,
            skip_reason="insufficient_capital",
        )
    
    # Recalculate actual cost
    actual_cost = quantity * adjusted_price + config.commission
    
    return PositionSizeResult(
        quantity=quantity,
        total_cost=actual_cost,
        risk_amount=risk_amount,
        risk_per_share=risk_per_share,
        can_afford=True,
    )
