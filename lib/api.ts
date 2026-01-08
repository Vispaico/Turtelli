import { IndicatorSnapshot, MarketData, OHLC, MARKET_UNIVERSE } from './types';

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || process.env.TWELVEDATA_API_KEY || '';
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const HAS_FINNHUB = Boolean(FINNHUB_API_KEY);
const HAS_TWELVE_DATA = Boolean(TWELVE_DATA_API_KEY);
const HAS_MARKET_CANDLES = HAS_TWELVE_DATA || HAS_FINNHUB;
const INDICATORS_ENABLED = process.env.MARKET_ENABLE_INDICATORS === '1';

const TWELVE_DATA_BASE = 'https://api.twelvedata.com';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MINUTE_MS = 60 * 1000;
const HISTORY_DAYS = 90;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const BATCH_SIZE = 3; // 2-3 tickers per batch as requested
const BATCH_DELAY_MS = Number(process.env.MARKET_BATCH_DELAY_MS ?? '0');
const MAX_REFRESH_WAIT_MS = 4000;
const EMPTY_CACHE_WAIT_MS = parseEnvNumber(process.env.MARKET_EMPTY_CACHE_WAIT_MS, 9000);
const INDICATOR_TIMEOUT_BASE_MS = 4500;
const INDICATOR_CHUNK_SIZE = 6;

const FORCE_REFRESH_WAIT_MS = parseEnvNumber(process.env.MARKET_FORCE_REFRESH_WAIT_MS, 4000);
const FORCE_REFRESH_MIN_INTERVAL_MS = parseEnvNumber(process.env.MARKET_FORCE_REFRESH_MIN_INTERVAL_MS, 60_000);

const FINNHUB_MAX_REQUESTS_PER_MINUTE = parseEnvNumber(process.env.FINNHUB_MAX_REQUESTS_PER_MINUTE, 45);
const FINNHUB_MAX_CONCURRENT_REQUESTS = parseEnvNumber(process.env.FINNHUB_MAX_CONCURRENT_REQUESTS, 1);
const FINNHUB_MIN_DELAY_MS = parseEnvNumber(process.env.FINNHUB_MIN_DELAY_MS, 0);

const TWELVE_DATA_MAX_REQUESTS_PER_MINUTE = parseEnvNumber(process.env.TWELVE_DATA_MAX_REQUESTS_PER_MINUTE, 8);
const TWELVE_DATA_MAX_CONCURRENT_REQUESTS = parseEnvNumber(process.env.TWELVE_DATA_MAX_CONCURRENT_REQUESTS, 1);
const TWELVE_DATA_MIN_DELAY_MS = parseEnvNumber(
    process.env.TWELVE_DATA_MIN_DELAY_MS,
    0,
);


const INDICATOR_TIMEOUT_MS = Math.max(
    INDICATOR_TIMEOUT_BASE_MS,
    (TWELVE_DATA_MIN_DELAY_MS * 3) + 1000,
);

type MarketCacheEntry = {
    data: MarketData;
    timestamp: number;
};

type MarketCacheState = {
    entries: Map<string, MarketCacheEntry>;
    refreshing: Promise<void> | null;
    lastRefresh: number;
    indicatorCursor: number;
    candleCursor: number;
    unsupportedCandleSymbols: Set<string>;
};

type IndicatorPayload = {
    status?: string;
    values?: Array<Record<string, string | number>>;
};

type IndicatorResponse = Record<string, IndicatorPayload>;
type IndicatorType = 'rsi' | 'macd' | 'sma';
const INDICATOR_TYPES: IndicatorType[] = ['rsi', 'macd', 'sma'];

type TimeSeriesPayload = {
    status?: string;
    values?: Array<Record<string, string | number>>;
    message?: string;
    code?: number;
};

type TimeSeriesResponse = Record<string, TimeSeriesPayload>;

declare global {
    var __turtelliMarketCache: MarketCacheState | undefined;
}

function getCacheState(): MarketCacheState {
    if (!globalThis.__turtelliMarketCache) {
        globalThis.__turtelliMarketCache = {
            entries: new Map(),
            refreshing: null,
            lastRefresh: 0,
            indicatorCursor: 0,
            candleCursor: 0,
            unsupportedCandleSymbols: new Set(),
        };
    }

    // Backwards-compat if cache shape changes during dev.
    if (typeof globalThis.__turtelliMarketCache.candleCursor !== 'number') {
        globalThis.__turtelliMarketCache.candleCursor = 0;
    }
    if (!(globalThis.__turtelliMarketCache.unsupportedCandleSymbols instanceof Set)) {
        globalThis.__turtelliMarketCache.unsupportedCandleSymbols = new Set();
    }

    return globalThis.__turtelliMarketCache;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RateLimiterOptions = {
    maxRequestsPerInterval: number;
    intervalMs: number;
    maxConcurrent?: number;
    minDelayMs?: number;
};

type RateLimiter = {
    schedule<T>(task: () => Promise<T>): Promise<T>;
};

const createRateLimiter = (options: RateLimiterOptions): RateLimiter => {
    const intervalMs = Math.max(1000, options.intervalMs);
    const maxRequests = Math.max(1, options.maxRequestsPerInterval);
    const maxConcurrent = Math.max(1, Math.floor(options.maxConcurrent ?? 1));
    const minDelayMs = Math.max(0, options.minDelayMs ?? Math.ceil(intervalMs / maxRequests));

    const queue: Array<() => void> = [];
    let active = 0;
    let timestamps: number[] = [];
    let timer: NodeJS.Timeout | null = null;
    let lastStart = 0;

    const flushWindow = () => {
        const now = Date.now();
        timestamps = timestamps.filter((ts) => now - ts < intervalMs);
        return now;
    };

    const scheduleTimer = (waitMs: number) => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            processQueue();
        }, Math.max(50, waitMs));
    };

    const processQueue = () => {
        if (!queue.length) {
            return;
        }

        const now = flushWindow();

        if (active >= maxConcurrent) {
            return;
        }

        if (timestamps.length >= maxRequests) {
            const wait = intervalMs - (now - timestamps[0]);
            scheduleTimer(wait);
            return;
        }

        const sinceLast = now - lastStart;
        if (sinceLast < minDelayMs) {
            scheduleTimer(minDelayMs - sinceLast);
            return;
        }

        const task = queue.shift();
        if (!task) return;

        active += 1;
        timestamps.push(now);
        lastStart = now;
        task();
    };

    const release = () => {
        active = Math.max(0, active - 1);
        processQueue();
    };

    return {
        schedule<T>(task: () => Promise<T>): Promise<T> {
            return new Promise<T>((resolve, reject) => {
                const runTask = () => {
                    Promise.resolve()
                        .then(task)
                        .then(resolve, reject)
                        .finally(release);
                };
                queue.push(runTask);
                processQueue();
            });
        },
    };
};

const cacheState = getCacheState();

const finnhubLimiter = HAS_FINNHUB
    ? createRateLimiter({
        maxRequestsPerInterval: FINNHUB_MAX_REQUESTS_PER_MINUTE,
        intervalMs: MINUTE_MS,
        maxConcurrent: FINNHUB_MAX_CONCURRENT_REQUESTS,
        minDelayMs: FINNHUB_MIN_DELAY_MS,
    })
    : null;

const twelveDataLimiter = HAS_TWELVE_DATA
    ? createRateLimiter({
        maxRequestsPerInterval: TWELVE_DATA_MAX_REQUESTS_PER_MINUTE,
        intervalMs: MINUTE_MS,
        maxConcurrent: TWELVE_DATA_MAX_CONCURRENT_REQUESTS,
        minDelayMs: TWELVE_DATA_MIN_DELAY_MS,
    })
    : null;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    if (timeoutMs <= 0) {
        return promise;
    }
    let timer: NodeJS.Timeout | null = null;
    try {
        const result = await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
            }),
        ]);
        return result;
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
};

const waitWithTimeout = async (promise: Promise<void>, timeoutMs: number): Promise<'completed' | 'timeout'> => {
    let timer: NodeJS.Timeout | null = null;
    try {
        const result = await Promise.race([
            promise.then(() => 'completed' as const, () => 'completed' as const),
            new Promise<'timeout'>((resolve) => {
                timer = setTimeout(() => resolve('timeout'), timeoutMs);
            }),
        ]);
        return result;
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
};

const waitForFirstCacheEntry = async (timeoutMs: number): Promise<'completed' | 'timeout'> => {
    const deadline = Date.now() + Math.max(0, timeoutMs);
    while (Date.now() < deadline) {
        if (cacheState.entries.size > 0) {
            return 'completed';
        }
        await delay(150);
    }
    return cacheState.entries.size > 0 ? 'completed' : 'timeout';
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
};

const selectIndicatorSymbols = (symbols: string[]): string[] => {
    if (!HAS_TWELVE_DATA) {
        return [];
    }

    const uniqueSymbols = Array.from(new Set(symbols));
    if (uniqueSymbols.length === 0) {
        cacheState.indicatorCursor = 0;
        return [];
    }

    const symbolsPerMinute = Math.max(0, Math.floor(TWELVE_DATA_MAX_REQUESTS_PER_MINUTE / INDICATOR_TYPES.length));
    if (symbolsPerMinute <= 0) {
        return [];
    }

    const takeCount = Math.min(symbolsPerMinute, uniqueSymbols.length);
    const cursor = cacheState.indicatorCursor % uniqueSymbols.length;
    const selection: string[] = [];

    for (let i = 0; selection.length < takeCount; i += 1) {
        const symbol = uniqueSymbols[(cursor + i) % uniqueSymbols.length];
        selection.push(symbol);
    }

    cacheState.indicatorCursor = (cursor + takeCount) % uniqueSymbols.length;
    return selection;
};


const selectCandleSymbols = (symbols: string[]): string[] => {
    if (!HAS_TWELVE_DATA) {
        return symbols;
    }

    const uniqueSymbols = Array.from(new Set(symbols))
        .filter((symbol) => !cacheState.unsupportedCandleSymbols.has(symbol));
    if (uniqueSymbols.length === 0) {
        cacheState.candleCursor = 0;
        return [];
    }

    // Prefer instruments that are more likely to be supported by TwelveData (stocks/ETFs before indices).
    const orderedSymbols = uniqueSymbols
        .slice()
        .sort((a, b) => {
            const aMeta = MARKET_UNIVERSE[a];
            const bMeta = MARKET_UNIVERSE[b];
            const aIsIndex = Boolean(aMeta?.finnhubSymbol?.startsWith('^'));
            const bIsIndex = Boolean(bMeta?.finnhubSymbol?.startsWith('^'));
            const aPriority = aMeta?.type === 'stock' ? 0 : (aIsIndex ? 2 : 1);
            const bPriority = bMeta?.type === 'stock' ? 0 : (bIsIndex ? 2 : 1);
            if (aPriority !== bPriority) return aPriority - bPriority;
            return a.localeCompare(b);
        });

    // TwelveData enforces a per-minute credit limit; treat TWELVE_DATA_MAX_REQUESTS_PER_MINUTE as credits/symbols per minute.
    const symbolsPerMinute = Math.max(1, Math.floor(TWELVE_DATA_MAX_REQUESTS_PER_MINUTE));
    const takeCount = Math.min(symbolsPerMinute, orderedSymbols.length);
    const cursor = cacheState.candleCursor % orderedSymbols.length;

    const selection: string[] = [];
    for (let i = 0; selection.length < takeCount; i += 1) {
        selection.push(orderedSymbols[(cursor + i) % orderedSymbols.length]);
    }

    cacheState.candleCursor = (cursor + takeCount) % orderedSymbols.length;
    return selection;
};

const isPermanentSymbolError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return msg.includes('symbol') && msg.includes('invalid')
        || msg.includes('available starting with')
        || msg.includes('grow plan')
        || msg.includes('pro plan');
};
const emptyIndicators = (): IndicatorSnapshot => ({
    rsi14: null,
    sma20: null,
    macd: null,
    macdSignal: null,
    macdHistogram: null,
});

const isRateLimitError = (error: unknown) => {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('api credits') || message.includes('429');
};

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
    if (!HAS_MARKET_CANDLES) {
        const mock = createMockData(symbol);
        cacheState.entries.set(symbol, { data: mock, timestamp: Date.now() });
        return mock;
    }

    const now = Date.now();
    const cached = cacheState.entries.get(symbol);
    const isFresh = cached && now - cached.timestamp < CACHE_DURATION;

    if (!isFresh || options.force) {
        await ensureRefreshed([symbol], Boolean(options.force));
    }

    return cacheState.entries.get(symbol)?.data ?? null;
}

export async function fetchAllMarketData(
    symbols: string[],
    options: { force?: boolean } = {},
): Promise<MarketData[]> {
    const uniqueSymbols = symbols.filter((symbol) => MARKET_UNIVERSE[symbol]);
    const force = Boolean(options.force);

    if (!HAS_MARKET_CANDLES) {
        return uniqueSymbols.map((symbol) => {
            const cached = cacheState.entries.get(symbol);
            if (cached) {
                return cached.data;
            }
            const mock = createMockData(symbol);
            cacheState.entries.set(symbol, { data: mock, timestamp: Date.now() });
            return mock;
        });
    }

    const now = Date.now();
    const staleSymbols = force
        ? uniqueSymbols
        : uniqueSymbols.filter((symbol) => {
            const cached = cacheState.entries.get(symbol);
            return !cached || now - cached.timestamp >= CACHE_DURATION;
        });

    if (staleSymbols.length > 0) {
        await ensureRefreshed(staleSymbols, force);
    }

    const results = uniqueSymbols
        .map((symbol) => {
            const cachedEntry = cacheState.entries.get(symbol);
            if (cachedEntry) {
                return cachedEntry.data;
            }
            return null;
        })
        .filter((data): data is MarketData => Boolean(data));

    return results;
}

async function ensureRefreshed(symbols: string[], force = false) {
    const uniqueSymbols = Array.from(new Set(symbols)).filter((symbol) => MARKET_UNIVERSE[symbol]);
    if (uniqueSymbols.length === 0) return;

    if (
        force
        && cacheState.entries.size > 0
        && cacheState.lastRefresh > 0
        && (Date.now() - cacheState.lastRefresh) < FORCE_REFRESH_MIN_INTERVAL_MS
    ) {
        return;
    }

    if (cacheState.refreshing) {
        const waitResult = await waitWithTimeout(
            cacheState.refreshing,
            force ? FORCE_REFRESH_WAIT_MS : MAX_REFRESH_WAIT_MS,
        );
        if (waitResult === 'timeout') {
            // If we have no data at all yet, give TwelveData a little more time to populate at least one entry.
            if (cacheState.entries.size === 0) {
                await waitForFirstCacheEntry(EMPTY_CACHE_WAIT_MS);
            }
            return;
        }
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

    cacheState.refreshing.catch((error) => {
        console.error('[market] Refresh failed', error);
    });

    await waitWithTimeout(
        cacheState.refreshing,
        force ? FORCE_REFRESH_WAIT_MS : MAX_REFRESH_WAIT_MS,
    );

    // Cold-start: even if we stop waiting on the full refresh, try to return at least some data.
    if (cacheState.entries.size === 0) {
        await waitForFirstCacheEntry(EMPTY_CACHE_WAIT_MS);
    }
}

async function refreshUniverse(symbols: string[]) {
    const uniqueSymbols = Array.from(new Set(symbols)).filter((symbol) => MARKET_UNIVERSE[symbol]);
    if (uniqueSymbols.length === 0) return;

    const candleSymbols = HAS_TWELVE_DATA ? selectCandleSymbols(uniqueSymbols) : uniqueSymbols;
    const indicatorMap = await fetchIndicatorBundle(uniqueSymbols);

    if (HAS_TWELVE_DATA) {
        const tasks = candleSymbols.map(async (symbol) => {
            const meta = MARKET_UNIVERSE[symbol];
            if (!meta) return;

            const twelveSymbol = meta.twelveDataSymbol;

            try {
                const raw = await fetchTimeSeriesSeries([twelveSymbol]);
                const ohlc = extractTimeSeriesOHLC(raw, twelveSymbol);

                if (!ohlc || ohlc.length === 0) {
                    const existing = cacheState.entries.get(meta.symbol);
                    if (existing) {
                        return;
                    }
                    console.warn('[market] TwelveData returned empty OHLC', { symbol: meta.symbol, twelveSymbol });
                    return;
                }

                const currentPrice = ohlc[ohlc.length - 1]?.close ?? 0;
                const indicators = indicatorMap[meta.symbol] ?? emptyIndicators();

                const marketData: MarketData = {
                    symbol: meta.symbol,
                    ohlc,
                    currentPrice,
                    indicators,
                    lastUpdated: new Date().toISOString(),
                    meta,
                };

                cacheState.entries.set(meta.symbol, { data: marketData, timestamp: Date.now() });
            } catch (error) {
                if (isRateLimitError(error)) {
                    return;
                }

                if (isPermanentSymbolError(error)) {
                    if (!cacheState.unsupportedCandleSymbols.has(symbol)) {
                        cacheState.unsupportedCandleSymbols.add(symbol);
                        console.warn('[market] TwelveData time_series unsupported symbol', {
                            symbol,
                            twelveSymbol,
                            message: error instanceof Error ? error.message : String(error),
                        });
                    }
                    return;
                }

                console.warn('[market] TwelveData time_series failed', {
                    symbol,
                    twelveSymbol,
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        });

        await Promise.allSettled(tasks);
    } else {
        const ohlcMap = await fetchFinnhubBundle(candleSymbols);

        candleSymbols.forEach((symbol) => {
            const meta = MARKET_UNIVERSE[symbol];
            const ohlc = ohlcMap[symbol];

            if (!ohlc || ohlc.length === 0) {
                const existing = cacheState.entries.get(meta.symbol);
                if (existing) {
                    console.warn(`[market] Missing OHLC data for ${meta.symbol}, keeping cached data`);
                    return;
                }

                console.warn(`[market] Missing OHLC data for ${meta.symbol}`);
                return;
            }

            const currentPrice = ohlc[ohlc.length - 1]?.close ?? 0;
            const indicators = indicatorMap[meta.symbol] ?? emptyIndicators();

            const marketData: MarketData = {
                symbol: meta.symbol,
                ohlc,
                currentPrice,
                indicators,
                lastUpdated: new Date().toISOString(),
                meta,
            };

            cacheState.entries.set(meta.symbol, { data: marketData, timestamp: Date.now() });
        });
    }

    cacheState.lastRefresh = Date.now();
}

type InstrumentMeta = (typeof MARKET_UNIVERSE)[keyof typeof MARKET_UNIVERSE];

async function fetchFinnhubBundle(symbols: string[]): Promise<Record<string, OHLC[] | null>> {
    const results: Record<string, OHLC[] | null> = {};
    const uniqueSymbols = Array.from(new Set(symbols)).filter((symbol) => MARKET_UNIVERSE[symbol]);
    uniqueSymbols.forEach((symbol) => {
        results[symbol] = null;
    });

    if (!HAS_FINNHUB || uniqueSymbols.length === 0) {
        return results;
    }

    const batches = chunk(uniqueSymbols, BATCH_SIZE);
    for (let i = 0; i < batches.length; i += 1) {
        const batch = batches[i];
        const metaList = batch.map((symbol) => MARKET_UNIVERSE[symbol]);
        const ohlcResults = await Promise.all(metaList.map((meta) => fetchFinnhubOHLC(meta)));

        ohlcResults.forEach((ohlc, idx) => {
            const meta = metaList[idx];
            results[meta.symbol] = ohlc;
        });

        if (i < batches.length - 1) {
            await delay(BATCH_DELAY_MS);
        }
    }

    return results;
}

async function fetchFinnhubOHLC(meta: InstrumentMeta): Promise<OHLC[] | null> {
    if (!FINNHUB_API_KEY) {
        console.warn('[market] Missing FINNHUB_API_KEY');
        return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const fromSeconds = Math.floor((Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000) / 1000);

    const url = new URL(`${FINNHUB_BASE}/stock/candle`);
    url.searchParams.set('symbol', meta.finnhubSymbol);
    url.searchParams.set('resolution', 'D');
    url.searchParams.set('from', String(fromSeconds));
    url.searchParams.set('to', String(nowSeconds));
    url.searchParams.set('token', FINNHUB_API_KEY);

    const runRequest = async () => {
        const response = await fetch(url.toString());
        let data: unknown;
        try {
            data = await response.json();
        } catch (error) {
            console.warn(`[market] Finnhub non-JSON response for ${meta.symbol} (HTTP ${response.status})`, error);
            return null;
        }

        const payload = (typeof data === 'object' && data !== null)
            ? (data as Record<string, unknown>)
            : null;

        if (!response.ok) {
            console.warn(`[market] Finnhub HTTP ${response.status} for ${meta.symbol}`, data);
            return null;
        }

        const s = payload?.s;
        const t = payload?.t;

        if (s !== 'ok' || !Array.isArray(t)) {
            // Finnhub returns an error payload without `s` in some cases (e.g. invalid token / no access).
            console.warn(`[market] Finnhub returned no candle data for ${meta.symbol}`, {
                s,
                error: payload?.error,
                message: payload?.message,
                raw: data,
            });
            return null;
        }

        const o = payload?.o;
        const h = payload?.h;
        const l = payload?.l;
        const c = payload?.c;

        if (!Array.isArray(o) || !Array.isArray(h) || !Array.isArray(l) || !Array.isArray(c)) {
            console.warn(`[market] Finnhub candle payload missing OHLC arrays for ${meta.symbol}`, {
                s,
                raw: data,
            });
            return null;
        }

        const candles: OHLC[] = (t as unknown[]).map((timestamp, idx) => ({
            time: new Date(Number(timestamp) * 1000).toISOString().split('T')[0],
            open: Number(o[idx]),
            high: Number(h[idx]),
            low: Number(l[idx]),
            close: Number(c[idx]),
        }));

        return candles.slice(-HISTORY_DAYS);
    };

    try {
        if (finnhubLimiter) {
            return await finnhubLimiter.schedule(runRequest);
        }
        return await runRequest();
    } catch (error) {
        console.error(`[market] Finnhub request failed for ${meta.symbol}`, error);
        return null;
    }
}

async function fetchFinnhubQuote(meta: InstrumentMeta): Promise<number | null> {
    if (!FINNHUB_API_KEY) {
        console.warn('[market] Missing FINNHUB_API_KEY');
        return null;
    }

    const url = new URL(`${FINNHUB_BASE}/quote`);
    url.searchParams.set('symbol', meta.finnhubSymbol);
    url.searchParams.set('token', FINNHUB_API_KEY);

    const runRequest = async () => {
        const response = await fetch(url.toString());
        if (!response.ok) {
            console.warn(`[market] Finnhub quote HTTP ${response.status} for ${meta.symbol}`);
            return null;
        }

        let payload: unknown;
        try {
            payload = await response.json();
        } catch (error) {
            console.warn(`[market] Finnhub quote non-JSON for ${meta.symbol}`, error);
            return null;
        }

        const priceRaw = (payload as Record<string, unknown>)?.c;
        const price = Number(priceRaw);
        if (!Number.isFinite(price)) {
            console.warn(`[market] Finnhub quote missing price for ${meta.symbol}`, payload);
            return null;
        }

        return price;
    };

    try {
        if (finnhubLimiter) {
            return await finnhubLimiter.schedule(runRequest);
        }
        return await runRequest();
    } catch (error) {
        console.warn(`[market] Finnhub quote failed for ${meta.symbol}`, error);
        return null;
    }
}

async function fetchIndicatorBundle(symbols: string[]): Promise<Record<string, IndicatorSnapshot>> {
    const results: Record<string, IndicatorSnapshot> = {};

    const uniqueSymbols = Array.from(new Set(symbols));
    if (!INDICATORS_ENABLED) {
        uniqueSymbols.forEach((symbol) => {
            results[symbol] = emptyIndicators();
        });
        return results;
    }

    if (!HAS_TWELVE_DATA || uniqueSymbols.length === 0) {
        uniqueSymbols.forEach((symbol) => {
            results[symbol] = emptyIndicators();
        });
        return results;
    }

    const fetchableSymbols = selectIndicatorSymbols(uniqueSymbols);
    const fetchableSet = new Set(fetchableSymbols);
    const skippedSymbols = uniqueSymbols.filter((symbol) => !fetchableSet.has(symbol));

    if (skippedSymbols.length) {
        skippedSymbols.forEach((symbol) => {
            results[symbol] = emptyIndicators();
        });
        console.warn(`[market] Indicator budget limited to ${fetchableSymbols.length} symbols, returning empty snapshots for ${skippedSymbols.length}`);
    }

    if (fetchableSymbols.length === 0) {
        return results;
    }

    const populateSnapshot = async (symbolGroup: string[]) => {
        const twelveSymbols = symbolGroup.map((symbol) => MARKET_UNIVERSE[symbol].twelveDataSymbol);

        const [rsiRaw, macdRaw, smaRaw] = await Promise.all([
            fetchIndicatorSeries('rsi', twelveSymbols),
            fetchIndicatorSeries('macd', twelveSymbols),
            fetchIndicatorSeries('sma', twelveSymbols),
        ]);

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

    const fallbackChunks = chunk(fetchableSymbols, INDICATOR_CHUNK_SIZE);
    for (let i = 0; i < fallbackChunks.length; i += 1) {
        const group = fallbackChunks[i];
        try {
            await withTimeout(populateSnapshot(group), INDICATOR_TIMEOUT_MS, 'Indicator fetch timed out');
        } catch (error) {
            console.warn('[market] Indicator chunk failed, using empty snapshot', error);
            group.forEach((symbol) => {
                results[symbol] = emptyIndicators();
            });
            if (isRateLimitError(error)) {
                for (let j = i + 1; j < fallbackChunks.length; j += 1) {
                    fallbackChunks[j].forEach((symbol) => {
                        results[symbol] = emptyIndicators();
                    });
                }
                break;
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

    const runRequest = async () => {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Indicator ${type} HTTP ${response.status}`);
        }
        const data = await response.json();

        if (data.code === 429 || data.status === 'error') {
            throw new Error(data.message || `Indicator ${type} error`);
        }

        if (symbols.length === 1 && !data[symbols[0]]) {
            return { [symbols[0]]: data } as IndicatorResponse;
        }

        return data as IndicatorResponse;
    };

    if (twelveDataLimiter) {
        return twelveDataLimiter.schedule(runRequest);
    }

    return runRequest();
}

async function fetchTimeSeriesSeries(symbols: string[]): Promise<TimeSeriesResponse> {
    if (symbols.length === 0) {
        return {};
    }

    const url = new URL(`${TWELVE_DATA_BASE}/time_series`);
    url.searchParams.set('symbol', symbols.join(','));
    url.searchParams.set('interval', '1day');
    url.searchParams.set('outputsize', String(Math.max(HISTORY_DAYS + 10, 120)));
    url.searchParams.set('apikey', TWELVE_DATA_API_KEY);

    const runRequest = async () => {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Time series HTTP ${response.status}`);
        }
        const data = await response.json();

        if (data?.code === 429 || data?.status === 'error') {
            throw new Error(data?.message || 'Time series error');
        }

        if (symbols.length === 1 && !data[symbols[0]]) {
            return { [symbols[0]]: data } as TimeSeriesResponse;
        }

        return data as TimeSeriesResponse;
    };

    if (twelveDataLimiter) {
        return twelveDataLimiter.schedule(runRequest);
    }

    return runRequest();
}

function extractTimeSeriesOHLC(source: TimeSeriesResponse, symbol: string): OHLC[] | null {
    const payload = source?.[symbol];
    if (!payload || payload.status === 'error') {
        return null;
    }

    const values = Array.isArray(payload.values) ? payload.values : null;
    if (!values || values.length === 0) {
        return null;
    }

    const candles: OHLC[] = values
        .map((value) => {
            const datetimeRaw = value.datetime ?? value.date ?? value.time;
            if (!datetimeRaw) return null;
            const date = String(datetimeRaw).slice(0, 10);
            const open = Number(value.open);
            const high = Number(value.high);
            const low = Number(value.low);
            const close = Number(value.close);
            if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
                return null;
            }
            return { time: date, open, high, low, close };
        })
        .filter((candle): candle is OHLC => Boolean(candle))
        // TwelveData returns newest-first; convert to chronological.
        .reverse();

    return candles.slice(-HISTORY_DAYS);
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

export async function refreshLiveQuotes(symbols: string[]): Promise<Record<string, number | null>> {
    const results: Record<string, number | null> = {};
    const uniqueSymbols = Array.from(new Set(symbols)).filter((symbol) => MARKET_UNIVERSE[symbol]);

    if (!HAS_FINNHUB || uniqueSymbols.length === 0) {
        uniqueSymbols.forEach((symbol) => { results[symbol] = null; });
        return results;
    }

    const tasks = uniqueSymbols.map(async (symbol) => {
        const meta = MARKET_UNIVERSE[symbol];
        const price = await fetchFinnhubQuote(meta);
        if (price !== null) {
            const existing = cacheState.entries.get(symbol);
            if (existing) {
                existing.data.currentPrice = price;
                existing.data.lastUpdated = new Date().toISOString();
                existing.timestamp = Date.now();
                cacheState.entries.set(symbol, existing);
            }
        }
        results[symbol] = price;
    });

    await Promise.allSettled(tasks);
    return results;
}

export function getCachedMarketData(symbol: string): MarketData | null {
    const entry = cacheState.entries.get(symbol);
    return entry ? entry.data : null;
}
