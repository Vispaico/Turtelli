export type InstrumentCategory = 'index' | 'stock';

export interface InstrumentMeta {
  symbol: string;
  displayName: string;
  type: InstrumentCategory;
  finnhubSymbol: string;
  twelveDataSymbol: string;
  igSpread?: number; // points for indices
}

export interface IndicatorSnapshot {
  rsi14: number | null;
  sma20: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  updatedAt?: string;
}

export interface OHLC {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketData {
  symbol: string;
  ohlc: OHLC[];
  currentPrice: number;
  indicators?: IndicatorSnapshot;
  lastUpdated: string;
  meta?: InstrumentMeta;
}

export type TradeStatus = 'OPEN' | 'CLOSED';

export interface TrackedTrade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  entryTime: string;
  stopLoss: number;
  targetPrice: number;
  status: TradeStatus;
  exitPrice?: number;
  exitTime?: string;
  exitReason?: 'STOP' | 'TARGET' | 'MANUAL';
  pnl?: number;
  pnlPercent?: number;
  lastPrice?: number;
}

export type Action = 'BUY' | 'SELL' | 'HOLD';

export interface Signal {
  symbol: string;
  action: Action;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  timestamp: string;
  reason: string;
  indicators?: IndicatorSnapshot;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  cost: number;
  side: 'LONG' | 'SHORT';
  action: Action;
  igCost: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

export interface Portfolio {
  id: string;
  name: string;
  initialCapital: number;
  currentBalance: number;
  positions: PortfolioPosition[];
  totalPnl: number;
  totalPnlPercent: number;
  tradeCount: number;
  totalIgCost: number;
  history: PortfolioHistoryPoint[];
}

export const MARKET_UNIVERSE: Record<string, InstrumentMeta> = {
  SX5E: {
    symbol: 'SX5E',
    displayName: 'Euro Stoxx 50',
    type: 'index',
    finnhubSymbol: '^STOXX50E',
    // TwelveData free tier often doesn't support direct index symbols; use a liquid proxy ETF.
    twelveDataSymbol: 'FEZ',
    igSpread: 1.2,
  },
  GDAXI: {
    symbol: 'GDAXI',
    displayName: 'DAX',
    type: 'index',
    finnhubSymbol: '^GDAXI',
    twelveDataSymbol: 'EWG',
    igSpread: 1.3,
  },
  MDAX: {
    symbol: 'MDAX',
    displayName: 'MDAX',
    type: 'index',
    finnhubSymbol: '^MDAXI',
    twelveDataSymbol: 'EWG',
    igSpread: 1.6,
  },
  FCHI: {
    symbol: 'FCHI',
    displayName: 'CAC 40',
    type: 'index',
    finnhubSymbol: '^FCHI',
    twelveDataSymbol: 'EWQ',
    igSpread: 1.4,
  },
  IBEX: {
    symbol: 'IBEX',
    displayName: 'IBEX 35',
    type: 'index',
    finnhubSymbol: '^IBEX',
    twelveDataSymbol: 'EWP',
    igSpread: 1.8,
  },
  FTSE: {
    symbol: 'FTSE',
    displayName: 'FTSE 100',
    type: 'index',
    finnhubSymbol: '^FTSE',
    twelveDataSymbol: 'EWU',
    igSpread: 1.0,
  },
  N225: {
    symbol: 'N225',
    displayName: 'Nikkei 225',
    type: 'index',
    finnhubSymbol: '^N225',
    twelveDataSymbol: 'EWJ',
    igSpread: 2.0,
  },
  HSI: {
    symbol: 'HSI',
    displayName: 'Hang Seng',
    type: 'index',
    finnhubSymbol: '^HSI',
    twelveDataSymbol: 'EWH',
    igSpread: 2.1,
  },
  FXI: {
    symbol: 'FXI',
    displayName: 'FTSE China 50',
    type: 'index',
    finnhubSymbol: 'FXI',
    twelveDataSymbol: 'FXI',
    igSpread: 0.9,
  },
  YM: {
    symbol: 'YM',
    displayName: 'Dow Futures',
    type: 'index',
    finnhubSymbol: 'YM1!',
    twelveDataSymbol: 'DIA',
    igSpread: 2.4,
  },
  SPX: {
    symbol: 'SPX',
    displayName: 'S&P 500',
    type: 'index',
    finnhubSymbol: '^GSPC',
    twelveDataSymbol: 'SPY',
    igSpread: 0.9,
  },
  DJI: {
    symbol: 'DJI',
    displayName: 'Dow Jones',
    type: 'index',
    finnhubSymbol: '^DJI',
    twelveDataSymbol: 'DIA',
    igSpread: 1.5,
  },
  SPY: {
    symbol: 'SPY',
    displayName: 'S&P 500 ETF',
    type: 'index',
    finnhubSymbol: 'SPY',
    twelveDataSymbol: 'SPY',
    igSpread: 0.8,
  },
  QQQ: {
    symbol: 'QQQ',
    displayName: 'Nasdaq 100 ETF',
    type: 'index',
    finnhubSymbol: 'QQQ',
    twelveDataSymbol: 'QQQ',
    igSpread: 0.8,
  },
  NVDA: {
    symbol: 'NVDA',
    displayName: 'NVIDIA',
    type: 'stock',
    finnhubSymbol: 'NVDA',
    twelveDataSymbol: 'NVDA',
  },
  TSLA: {
    symbol: 'TSLA',
    displayName: 'Tesla',
    type: 'stock',
    finnhubSymbol: 'TSLA',
    twelveDataSymbol: 'TSLA',
  },
  AAPL: {
    symbol: 'AAPL',
    displayName: 'Apple',
    type: 'stock',
    finnhubSymbol: 'AAPL',
    twelveDataSymbol: 'AAPL',
  },
  GOOGL: {
    symbol: 'GOOGL',
    displayName: 'Alphabet',
    type: 'stock',
    finnhubSymbol: 'GOOGL',
    twelveDataSymbol: 'GOOGL',
  },
  AVGO: {
    symbol: 'AVGO',
    displayName: 'Broadcom',
    type: 'stock',
    finnhubSymbol: 'AVGO',
    twelveDataSymbol: 'AVGO',
  },
  MSFT: {
    symbol: 'MSFT',
    displayName: 'Microsoft',
    type: 'stock',
    finnhubSymbol: 'MSFT',
    twelveDataSymbol: 'MSFT',
  },
  META: {
    symbol: 'META',
    displayName: 'Meta',
    type: 'stock',
    finnhubSymbol: 'META',
    twelveDataSymbol: 'META',
  },
};

export const INDICES = Object.values(MARKET_UNIVERSE)
  .filter((instrument) => instrument.type === 'index')
  .map((instrument) => instrument.symbol);

export const STOCKS = Object.values(MARKET_UNIVERSE)
  .filter((instrument) => instrument.type === 'stock')
  .map((instrument) => instrument.symbol);

export const ALL_SYMBOLS = Object.keys(MARKET_UNIVERSE);
