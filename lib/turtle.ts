import { MarketData, Signal, Action, OHLC } from './types';

// Turtle Trading Constants
const SYSTEM_1_ENTRY = 20; // 20-day breakout
const SYSTEM_2_ENTRY = 55; // 55-day breakout
const ATR_PERIOD = 20;

export function calculateATR(ohlc: OHLC[], period: number = ATR_PERIOD): number {
    if (ohlc.length < period + 1) return 0;

    let trSum = 0;
    // Calculate initial TRs
    for (let i = 1; i <= period; i++) {
        const current = ohlc[i];
        const prev = ohlc[i - 1];
        const tr = Math.max(
            current.high - current.low,
            Math.abs(current.high - prev.close),
            Math.abs(current.low - prev.close)
        );
        trSum += tr;
    }

    let atr = trSum / period;

    // Smooth ATR for the rest
    for (let i = period + 1; i < ohlc.length; i++) {
        const current = ohlc[i];
        const prev = ohlc[i - 1];
        const tr = Math.max(
            current.high - current.low,
            Math.abs(current.high - prev.close),
            Math.abs(current.low - prev.close)
        );
        atr = ((atr * (period - 1)) + tr) / period;
    }

    return atr;
}

export function generateSignal(marketData: MarketData): Signal {
    const { symbol, ohlc, currentPrice } = marketData;
    const len = ohlc.length;

    if (len < SYSTEM_2_ENTRY) {
        return {
            symbol,
            action: 'HOLD',
            entryPrice: 0,
            stopLoss: 0,
            targetPrice: 0,
            timestamp: new Date().toISOString(),
            reason: 'Insufficient Data',
        };
    }

    const atr = calculateATR(ohlc);
    // Actually, Turtle checks if TODAY's price breaks the high of the LAST N days.
    // We use the latest available data point as "today" or "current".

    // Get highs/lows of previous N days (excluding current if it's forming, but for simplicity we use closed candles + current price)
    // Let's assume ohlc includes up to yesterday, and currentPrice is live.

    const prev20 = ohlc.slice(len - SYSTEM_1_ENTRY, len);
    const high20 = Math.max(...prev20.map(c => c.high));
    const low20 = Math.min(...prev20.map(c => c.low));

    const prev55 = ohlc.slice(len - SYSTEM_2_ENTRY, len);
    const high55 = Math.max(...prev55.map(c => c.high));
    const low55 = Math.min(...prev55.map(c => c.low));

    let action: Action = 'HOLD';
    let reason = '';
    let stopLoss = 0;
    let targetPrice = 0;

    // System 1: 20-day Breakout (Short-term)
    if (currentPrice > high20) {
        action = 'BUY';
        reason = '20-day Breakout (Long)';
        stopLoss = currentPrice - (2 * atr); // 2N Stop
        targetPrice = currentPrice + (4 * atr); // Arbitrary target for UI (Turtles pyramided)
    } else if (currentPrice < low20) {
        action = 'SELL'; // Short
        reason = '20-day Breakout (Short)';
        stopLoss = currentPrice + (2 * atr);
        targetPrice = currentPrice - (4 * atr);
    }

    // System 2: 55-day Breakout (Long-term) - Overrides System 1 if valid
    // In real Turtle, you take S1 only if previous S1 was a loss. Simplified here:
    if (currentPrice > high55) {
        action = 'BUY';
        reason = '55-day Breakout (Long)';
        stopLoss = currentPrice - (2 * atr);
        targetPrice = currentPrice + (6 * atr);
    } else if (currentPrice < low55) {
        action = 'SELL';
        reason = '55-day Breakout (Short)';
        stopLoss = currentPrice + (2 * atr);
        targetPrice = currentPrice - (6 * atr);
    }

    // Exit Logic (Simplified)
    // If we are in a position (simulated), we would check exits.
    // For a "Signal" dashboard, we show the ENTRY signal if it's happening NOW.
    // Otherwise, we might show HOLD.

    // Refinement: If no breakout today, check if we should EXIT an existing position?
    // Since we don't track live user positions in this function, we just report Breakouts.
    // If no breakout, we return HOLD.

    return {
        symbol,
        action,
        entryPrice: action !== 'HOLD' ? currentPrice : 0,
        stopLoss,
        targetPrice,
        timestamp: new Date().toISOString(),
        reason,
        indicators: marketData.indicators,
    };
}
