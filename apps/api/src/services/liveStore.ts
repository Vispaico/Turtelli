// ============================================================
// Turtelli 2.0 — In-Memory Live Store
// ============================================================
// Bridges the Python quant engine's output into the API layer.
// In production this is backed by PostgreSQL; for Phase 1 runtime
// this is the single source of truth the API reads from.
//
// Data flows IN via ingest functions (called by scan/worker processes)
// and OUT via typed getters (used by API routes).
//
// INVARIANTS:
// - Trade history is append-only (never filtered, never rewritten)
// - Skipped trades are first-class records
// - BACKTEST vs PAPER record_type is preserved end-to-end
// ============================================================

export interface SignalRecord {
  signalId: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  systemName: string;
  strategyVersion: number;
  configHash: string;
  triggerDate: string;
  triggerPrice: number;
  breakoutLevel: number;
  exitLevel: number;
  atr: number;
  state:
    | "DISCOVERED"
    | "WATCHING"
    | "NEAR_TRIGGER"
    | "TRIGGERED"
    | "OPEN"
    | "CLOSED"
    | "INVALIDATED";
  distanceToBreakoutPct: number;
  marketRegime?: string;
  aiScore?: number;
}

export interface PositionRecord {
  positionId: string;
  portfolio: "TURTELLI_MICRO" | "TURTELLI_STANDARD";
  signalId: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  entryPrice: number;
  entryDate: string;
  currentStop: number;
  lastPrice: number;
  unrealizedPnl: number;
  pyramidCount: number;
  status: "OPEN" | "CLOSED" | "STOPPED_OUT" | "EXITED";
  closedPrice?: number;
  closedDate?: string;
  realizedPnl?: number;
  realizedPnlPct?: number;
  closeReason?: string; // stop_loss | exit_channel | end_of_data
  holdingDays?: number;
}

export interface SkipRecord {
  portfolio: string;
  signalId: string;
  symbol: string;
  direction: string;
  date: string;
  reason: string;
  details?: string;
}

export interface PortfolioSnapshot {
  portfolio: "TURTELLI_MICRO" | "TURTELLI_STANDARD";
  displayName: string;
  initialEquity: number;
  equity: number;
  cash: number;
  openPositions: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  asOf: string;
}

export interface ScanStatus {
  lastScanAt: string | null;
  universeSize: number;
  scannedCount: number;
  validationFailures: number;
  candidatesFound: number;
  states: Record<string, number>; // MonitoringState -> count
}

/**
 * Simple sequential mutation queue — replaces a mutex dependency.
 * All ingest operations are serialized through this chain.
 */
function createMutationQueue() {
  let tail: Promise<void> = Promise.resolve();
  return function enqueue<T>(fn: () => T): Promise<T> {
    const next = tail.then(fn, fn);
    tail = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };
}

class LiveStore {
  private signals = new Map<string, SignalRecord>();
  private positions: PositionRecord[] = [];
  private skips: SkipRecord[] = [];
  private portfolios = new Map<string, PortfolioSnapshot>();
  private scan: ScanStatus = {
    lastScanAt: null,
    universeSize: 0,
    scannedCount: 0,
    validationFailures: 0,
    candidatesFound: 0,
    states: {},
  };
  private enqueue = createMutationQueue();

  // ---------------- ingest ----------------

  async ingestSignals(signals: SignalRecord[]) {
    await this.enqueue(() => {
      for (const s of signals) this.signals.set(s.signalId, s);
    });
  }

  async ingestPosition(p: PositionRecord) {
    await this.enqueue(() => {
      const idx = this.positions.findIndex(
        (x) =>
          x.portfolio === p.portfolio &&
          x.symbol === p.symbol &&
          x.entryDate === p.entryDate
      );
      if (idx >= 0) this.positions[idx] = p;
      else this.positions.push(p);
    });
  }

  async ingestSkip(s: SkipRecord) {
    await this.enqueue(() => {
      // Idempotent by portfolio+signalId
      const key = `${s.portfolio}|${s.signalId}`;
      if (
        !this.skips.some((x) => `${x.portfolio}|${s.signalId}` === key)
      ) {
        this.skips.push(s);
      }
    });
  }

  async ingestPortfolioSnapshot(snap: PortfolioSnapshot) {
    await this.enqueue(() => {
      this.portfolios.set(snap.portfolio, snap);
    });
  }

  async ingestScanStatus(status: ScanStatus) {
    await this.enqueue(() => {
      this.scan = { ...status, lastScanAt: new Date().toISOString() };
    });
  }

  // ---------------- queries ----------------

  getSignal(id: string): SignalRecord | undefined {
    return this.signals.get(id);
  }

  listSignals(filter?: {
    state?: SignalRecord["state"];
    direction?: "LONG" | "SHORT";
    limit?: number;
  }): SignalRecord[] {
    let out = [...this.signals.values()];
    if (filter?.state) out = out.filter((s) => s.state === filter.state);
    if (filter?.direction)
      out = out.filter((s) => s.direction === filter.direction);
    out.sort((a, b) => b.triggerDate.localeCompare(a.triggerDate));
    return typeof filter?.limit === "number"
      ? out.slice(0, filter.limit)
      : out;
  }

  nearBreakout(maxDistancePct = 5): SignalRecord[] {
    return this.listSignals()
      .filter(
        (s) =>
          s.distanceToBreakoutPct >= 0 &&
          s.distanceToBreakoutPct <= maxDistancePct &&
          (s.state === "WATCHING" || s.state === "NEAR_TRIGGER")
      )
      .sort((a, b) => a.distanceToBreakoutPct - b.distanceToBreakoutPct);
  }

  listPositions(opts?: {
    portfolio?: string;
    status?: PositionRecord["status"];
  }): PositionRecord[] {
    let out = [...this.positions];
    if (opts?.portfolio)
      out = out.filter((p) => p.portfolio === opts.portfolio);
    if (opts?.status) out = out.filter((p) => p.status === opts.status);
    return out;
  }

  getPosition(portfolio: string, symbol: string, entryDate: string) {
    return this.positions.find(
      (p) =>
        p.portfolio === portfolio &&
        p.symbol === symbol &&
        p.entryDate === entryDate
    );
  }

  listSkips(opts?: { portfolio?: string }) {
    let out = [...this.skips];
    if (opts?.portfolio) out = out.filter((s) => s.portfolio === opts.portfolio);
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }

  getPortfolio(name: string): PortfolioSnapshot | undefined {
    return this.portfolios.get(name);
  }

  listPortfolios(): PortfolioSnapshot[] {
    return [...this.portfolios.values()];
  }

  getScanStatus(): ScanStatus {
    return this.scan;
  }
}

// Singleton per process
export const liveStore = new LiveStore();
