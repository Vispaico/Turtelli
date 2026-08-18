// ============================================================
// Turtelli 2.0 — Core Trading Types
// ============================================================

export type TradeDirection = "LONG" | "SHORT";

export type SignalStatus =
  | "DISCOVERED"
  | "WATCHING"
  | "ARMED"
  | "TRIGGERED"
  | "OPEN"
  | "PYRAMID_1"
  | "PYRAMID_2"
  | "PYRAMID_3"
  | "EXIT_PENDING"
  | "CLOSED"
  | "CANCELLED"
  | "INVALIDATED";

export type PositionStatus =
  | "OPEN"
  | "PARTIALLY_CLOSED"
  | "CLOSED"
  | "STOPPED_OUT"
  | "EXITED"
  | "LIQUIDATED";

export interface SignalData {
  instrument: string;
  direction: TradeDirection;
  strategy: string;
  strategyVersion: number;
  configHash: string;
  breakoutLevel: number;
  exitLevel: number;
  atr: number;
  nValue: number;
  initialStop: number;
  stopDistance: number;
  discoveredAt: Date;
}

export interface PositionData {
  id: string;
  signalId: string;
  portfolio: string;
  direction: TradeDirection;
  quantity: number;
  averageEntry: number;
  totalCost: number;
  initialStop: number;
  currentStop: number;
  exitChannel: number;
  pyramidCount: number;
}

export interface TradeResult {
  instrument: string;
  direction: TradeDirection;
  system: string;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  returnAbsolute: number | null;
  returnPercent: number | null;
  holdingDays: number | null;
  entryDate: Date;
  exitDate: Date | null;
  pyramided: boolean;
  pyramidLevels: number;
}

export interface PortfolioState {
  name: string;
  equity: number;
  cash: number;
  marketValue: number;
  openPositions: PositionData[];
  totalReturn: number;
  maxDrawdown: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

export interface SkipReason {
  reason:
    | "insufficient_capital"
    | "risk_limit"
    | "correlation_exposure"
    | "max_positions"
    | "minimum_quantity"
    | "instrument_unavailable"
    | "existing_position"
    | "data_validation_failed";
  details?: string;
}

// --- Event Types ---

export type SignalEventType =
  | "SIGNAL_CREATED"
  | "SIGNAL_UPDATED"
  | "SIGNAL_ARMED"
  | "BREAKOUT_TRIGGERED"
  | "POSITION_OPENED"
  | "UNIT_ADDED"
  | "STOP_UPDATED"
  | "EXIT_LEVEL_UPDATED"
  | "EXIT_TRIGGERED"
  | "POSITION_CLOSED"
  | "SIGNAL_INVALIDATED"
  | "SIGNAL_CANCELLED"
  | "PRICE_VALIDATION_FAILED"
  | "MARKET_DATA_CORRECTED"
  | "SYSTEM_ERROR"
  | "PYRAMID_LEVEL_REACHED";

export interface SignalEvent {
  id: string;
  signalId: string;
  eventType: SignalEventType;
  timestamp: Date;
  fromStatus: SignalStatus | null;
  toStatus: SignalStatus | null;
  price: number | null;
  volume: number | null;
  atr: number | null;
  stopLevel: number | null;
  exitLevel: number | null;
  reason: string;
  data: Record<string, unknown> | null;
  softwareVersion: string | null;
  strategyVersion: number | null;
}
