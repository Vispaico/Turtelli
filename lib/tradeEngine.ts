import { fetchAllMarketData, getCachedMarketData, refreshLiveQuotes } from './api';
import { generateSignal } from './turtle';
import { ALL_SYMBOLS, MarketData, Signal, TrackedTrade, MARKET_UNIVERSE } from './types';

type Snapshot = {
    timestamp: string;
    markets: MarketData[];
    signals: Signal[];
    skipped: string[];
    openTrades: TrackedTrade[];
    closedTrades: TrackedTrade[];
};

type EngineState = {
    watchlist: Set<string>;
    openTrades: Map<string, TrackedTrade>;
    closedTrades: TrackedTrade[];
    snapshot: Snapshot | null;
    lastDaily: number;
    lastFast: number;
    initialized: boolean;
    refreshing: Promise<void> | null;
    fastTimer?: NodeJS.Timeout;
    dailyTimer?: NodeJS.Timeout;
};

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const FAST_POLL_MS = parseEnvNumber(process.env.MARKET_ACTIVE_POLL_MS, 10_000);
const DAILY_SCAN_MS = parseEnvNumber(process.env.MARKET_DAILY_SCAN_MS, 24 * 60 * 60 * 1000);
const WATCHLIST_LIMIT = parseEnvNumber(process.env.MARKET_WATCHLIST_LIMIT, 20);

declare global {
    var __turtelliTradeEngine: EngineState | undefined;
}

function parseWatchlist(): Set<string> {
    const raw = (process.env.MARKET_WATCHLIST ?? '')
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);

    const allowed = raw.length ? raw.filter((symbol) => ALL_SYMBOLS.includes(symbol)) : ALL_SYMBOLS;
    const limited = Array.from(new Set(allowed)).slice(0, WATCHLIST_LIMIT);
    return new Set(limited);
}

function getEngineState(): EngineState {
    if (!globalThis.__turtelliTradeEngine) {
        globalThis.__turtelliTradeEngine = {
            watchlist: parseWatchlist(),
            openTrades: new Map(),
            closedTrades: [],
            snapshot: null,
            lastDaily: 0,
            lastFast: 0,
            initialized: false,
            refreshing: null,
        };
    }
    return globalThis.__turtelliTradeEngine;
}

async function withLock(task: () => Promise<void>): Promise<void> {
    const state = getEngineState();
    if (state.refreshing) {
        await state.refreshing;
    }

    const runPromise = Promise.resolve().then(task);
    state.refreshing = runPromise.finally(() => {
        if (state.refreshing === runPromise) {
            state.refreshing = null;
        }
    });

    await runPromise;
}

function buildSnapshot(markets: MarketData[], signals: Signal[], skipped: string[]): Snapshot {
    const state = getEngineState();
    const snapshot: Snapshot = {
        timestamp: new Date().toISOString(),
        markets,
        signals,
        skipped,
        openTrades: Array.from(state.openTrades.values()),
        closedTrades: state.closedTrades.slice(0, 50),
    };
    state.snapshot = snapshot;
    return snapshot;
}

function syncTradesFromSignals(signals: Signal[], marketMap: Record<string, MarketData>) {
    const state = getEngineState();
    const now = new Date().toISOString();

    signals.forEach((signal) => {
        if (signal.action === 'HOLD') return;
        if (!signal.stopLoss || !signal.entryPrice) return;

        const existing = state.openTrades.get(signal.symbol);
        if (existing) {
            existing.stopLoss = signal.stopLoss ?? existing.stopLoss;
            existing.targetPrice = signal.targetPrice ?? existing.targetPrice;
            existing.lastPrice = marketMap[signal.symbol]?.currentPrice ?? existing.lastPrice;
            return;
        }

        const market = marketMap[signal.symbol];
        const entryPrice = signal.entryPrice || market?.currentPrice;
        if (!entryPrice || !Number.isFinite(entryPrice) || !Number.isFinite(signal.stopLoss)) return;

        const side = signal.action === 'SELL' ? 'SHORT' : 'LONG';
        const trade: TrackedTrade = {
            id: `${signal.symbol}-${Date.now()}`,
            symbol: signal.symbol,
            side,
            entryPrice,
            entryTime: now,
            stopLoss: signal.stopLoss,
            targetPrice: signal.targetPrice,
            status: 'OPEN',
            lastPrice: market?.currentPrice ?? entryPrice,
        };

        state.openTrades.set(signal.symbol, trade);
    });
}

function evaluateExits(updatedMarkets: MarketData[]) {
    const state = getEngineState();
    updatedMarkets.forEach((market) => {
        const trade = state.openTrades.get(market.symbol);
        if (!trade) return;

        const price = market.currentPrice;
        trade.lastPrice = price;

        const hitStop = trade.side === 'LONG'
            ? price <= trade.stopLoss
            : price >= trade.stopLoss;

        const hitTarget = trade.targetPrice > 0 && (trade.side === 'LONG'
            ? price >= trade.targetPrice
            : price <= trade.targetPrice);

        if (!hitStop && !hitTarget) {
            return;
        }

        const perUnitPnl = trade.side === 'LONG'
            ? (price - trade.entryPrice)
            : (trade.entryPrice - price);
        const pnlPercent = (perUnitPnl / trade.entryPrice) * 100;

        const closed: TrackedTrade = {
            ...trade,
            status: 'CLOSED',
            exitPrice: price,
            exitTime: new Date().toISOString(),
            exitReason: hitStop ? 'STOP' : 'TARGET',
            pnl: perUnitPnl,
            pnlPercent,
            lastPrice: price,
        };

        state.openTrades.delete(market.symbol);
        state.closedTrades.unshift(closed);
        state.closedTrades = state.closedTrades.slice(0, 100);
    });
}

async function refreshDaily(force = false) {
    const state = getEngineState();
    const symbols = Array.from(state.watchlist);

    const promise = async () => {
        const markets = await fetchAllMarketData(symbols, { force });
        const signals = markets.map(generateSignal);
        const marketMap = markets.reduce((acc, item) => {
            acc[item.symbol] = item;
            return acc;
        }, {} as Record<string, MarketData>);

        syncTradesFromSignals(signals, marketMap);

        const fulfilled = new Set(markets.map((item) => item.symbol));
        const skipped = symbols.filter((symbol) => !fulfilled.has(symbol));

        buildSnapshot(markets, signals, skipped);
        state.lastDaily = Date.now();
    };

    await withLock(promise);
}

async function refreshActiveTrades() {
    const state = getEngineState();
    const openSymbols = Array.from(state.openTrades.keys());
    if (openSymbols.length === 0) {
        return;
    }

    const quotes = await refreshLiveQuotes(openSymbols);

    const updatedMarkets = openSymbols
        .map((symbol) => {
            const cached = getCachedMarketData(symbol);
            const trade = state.openTrades.get(symbol);
            const price = quotes[symbol] ?? cached?.currentPrice ?? trade?.lastPrice;
            if (!price || !Number.isFinite(price)) return cached;

            if (cached) {
                return {
                    ...cached,
                    currentPrice: price,
                    lastUpdated: new Date().toISOString(),
                };
            }

            return {
                symbol,
                ohlc: [],
                currentPrice: price,
                indicators: undefined,
                lastUpdated: new Date().toISOString(),
                meta: MARKET_UNIVERSE[symbol],
            } as MarketData;
        })
        .filter((item): item is MarketData => Boolean(item));

    // Update trade lastPrice with freshest quote
    openSymbols.forEach((symbol) => {
        const trade = state.openTrades.get(symbol);
        const price = quotes[symbol];
        if (trade && Number.isFinite(price)) {
            trade.lastPrice = price as number;
        }
    });

    if (updatedMarkets.length) {
        evaluateExits(updatedMarkets);
    }

    const stateSnapshot = state.snapshot;
    if (stateSnapshot) {
        const merged = new Map(stateSnapshot.markets.map((item) => [item.symbol, item]));
        updatedMarkets.forEach((market) => merged.set(market.symbol, market));
        state.snapshot = {
            ...stateSnapshot,
            timestamp: new Date().toISOString(),
            markets: Array.from(merged.values()),
            openTrades: Array.from(state.openTrades.values()),
            closedTrades: state.closedTrades.slice(0, 50),
        };
    }

    state.lastFast = Date.now();
}

function startTimers() {
    const state = getEngineState();
    if (!state.fastTimer) {
        state.fastTimer = setInterval(() => {
            void withLock(refreshActiveTrades).catch((error) => {
                console.error('[tradeEngine] fast refresh failed', error);
            });
        }, FAST_POLL_MS);
    }

    if (!state.dailyTimer) {
        state.dailyTimer = setInterval(() => {
            void refreshDaily(false).catch((error) => {
                console.error('[tradeEngine] daily refresh failed', error);
            });
        }, DAILY_SCAN_MS);
    }
}

async function ensureInitialized() {
    const state = getEngineState();
    if (state.initialized) return;

    state.initialized = true;
    await refreshDaily(true).catch((error) => {
        console.error('[tradeEngine] initial daily refresh failed', error);
    });
    startTimers();
}

export async function getSignalSnapshot(options: { force?: boolean } = {}): Promise<Snapshot> {
    await ensureInitialized();
    const state = getEngineState();

    if (!state.snapshot) {
        await refreshDaily(true);
    }

    const now = Date.now();
    if (options.force) {
        await refreshDaily(true);
    } else if (now - state.lastDaily > DAILY_SCAN_MS) {
        await refreshDaily(false);
    }

    if (state.openTrades.size > 0) {
        await withLock(refreshActiveTrades);
    }

    return state.snapshot ?? {
        timestamp: new Date().toISOString(),
        markets: [],
        signals: [],
        skipped: [],
        openTrades: [],
        closedTrades: [],
    };
}
