// ============================================================
// Turtelli 2.0 — Market Data Provider Interface
// ============================================================
// This is the abstraction layer for market data.
// The rest of Turtelli MUST NOT know which provider is underneath.
// ============================================================

export interface MarketDataProvider {
  readonly name: string;
  readonly supportedFeatures: ProviderFeatures;

  // Core data
  getDailyBars(
    symbol: string,
    options?: DailyBarOptions
  ): Promise<DailyBar[]>;

  getIntradayBars(
    symbol: string,
    options: IntradayBarOptions
  ): Promise<IntradayBar[]>;

  getCurrentPrice(symbol: string): Promise<PriceQuote>;

  // Reference data
  getCorporateActions(
    symbol: string,
    options?: CorporateActionOptions
  ): Promise<CorporateAction[]>;

  getInstrumentMetadata(symbol: string): Promise<InstrumentMetadata>;

  // Market status
  getMarketCalendar(year: number): Promise<MarketHoliday[]>;
  getTradingStatus(symbol: string): Promise<TradingStatus>;
}

// --- Options ---

export interface DailyBarOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  adjusted?: boolean; // split/dividend adjusted
}

export interface IntradayBarOptions {
  interval: "1m" | "5m" | "15m" | "1h" | "1d";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface CorporateActionOptions {
  startDate?: Date;
  endDate?: Date;
  types?: CorporateActionType[];
}

// --- Data Types ---

export interface DailyBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
  source: string;
}

export interface IntradayBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: string;
  source: string;
}

export interface PriceQuote {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  spread?: number;
  volume?: number;
  timestamp: Date;
  source: string;
}

export interface InstrumentMetadata {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  country: string;
  currency: string;
  sector?: string;
  industry?: string;
  fractional: boolean;
  pricePrecision: number;
  minQuantity: number;
  source: string;
}

export interface CorporateAction {
  type: CorporateActionType;
  date: Date;
  exDate?: Date;
  fromSymbol?: string;
  toSymbol?: string;
  ratio?: number;
  dividendPerShare?: number;
  description?: string;
  source: string;
}

export type CorporateActionType =
  | "SPLIT"
  | "REVERSE_SPLIT"
  | "DIVIDEND"
  | "SYMBOL_CHANGE"
  | "DELISTING"
  | "MERGER"
  | "SPIN_OFF";

export interface MarketHoliday {
  date: Date;
  name: string;
  earlyClose?: Date; // early close time if applicable
}

export type TradingStatus =
  | "OPEN"
  | "CLOSED"
  | "PRE_MARKET"
  | "AFTER_HOURS"
  | "HALTED"
  | "UNKNOWN";

export interface ProviderFeatures {
  realTimeQuotes: boolean;
  historicalBars: boolean;
  intradayBars: boolean;
  corporateActions: boolean;
  marketCalendar: boolean;
  maxHistoryDays: number;
  rateLimitRPM: number;
}

// --- Monitoring State ---

export type MonitoringState =
  | "NORMAL"
  | "WATCHING"
  | "NEAR_TRIGGER"
  | "ACTIVE_POSITION"
  | "NEAR_EXIT";

// --- Error Types ---

export class MarketDataError extends Error {
  constructor(
    message: string,
    public provider: string,
    public symbol: string,
    public code: string
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

export class RateLimitError extends MarketDataError {
  constructor(provider: string, public retryAfterMs: number) {
    super(`Rate limited by ${provider}`, provider, "", "RATE_LIMIT");
  }
}

export class DataValidationError extends MarketDataError {
  constructor(
    symbol: string,
    public validationType: string,
    public details: Record<string, unknown>
  ) {
    super(
      `Data validation failed for ${symbol}: ${validationType}`,
      "validation",
      symbol,
      "VALIDATION_FAILED"
    );
  }
}
