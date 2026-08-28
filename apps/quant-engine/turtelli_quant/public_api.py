# ============================================================
# Turtelli 2.0 — Public Read Model
# ============================================================

"""
Serializes engine state into the shapes the public website consumes.

Rules:
- Read-only. This layer can NEVER mutate portfolios or signals.
- Every response carries record_type so BACKTEST/PAPER/LIVE are
  never confusable.
- Skips and losses are first-class citizens (radical transparency).
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional

from .portfolio_engine import PortfolioEngine
from .scanner_v2 import InstrumentScan


def _d(x: Optional[Decimal]) -> Optional[float]:
    return float(x) if x is not None else None


def portfolio_summary(eng: PortfolioEngine) -> Dict[str, Any]:
    """Public card for one portfolio."""
    s = eng.stats()
    eq = float(s["equity"])
    initial = float(s["initial_equity"])
    wins = int(s["winners"])
    closed = int(s["closed_trades"])
    return {
        "record_type": "PAPER",
        "name": s["portfolio"],
        "display_name": eng.settings.display_name,
        "inception_date": eng.equity_history[0].date if eng.equity_history else None,
        "initial_equity": initial,
        "current_equity": round(eq, 2),
        "cash": round(float(s["cash"]), 2),
        "total_return_percent": round((eq - initial) / initial * 100, 4),
        "current_drawdown_percent": round(float(s["current_drawdown_percent"]), 4),
        "open_positions": int(s["open_positions"]),
        "closed_trades": closed,
        "winners": wins,
        "losers": int(s["losers"]),
        "win_rate_percent": round(wins / closed * 100, 2) if closed else None,
        "skipped_trades": int(s["skipped_trades"]),
        "profit_factor": (
            round(float(s["profit_factor"]), 4)
            if s.get("profit_factor") is not None else None
        ),
    }


def equity_curve(eng: PortfolioEngine, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    pts = eng.equity_history[-limit:] if limit else eng.equity_history
    return [
        {
            "record_type": "PAPER",
            "date": p.date,
            "equity": _d(p.equity),
            "cash": _d(p.cash),
            "open_positions": p.open_positions,
            "drawdown_percent": _d(p.drawdown_percent),
        }
        for p in pts
    ]


def trade_ledger(
    eng: PortfolioEngine,
    status: str = "all",          # all | open | closed | skipped
    limit: int = 100,
    offset: int = 0,
) -> Dict[str, Any]:
    """
    Public ledger. Closed trades, open positions, AND skips — nothing hidden.
    Sorted most recent first.
    """
    items: List[Dict[str, Any]] = []

    if status in ("all", "closed"):
        for t in reversed(eng.closed_trades):
            items.append({
                "record_type": "PAPER",
                "kind": "closed_trade",
                "portfolio": t.portfolio,
                "signal_id": t.signal_id,
                "symbol": t.symbol,
                "direction": t.direction.value,
                "entry_date": None,          # filled by position lookup below
                "exit_date": t.date,
                "exit_price": _d(t.price),
                "quantity": _d(t.quantity),
                "pnl": round(_d(t.pnl), 2),
                "return_percent": round(_d(t.return_percent), 4),
                "reason": t.reason,
                "holding_days": t.holding_days,
            })

    if status in ("all", "open"):
        for sym, pos in eng.open_positions.items():
            items.append({
                "record_type": "PAPER",
                "kind": "open_position",
                "portfolio": pos.signal_id.split("|")[0] if "|" in pos.signal_id else eng.settings.name,
                "signal_id": pos.signal_id,
                "symbol": sym,
                "direction": pos.direction.value,
                "entry_date": pos.entry_date,
                "entry_price": _d(pos.entry_price),
                "last_price": _d(pos.last_price),
                "quantity": _d(pos.quantity),
                "stop": _d(pos.current_stop),
                "pyramid_count": pos.pyramid_count,
            })

    if status in ("all", "skipped"):
        for s in reversed(eng.skips):
            items.append({
                "record_type": "PAPER",
                "kind": "skipped_trade",
                "portfolio": s.portfolio,
                "signal_id": s.signal_id,
                "symbol": s.symbol,
                "direction": s.direction.value,
                "date": s.date,
                "reason": s.reason,
                "details": s.details,
            })

    total = len(items)
    window = items[offset:offset + limit]
    # annotate entry info for closed trades where possible
    by_signal = {pos.signal_id: pos for pos in eng.open_positions.values()}
    return {"record_type": "PAPER", "total": total, "items": window}


def trade_detail(
    micro: PortfolioEngine,
    standard: PortfolioEngine,
    signal_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Permanent trade page payload across BOTH portfolios.
    Includes participation per portfolio and full event timeline.
    """
    def find(eng: PortfolioEngine):
        for sym, pos in eng.open_positions.items():
            if pos.signal_id == signal_id:
                last = pos.last_price
                unrealized = (
                    (last - pos.entry_price) * pos.quantity
                    if pos.direction.value == "LONG"
                    else (pos.entry_price - last) * pos.quantity
                )
                return {
                    "status": "OPEN",
                    "symbol": sym,
                    "direction": pos.direction.value,
                    "entry_date": pos.entry_date,
                    "entry_price": _d(pos.entry_price),
                    "last_price": _d(last),
                    "quantity": _d(pos.quantity),
                    "initial_stop": _d(pos.initial_stop),
                    "current_stop": _d(pos.current_stop),
                    "unrealized_pnl": round(_d(unrealized), 2),
                    "pyramids": pos.pyramid_count,
                }
        for t in reversed(eng.closed_trades):
            if t.signal_id == signal_id:
                return {
                    "status": "CLOSED",
                    "symbol": t.symbol,
                    "direction": t.direction.value,
                    "entry_date": None,
                    "exit_date": t.date,
                    "exit_price": _d(t.price),
                    "quantity": _d(t.quantity),
                    "pnl": round(_d(t.pnl), 2),
                    "return_percent": round(_d(t.return_percent), 4),
                    "exit_reason": t.reason,
                    "holding_days": t.holding_days,
                }
        for s in reversed(eng.skips):
            if s.signal_id == signal_id:
                return {"status": "SKIPPED", "symbol": s.symbol,
                        "direction": s.direction.value,
                        "date": s.date, "reason": s.reason}
        return None

    m = find(micro)
    st = find(standard)
    if m is None and st is None:
        return None

    timeline: List[Dict[str, Any]] = []
    for name, eng in (("TURTELLI_MICRO", micro), ("TURTELLI_STANDARD", standard)):
        for ev in eng.events:
            data = ev.data or {}
            if data.get("signal_id") == signal_id:
                timeline.append({
                    "portfolio": name,
                    "date": ev.timestamp_hint,
                    "event": ev.event_type,
                    **data,
                })
    timeline.sort(key=lambda e: e["date"])

    ref = m or st
    return {
        "record_type": "PAPER",
        "signal_id": signal_id,
        "symbol": ref.get("symbol"),
        "direction": ref.get("direction"),
        "participation": {
            "TURTELLI_MICRO": m,
            "TURTELLI_STANDARD": st,
        },
        "timeline": timeline,
    }


def scanner_view(scans: Dict[str, InstrumentScan], limit: int = 50) -> Dict[str, Any]:
    """
    Near-breakout scanner payload.
    Includes triggered candidates FIRST, then nearest approaches.
    """
    rows: List[Dict[str, Any]] = []
    for sym, scan in scans.items():
        if not scan.validation_ok:
            continue
        dists = []
        for label, d in (
            ("LONG_20D", scan.long_dist_20_pct),
            ("SHORT_20D", scan.short_dist_20_pct),
            ("LONG_55D", scan.long_dist_55_pct),
            ("SHORT_55D", scan.short_dist_55_pct),
        ):
            if d is not None and d >= 0:
                dists.append({"system_level": label, "distance_percent": round(_d(d) * 100, 3)})
        best = min((x["distance_percent"] for x in dists), default=None)

        triggered = [
            {
                "direction": s.direction.value,
                "system": s.system_name,
                "breakout_level": _d(s.breakout_level),
                "trigger_price": _d(s.trigger_price),
            }
            for s in getattr(scan, "signals", [])
        ]

        rows.append({
            "symbol": sym,
            "state": scan.state,
            "close": _d(scan.close),
            "atr20": _d(scan.atr20),
            "best_distance_percent": best,
            "levels": dists,
            "triggered_today": triggered,
            "_sort_key": (0 if triggered else 1, best if best is not None else 1e9),
        })

    rows.sort(key=lambda r: r["_sort_key"])
    for r in rows:
        r.pop("_sort_key")
    return {
        "record_type": "SCAN",
        "scanned": len(rows),
        "instruments": rows[:limit],
    }


def homepage_snapshot(
    engines: List[PortfolioEngine],
    scan_result: Dict[str, Any],
) -> Dict[str, Any]:
    """Everything the homepage needs in one call."""
    scans: Dict[str, InstrumentScan] = scan_result["scans"]
    near = sum(
        1 for s in scans.values()
        if s.state in ("WATCHING", "NEAR_TRIGGER")
    )
    triggered_today = len(scan_result["candidates"])
    open_positions = sum(len(e.open_positions) for e in engines)

    recent_closed = []
    for eng in engines:
        for t in reversed(eng.closed_trades[-5:]):
            recent_closed.append({
                "portfolio": t.portfolio,
                "symbol": t.symbol,
                "direction": t.direction.value,
                "date": t.date,
                "pnl": round(_d(t.pnl), 2),
                "return_percent": round(_d(t.return_percent), 4),
                "reason": t.reason,
            })
    recent_closed.sort(key=lambda x: x["date"], reverse=True)

    return {
        "record_type": "PAPER",
        "markets_scanned": scan_result["scanned"],
        "validation_failures": len(scan_result["validation_failures"]),
        "signals_watching": near,
        "triggers_today": triggered_today,
        "active_positions": open_positions,
        "portfolios": [portfolio_summary(e) for e in engines],
        "recently_closed": recent_closed[:10],
    }


def disclaimer() -> Dict[str, str]:
    """Mandatory disclosure shipped with every product surface."""
    return {
        "disclaimer": (
            "Turtelli operates simulated paper portfolios for educational "
            "and research purposes. Past performance does not guarantee "
            "future results. Nothing here is investment advice."
        ),
        "track_record_type": "LIVE PAPER SIMULATION — NOT REAL MONEY",
    }
