# ============================================================
# Turtelli 2.0 — Bridge: Quant Engine -> API Ingest
# ============================================================

"""
Runs the full pipeline against live market data and pushes results
to the API's /internal/ingest endpoint:

    yfinance -> DailyScanner -> (candidates) -> dual portfolios
             -> JSON payload -> API

Usage:
    python -m turtelli_quant.bridge --once          # single run
    python -m turtelli_quant.bridge --loop 300      # every 5 min
"""

import argparse
import json
import logging
import os
import time
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import Dict, List

import requests

from .market_data.yfinance import YFinanceProvider
from .market_data.registry import ManagedProvider
from .scanner_v2 import DailyScanner, AdaptiveMonitorQueue, InstrumentScan
from .portfolio_engine import (
    PortfolioEngine,
    MICRO_SETTINGS,
    STANDARD_SETTINGS,
    IncomingSignal,
    ExecutedTrade,
    SkippedTrade,
)
from .turtle_engine import TradeDirection

logger = logging.getLogger(__name__)

UNIVERSE = [
    # Tech
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD",
    # Finance
    "JPM", "BAC", "GS",
    # Healthcare
    "JNJ", "UNH",
    # Consumer
    "WMT", "COST", "KO",
    # Industrial/Energy
    "CAT", "XOM",
    # ETFs
    "SPY", "QQQ", "IWM", "VTI", "XLF", "XLK", "XLE", "XLI",
]


def to_float(d: Decimal | None) -> float | None:
    return float(d) if d is not None else None


class PipelineBridge:
    def __init__(self, api_url: str, ingest_token: str):
        self.provider = ManagedProvider(YFinanceProvider())
        self.scanner = DailyScanner()
        self.queue_builder = AdaptiveMonitorQueue()
        self.micro = PortfolioEngine(MICRO_SETTINGS)
        self.standard = PortfolioEngine(STANDARD_SETTINGS)
        self.api_url = api_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers["x-ingest-token"] = ingest_token

        # Watch registry for intraday-style re-polling between scans:
        # symbol -> (direction, breakout_level, atr, channel_date)
        self.armed: Dict[str, dict] = {}

    # ---------- data gathering ----------

    def fetch_universe(self) -> tuple[Dict[str, list], Dict[str, str]]:
        universe_bars: Dict[str, list] = {}
        dates: Dict[str, str] = {}
        for sym in UNIVERSE:
            try:
                bars = self.provider.get_daily_bars(sym, limit=80)
                if len(bars) >= 60:
                    universe_bars[sym] = bars
                    dates[sym] = bars[-1].date
            except Exception as e:
                logger.warning("fetch failed for %s: %s", sym, e)
        return universe_bars, dates

    # ---------- transformation ----------

    def scan_to_signal_records(self, result: dict) -> List[dict]:
        out = []
        scans: Dict[str, InstrumentScan] = result["scans"]
        candidate_keys = {(c.symbol, c.direction.value) for c in result["candidates"]}

        for sym, s in scans.items():
            if not s.validation_ok or s.close <= 0:
                continue
            dists = [d for d in (
                s.long_dist_20_pct, s.short_dist_20_pct,
                s.long_dist_55_pct, s.short_dist_55_pct)
                if d is not None and d >= 0]
            min_dist = float(min(dists) * 100) if dists else None

            state = s.state
            sig_state: str
            if state in ("NORMAL", "WATCHING", "NEAR_TRIGGER"):
                sig_state = {"NORMAL": "DISCOVERED", "WATCHING": "WATCHING",
                             "NEAR_TRIGGER": "NEAR_TRIGGER"}[state]
                if (sym, "LONG") in candidate_keys or (sym, "SHORT") in candidate_keys:
                    sig_state = "NEAR_TRIGGER"
            else:
                sig_state = "OPEN" if state == "ACTIVE_POSITION" else state

            out.append({
                "signalId": f"scan-{sym}-{s.scan_date}",
                "symbol": sym,
                "direction": "LONG" if (s.long_dist_20_pct or 0) >= 0 else "SHORT",
                "systemName": "turtle_system_1",
                "strategyVersion": 1,
                "configHash": "scanner-v2",
                "triggerDate": s.scan_date,
                "triggerPrice": float(s.close),
                "breakoutLevel": to_float(s.high_20 if (s.long_dist_20_pct or 99) < (s.short_dist_20_pct or 99) else s.low_20) or 0,
                "exitLevel": to_float(s.low_20) or 0,
                "atr": to_float(s.atr20) or 0,
                "state": sig_state,
                "distanceToBreakoutPct": round(min_dist, 4) if min_dist is not None else 0,
            })
        return out

    def candidates_to_signals_and_process(self, result: dict) -> None:
        """Route confirmed breakouts into both portfolios."""
        for cand in result["candidates"]:
            sig = IncomingSignal(
                signal_id=f"sig-{cand.symbol}-{cand.scan_date}-{cand.system_name}",
                symbol=cand.symbol,
                direction=cand.direction,
                strategy_name=cand.system_name,
                strategy_version=cand.strategy_version,
                config_hash=cand.config_hash,
                trigger_date=cand.scan_date,
                trigger_price=cand.trigger_price,
                atr=cand.atr if cand.atr > 0 else Decimal("1"),
            )
            for eng in (self.micro, self.standard):
                eng.process_signal(sig)

    def portfolio_snapshots(self) -> List[dict]:
        snaps = []
        for eng in (self.micro, self.standard):
            eq = eng.equity()
            peak = max(eng.peak_equity, eq)
            dd = ((peak - eq) / peak * 100) if peak > 0 else Decimal("0")
            snaps.append({
                "portfolio": eng.settings.name,
                "displayName": eng.settings.display_name,
                "initialEquity": float(eng.settings.initial_equity),
                "equity": float(eq),
                "cash": float(eng.cash),
                "openPositions": len(eng.open_positions),
                "totalReturnPct": round(float(
                    (eq - eng.settings.initial_equity)
                    / eng.settings.initial_equity * 100), 4),
                "maxDrawdownPct": round(float(dd), 4),
                "asOf": datetime.now(timezone.utc).isoformat(),
            })
        return snaps

    def position_records(self) -> List[dict]:
        out = []
        now_date = date.today().isoformat()
        for eng in (self.micro, self.standard):
            for sym, pos in eng.open_positions.items():
                mv_pnl = (
                    (pos.last_price - pos.entry_price) * pos.quantity
                    if pos.direction == TradeDirection.LONG
                    else (pos.entry_price - pos.last_price) * pos.quantity
                )
                out.append({
                    "positionId": f"{eng.settings.name}-{sym}-{pos.entry_date}",
                    "portfolio": eng.settings.name,
                    "signalId": pos.signal_id,
                    "symbol": sym,
                    "direction": pos.direction.value,
                    "quantity": float(pos.quantity),
                    "entryPrice": float(pos.entry_price),
                    "entryDate": pos.entry_date,
                    "currentStop": float(pos.current_stop),
                    "lastPrice": float(pos.last_price),
                    "unrealizedPnl": round(float(mv_pnl), 2),
                    "pyramidCount": pos.pyramid_count,
                    "status": "OPEN",
                })
            for t in eng.closed_trades:
                out.append({
                    "positionId": f"{eng.settings.name}-{t.symbol}-{t.date}-closed",
                    "portfolio": eng.settings.name,
                    "signalId": t.signal_id,
                    "symbol": t.symbol,
                    "direction": t.direction.value,
                    "quantity": float(t.quantity),
                    "entryPrice": 0,   # closed record focuses on exit side
                    "entryDate": now_date,
                    "currentStop": 0,
                    "lastPrice": float(t.price),
                    "unrealizedPnl": 0,
                    "pyramidCount": 0,
                    "status": "CLOSED",
                    "closedPrice": float(t.price),
                    "closedDate": t.date,
                    "realizedPnl": round(float(t.pnl), 2),
                    "realizedPnlPct": round(float(t.return_percent), 4),
                    "closeReason": t.reason,
                    "holdingDays": t.holding_days,
                })
        return out

    # ---------- main cycle ----------

    def run_cycle(self) -> dict:
        logger.info("=== Turtelli bridge cycle start ===")
        universe_bars, dates = self.fetch_universe()
        logger.info("Fetched %d/%d symbols", len(universe_bars), len(UNIVERSE))

        result = self.scanner.run_daily_scan(universe_bars, dates)
        logger.info(
            "Scan: %d scanned, %d candidates, %d validation failures",
            result["scanned"], len(result["candidates"]),
            len(result["validation_failures"]),
        )

        # Route confirmed breakouts through the dual portfolios
        self.candidates_to_signals_and_process(result)

        states_count: Dict[str, int] = {}
        for s in result["scans"].values():
            states_count[s.state] = states_count.get(s.state, 0) + 1

        payload = {
            "signals": self.scan_to_signal_records(result),
            "positions": self.position_records(),
            "skips": [
                {
                    "portfolio": s.portfolio,
                    "signalId": s.signal_id,
                    "symbol": s.symbol,
                    "direction": s.direction.value,
                    "date": s.date,
                    "reason": s.reason,
                    "details": s.details,
                }
                for eng in (self.micro, self.standard)
                for s in eng.skips
            ],
            "portfolios": self.portfolio_snapshots(),
            "scanStatus": {
                "lastScanAt": None,  # set by store
                "universeSize": len(UNIVERSE),
                "scannedCount": result["scanned"],
                "validationFailures": len(result["validation_failures"]),
                "candidatesFound": len(result["candidates"]),
                "states": states_count,
            },
        }

        try:
            resp = self.session.post(
                f"{self.api_url}/internal/ingest", json=payload, timeout=10)
            resp.raise_for_status()
            logger.info("Ingest OK: %s", resp.json())
        except Exception as e:
            logger.error("Ingest failed (API down?): %s", e)

        # Log portfolio state for visibility
        for snap in payload["portfolios"]:
            logger.info(
                "%-18s equity=%.2f (%+.2f%%) open=%d skips=%d",
                snap["displayName"], snap["equity"], snap["totalReturnPct"],
                snap["openPositions"],
                len(self.micro.skips if snap["portfolio"] == "TURTELLI_MICRO"
                    else self.standard.skips),
            )
        return payload


def main():
    parser = argparse.ArgumentParser(description="Turtelli quant bridge")
    parser.add_argument("--api-url", default=os.environ.get("API_URL", "http://localhost:3001"))
    parser.add_argument("--ingest-token", default=os.environ.get("INGEST_TOKEN", "dev-ingest-token"))
    parser.add_argument("--once", action="store_true", help="run a single cycle")
    parser.add_argument("--loop", type=int, default=0, help="loop every N seconds")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    bridge = PipelineBridge(args.api_url, args.ingest_token)

    if args.loop > 0:
        while True:
            try:
                bridge.run_cycle()
            except Exception:
                logger.exception("cycle failed")
            time.sleep(args.loop)
    else:
        bridge.run_cycle()


if __name__ == "__main__":
    main()
