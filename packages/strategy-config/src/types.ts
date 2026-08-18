// ============================================================
// Turtelli 2.0 — Strategy Configuration Types
// ============================================================

export interface TurtleConfig {
  strategies: StrategyDefinition[];
  monitoring: MonitoringConfig;
  nearBreakoutThresholds: NearBreakoutThresholds;
  portfolios: PortfolioConfig;
  validation: ValidationConfig;
}

export interface StrategyDefinition {
  name: string;
  displayName: string;
  version: number;
  entry: EntryConfig;
  atr: ATRConfig;
  risk: RiskConfig;
  exit: ExitConfig;
}

export interface EntryConfig {
  channelType: "donchian";
  entryDays: number;
  exitDays: number;
  previousWinnerFilter: boolean;
  previousWinnerWindow?: number;
}

export interface ATRConfig {
  period: number;
  smoothing: "wilder" | "sma" | "ema";
}

export interface RiskConfig {
  stopN: number;
  pyramidIntervalN: number;
  maxUnits: number;
  unitRiskPercent: number;
  maxPortfolioRiskPercent: number;
}

export interface ExitConfig {
  channelType: "donchian";
  channelDays: number;
}

export interface MonitoringConfig {
  NORMAL: { pollIntervalMinutes: number };
  WATCHING: { pollIntervalMinutes: number };
  NEAR_TRIGGER: { pollIntervalMinutes: number };
  ACTIVE_POSITION: { pollIntervalMinutes: number };
  NEAR_EXIT: { pollIntervalSeconds: number };
}

export interface NearBreakoutThresholds {
  WATCHING: number;
  NEAR_TRIGGER: number;
}

export interface PortfolioConfig {
  [key: string]: PortfolioSettings;
}

export interface PortfolioSettings {
  initialEquity: number;
  maxRiskPerTrade: number;
  maxCorrelatedPositions: number;
  maxTotalPositions: number;
  allowFractional: boolean;
  commission: number;
  slippage: number;
}

export interface ValidationConfig {
  maxDailyMovePercent: number;
  minVolume: number;
  maxSpreadPercent: number;
  requireConsecutiveBars: number;
}
