import { MarketData, Portfolio, PortfolioHistoryPoint, PortfolioPosition, Signal, MARKET_UNIVERSE } from './types';

const IG_COSTS = {
    INDICES_SPREAD: 1.5,
    STOCK_COMMISSION_PCT: 0.0005,
    STOCK_MIN_COMMISSION: 15,
};

interface SimulationParams {
    id: string;
    name: string;
    capital: number;
    signals: Signal[];
    marketMap: Record<string, MarketData>;
    riskPercent?: number;
}

export function calculateCost(symbol: string, quantity: number, price: number): number {
    const meta = MARKET_UNIVERSE[symbol];
    if (meta?.type === 'index') {
        const spread = meta.igSpread ?? IG_COSTS.INDICES_SPREAD;
        return spread * quantity;
    }

    const commission = price * quantity * IG_COSTS.STOCK_COMMISSION_PCT;
    return Math.max(commission, IG_COSTS.STOCK_MIN_COMMISSION);
}

export function createInitialPortfolio(id: string, name: string, capital: number): Portfolio {
    return {
        id,
        name,
        initialCapital: capital,
        currentBalance: capital,
        positions: [],
        totalPnl: 0,
        totalPnlPercent: 0,
        tradeCount: 0,
        totalIgCost: 0,
        history: [{ date: new Date().toISOString(), value: capital }],
    };
}

export function simulatePortfolio(params: SimulationParams): Portfolio {
    const { id, name, capital, signals, marketMap, riskPercent = 0.01 } = params;
    const positions: PortfolioPosition[] = [];
    let totalPnl = 0;
    let totalIgCost = 0;

    signals.forEach((signal) => {
        if (signal.action === 'HOLD') return;
        const market = marketMap[signal.symbol];
        if (!market) return;

        const entryPrice = signal.entryPrice || market.currentPrice;
        const stopLoss = signal.stopLoss;
        if (!entryPrice || !stopLoss || entryPrice === stopLoss) return;

        const riskAmount = capital * riskPercent;
        const stopDistance = Math.abs(entryPrice - stopLoss);
        if (stopDistance <= 0) return;

        const quantity = Math.max(1, Math.floor(riskAmount / stopDistance));
        if (!Number.isFinite(quantity) || quantity <= 0) return;

        const igCost = calculateCost(signal.symbol, quantity, entryPrice);
        const side = signal.action === 'SELL' ? 'SHORT' : 'LONG';
        const currentPrice = market.currentPrice;
        const grossPnl = side === 'LONG'
            ? (currentPrice - entryPrice) * quantity
            : (entryPrice - currentPrice) * quantity;
        const pnl = grossPnl - igCost;
        const pnlPercent = (pnl / (entryPrice * quantity)) * 100;

        totalPnl += pnl;
        totalIgCost += igCost;

        positions.push({
            symbol: signal.symbol,
            quantity,
            entryPrice,
            currentPrice,
            pnl,
            pnlPercent,
            cost: entryPrice * quantity,
            side,
            action: signal.action,
            igCost,
        });
    });

    const history = buildPortfolioHistory(capital, positions, marketMap);
    const currentBalance = history.length > 0 ? history[history.length - 1].value : capital + totalPnl;
    const totalPnlPercent = ((currentBalance - capital) / capital) * 100;

    return {
        id,
        name,
        initialCapital: capital,
        currentBalance,
        positions,
        totalPnl,
        totalPnlPercent,
        tradeCount: positions.length,
        totalIgCost,
        history: history.length ? history : [{ date: new Date().toISOString(), value: currentBalance }],
    };
}

function buildPortfolioHistory(
    capital: number,
    positions: PortfolioPosition[],
    marketMap: Record<string, MarketData>,
    lookbackDays = 30,
): PortfolioHistoryPoint[] {
    if (positions.length === 0) {
        return [{ date: new Date().toISOString(), value: capital }];
    }

    const uniqueDates = new Set<string>();
    Object.values(marketMap).forEach((market) => {
        market.ohlc.slice(-lookbackDays).forEach((candle) => uniqueDates.add(candle.time));
    });

    const sortedDates = Array.from(uniqueDates).sort();
    const timeline = sortedDates.slice(-lookbackDays);
    if (!timeline.length) {
        return [{ date: new Date().toISOString(), value: capital }];
    }

    const baseCash = capital - positions.reduce((sum, pos) => sum + pos.igCost, 0);

    return timeline.map((date) => {
        let equity = baseCash;
        positions.forEach((position) => {
            const market = marketMap[position.symbol];
            if (!market) return;
            const price = resolvePriceForDate(market, date) ?? position.currentPrice;
            const delta = position.side === 'LONG'
                ? (price - position.entryPrice)
                : (position.entryPrice - price);
            equity += delta * position.quantity;
        });
        return { date, value: Number(equity.toFixed(2)) };
    });
}

function resolvePriceForDate(market: MarketData, date: string): number | null {
    for (let i = market.ohlc.length - 1; i >= 0; i -= 1) {
        const candle = market.ohlc[i];
        if (candle.time <= date) {
            return candle.close;
        }
    }
    return market.currentPrice ?? null;
}
