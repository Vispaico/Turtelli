// ============================================================
// Turtelli Web — API client
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface SignalRecord {
  signalId: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  systemName: string;
  triggerDate: string;
  triggerPrice: number;
  breakoutLevel: number;
  atr: number;
  state: string;
  distanceToBreakoutPct: number;
}

export interface PortfolioSnapshot {
  portfolio: string;
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
  states: Record<string, number>;
  healthy?: boolean;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  portfolios: () =>
    get<{ portfolios: PortfolioSnapshot[] }>("/api/portfolios").then(
      (r) => r.portfolios
    ),

  portfolioDetail: (name: string) => get<any>(`/api/portfolios/${name}`),

  nearBreakout: (maxDistancePct = 6, limit = 25) =>
    get<{ instruments: SignalRecord[]; total: number }>(
      `/api/signals/near-breakout?maxDistancePct=${maxDistancePct}&limit=${limit}`
    ).then((r) => r.instruments),

  activeSignals: () =>
    get<{ signals: SignalRecord[]; counts: Record<string, number> }>(
      "/api/signals/active"
    ),

  trades: (portfolio?: string) =>
    get<{ trades: any[]; summary: any }>(
      `/api/trades${portfolio ? `?portfolio=${portfolio}` : ""}`
    ),

  scanStatus: () => get<ScanStatus>("/api/instruments/scan-status"),
};
