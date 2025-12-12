import { IndicatorSnapshot, MarketData, OHLC, MARKET_UNIVERSE } from './types';

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || process.env.TWELVEDATA_API_KEY || '';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

const TWELVE_DATA_BASE = 'https://api.twelvedata.com';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

const HISTORY_DAYS = 90;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const BATCH_SIZE = 3; // 2-3 tickers per batch as requested
const BATCH_DELAY_MS = 5000; // 5 second spacing between batches
const INDICATOR_DELAY_MS = 5000;
const INDICATOR_CHUNK_SIZE = 6;

type MarketCacheEntry = {
    data: MarketData;
    timestamp: number;
};

type MarketCacheState = {
    entries: Map<string, MarketCacheEntry>;
    refreshing: Promise<void> | null;
    lastRefresh: number;
};

type IndicatorPayload = {
    status?: string;
    values?: Array<Record<string, string | number>>;
};

type IndicatorResponse = Record<string, IndicatorPayload>;

declare global {
    var __turtelliMarketCache: MarketCacheState | undefined;
}

function getCacheState(): MarketCacheState {
    if (!globalThis.__turtelliMarketCache) {
        globalThis.__turtelliMarketCache = {
            entries: new Map(),
            refreshing: null,
            lastRefresh: 0,
        };
    }
    return globalThis.__turtelliMarketCache;
}

const cacheState = getCacheState();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chunk = <T,>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
};

const emptyIndicators = (): IndicatorSnapshot => ({
    rsi14: null,
    sma20: null,
    macd: null,
    macdSignal: null,
    macdHistogram: null,
});

const createMockData = (symbol: string): MarketData => {
    const ohlc: OHLC[] = [];
    let price = 100 + Math.random() * 50;
    const now = new Date();

    for (let i = HISTORY_DAYS; i >= 0; i -= 1) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const baseVol = price * 0.015;
        const change = (Math.random() - 0.5) * baseVol;
        ohlc.push({
            time: date.toISOString().split('T')[0],
            open: price,
            high: price + Math.abs(change),
            low: price - Math.abs(change),
            close: price + change,
        });
        price += change;
    }

    return {
        symbol,
        ohlc,
        currentPrice: price,
        indicators: emptyIndicators(),
        lastUpdated: new Date().toISOString(),
        meta: MARKET_UNIVERSE[symbol],
    };
};

export async function fetchMarketData(symbol: string, options: { force?: boolean } = {}): Promise<MarketData | null> {
    const now = Date.now();
    const cached = cacheState.entries.get(symbol);
    const isFresh = cached && now - cached.timestamp < CACHE_DURATION;

    if (!isFresh || options.force) {
        await ensureRefreshed([symbol], Boolean(options.force));
    }

    return cacheState.entries.get(symbol)?.data ?? null;
}

export async function fetchAllMarketData(symbols: string[]): Promise<MarketData[]> {
    const uniqueSymbols = symbols.filter((symbol) => MARKET_UNIVERSE[symbol]);
    const now = Date.now();
    const staleSymbols = uniqueSymbols.filter((symbol) => {
        const cached = cacheState.entries.get(symbol);
        return !cached || now - cached.timestamp >= CACHE_DURATION;
    });

    if (staleSymbols.length > 0) {
        await ensureRefreshed(staleSymbols);
    }

    const results = uniqueSymbols
        .map((symbol) => cacheState.entries.get(symbol)?.data ?? createMockData(symbol))
        .filter((data): data is MarketData => Boolean(data));

    return results;
}

async function ensureRefreshed(symbols: string[], force = false) {
    const uniqueSymbols = Array.from(new Set(symbols)).filter((symbol) => MARKET_UNIVERSE[symbol]);
    if (uniqueSymbols.length === 0) return;

    if (cacheState.refreshing && !force) {
        await cacheState.refreshing;
        const now = Date.now();
        const stillStale = uniqueSymbols.some((symbol) => {
            const cached = cacheState.entries.get(symbol);
            return !cached || now - cached.timestamp >= CACHE_DURATION;
        });
        if (!stillStale) {
            return;
        }
    }

    const refreshPromise = refreshUniverse(uniqueSymbols);
    cacheState.refreshing = refreshPromise.finally(() => {
        if (cacheState.refreshing === refreshPromise) {
            cacheState.refreshing = null;
        }
    });

    await cacheState.refreshing;
}

async function refreshUniverse(symbols: string[]) {
    const uniqueSymbols = Array.from(new Set(symbols)).filter((symbol) => MARKET_UNIVERSE[symbol]);
    if (uniqueSymbols.length === 0) return;

    const indicatorMap = await fetchIndicatorBundle(uniqueSymbols);
    const batches = chunk(uniqueSymbols, BATCH_SIZE);

    for (let i = 0; i < batches.length; i += 1) {
        const batch = batches[i];
        const metaList = batch.map((symbol) => MARKET_UNIVERSE[symbol]);

        const ohlcResults = await Promise.all(metaList.map((meta) => fetchFinnhubOHLC(meta)));

        ohlcResults.forEach((result, idx) => {
            const meta = metaList[idx];
            if (!result || result.length === 0) {
                console.warn(`[market] Missing OHLC data for ${meta.symbol}, using fallback`);
                const mock = createMockData(meta.symbol);
                cacheState.entries.set(meta.symbol, { data: mock, timestamp: Date.now() });
                return;
            }

            const currentPrice = result[result.length - 1]?.close ?? result[result.length - 1]?.close ?? 0;
            const indicators = indicatorMap[meta.symbol] ?? emptyIndicators();

            const marketData: MarketData = {
                symbol: meta.symbol,
                ohlc: result,
                currentPrice,
                indicators,
                lastUpdated: new Date().toISOString(),
                meta,
            };

            cacheState.entries.set(meta.symbol, { data: marketData, timestamp: Date.now() });
        });

        if (i < batches.length - 1) {
            await delay(BATCH_DELAY_MS);
        }
    }

    cacheState.lastRefresh = Date.now();
}

type InstrumentMeta = (typeof MARKET_UNIVERSE)[keyof typeof MARKET_UNIVERSE];

async function fetchFinnhubOHLC(meta: InstrumentMeta): Promise<OHLC[] | null> {
    if (!FINNHUB_API_KEY) {
        console.warn('[market] Missing FINNHUB_API_KEY – using mock OHLC data');
        return createMockData(meta.symbol).ohlc;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const fromSeconds = Math.floor((Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000) / 1000);

    const url = new URL(`${FINNHUB_BASE}/stock/candle`);
    url.searchParams.set('symbol', meta.finnhubSymbol);
    url.searchParams.set('resolution', 'D');
    url.searchParams.set('from', String(fromSeconds));
    url.searchParams.set('to', String(nowSeconds));
    url.searchParams.set('token', FINNHUB_API_KEY);

    try {
        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.s !== 'ok' || !Array.isArray(data.t)) {
            console.warn(`[market] Finnhub returned no data for ${meta.symbol}:`, data.s);
            return null;
        }

        const candles: OHLC[] = data.t.map((timestamp: number, idx: number) => ({
            time: new Date(timestamp * 1000).toISOString().split('T')[0],
            open: Number(data.o[idx]),
            high: Number(data.h[idx]),
            low: Number(data.l[idx]),
            close: Number(data.c[idx]),
        }));

        return candles.slice(-HISTORY_DAYS);
    } catch (error) {
        console.error(`[market] Finnhub request failed for ${meta.symbol}`, error);
        return null;
    }
}

type IndicatorType = 'rsi' | 'macd' | 'sma';

async function fetchIndicatorBundle(symbols: string[]): Promise<Record<string, IndicatorSnapshot>> {
    const results: Record<string, IndicatorSnapshot> = {};

    if (!TWELVE_DATA_API_KEY) {
        symbols.forEach((symbol) => {
            results[symbol] = emptyIndicators();
        });
        return results;
    }

    if (symbols.length === 0) {
        return results;
    }

    const populateSnapshot = async (symbolGroup: string[]) => {
        const twelveSymbols = symbolGroup.map((symbol) => MARKET_UNIVERSE[symbol].twelveDataSymbol);

        const rsiRaw = await fetchIndicatorSeries('rsi', twelveSymbols);
        await delay(INDICATOR_DELAY_MS);
        const macdRaw = await fetchIndicatorSeries('macd', twelveSymbols);
        await delay(INDICATOR_DELAY_MS);
        const smaRaw = await fetchIndicatorSeries('sma', twelveSymbols);

        symbolGroup.forEach((symbol) => {
            const twelveSymbol = MARKET_UNIVERSE[symbol].twelveDataSymbol;
            const rsi = extractSingleValue(rsiRaw, twelveSymbol, 'rsi');
            const macd = extractMacdValues(macdRaw, twelveSymbol);
            const sma = extractSingleValue(smaRaw, twelveSymbol, 'sma');

            results[symbol] = {
                rsi14: rsi,
                sma20: sma,
                macd: macd.macd,
                macdSignal: macd.signal,
                macdHistogram: macd.histogram,
                updatedAt: new Date().toISOString(),
            };
        });
    };

    try {
        await populateSnapshot(symbols);
    } catch (error) {
        console.warn('[market] Batch indicator request failed, retrying with smaller chunks', error);
        const fallbackChunks = chunk(symbols, INDICATOR_CHUNK_SIZE);
        for (let i = 0; i < fallbackChunks.length; i += 1) {
            const group = fallbackChunks[i];
            try {
                await populateSnapshot(group);
            } catch (chunkError) {
                console.error('[market] Indicator chunk failed', chunkError);
                group.forEach((symbol) => {
                    results[symbol] = emptyIndicators();
                });
            }
            if (i < fallbackChunks.length - 1) {
                await delay(BATCH_DELAY_MS);
            }
        }
    }

    // Ensure every symbol has at least an empty snapshot
    symbols.forEach((symbol) => {
        if (!results[symbol]) {
            results[symbol] = emptyIndicators();
        }
    });

    return results;
}

async function fetchIndicatorSeries(type: IndicatorType, symbols: string[]): Promise<IndicatorResponse> {
    if (symbols.length === 0) {
        return {};
    }

    const url = new URL(`${TWELVE_DATA_BASE}/${type}`);
    url.searchParams.set('symbol', symbols.join(','));
    url.searchParams.set('interval', '1day');
    url.searchParams.set('outputsize', '1');
    url.searchParams.set('apikey', TWELVE_DATA_API_KEY);

    if (type === 'rsi') {
        url.searchParams.set('time_period', '14');
    }
    if (type === 'sma') {
        url.searchParams.set('time_period', '20');
    }
    if (type === 'macd') {
        url.searchParams.set('short_period', '12');
        url.searchParams.set('long_period', '26');
        url.searchParams.set('signal_period', '9');
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Indicator ${type} HTTP ${response.status}`);
    }
    const data = await response.json();

    if (data.code === 429 || data.status === 'error') {
        throw new Error(data.message || `Indicator ${type} error`);
    }

    // Single symbol responses are not wrapped
    if (symbols.length === 1 && !data[symbols[0]]) {
        return { [symbols[0]]: data } as IndicatorResponse;
    }

    return data as IndicatorResponse;
}

function extractSingleValue(source: IndicatorResponse, symbol: string, key: 'rsi' | 'sma'): number | null {
    const payload = source?.[symbol];
    if (!payload || payload.status === 'error') {
        return null;
    }

    const latest = Array.isArray(payload.values) ? payload.values[0] : undefined;
    if (!latest) {
        return null;
    }

    const valueKey = key === 'rsi'
        ? (latest.rsi ?? latest.RSI)
        : (latest.sma ?? latest.SMA ?? (latest.value as number | string | undefined));
    if (valueKey === undefined || valueKey === null) {
        return null;
    }

    const parsed = Number(valueKey);
    return Number.isFinite(parsed) ? parsed : null;
}

function extractMacdValues(source: IndicatorResponse, symbol: string) {
    const payload = source?.[symbol];
    if (!payload || payload.status === 'error') {
        return { macd: null, signal: null, histogram: null };
    }

    const latest = Array.isArray(payload.values) ? payload.values[0] : undefined;
    if (!latest) {
        return { macd: null, signal: null, histogram: null };
    }

    const macd = Number(latest.macd ?? latest.MACD);
    const signal = Number(latest.macd_signal ?? latest.MACD_Signal);
    const histogram = Number(latest.macd_histogram ?? latest.MACD_Hist);

    return {
        macd: Number.isFinite(macd) ? macd : null,
        signal: Number.isFinite(signal) ? signal : null,
        histogram: Number.isFinite(histogram) ? histogram : null,
    };
}
