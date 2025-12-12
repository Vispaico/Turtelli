import { calculateATR, generateSignal } from '../lib/turtle';
import { MarketData, OHLC } from '../lib/types';

// Mock Data Generator
function createMockOHLC(length: number, startPrice: number, trend: 'UP' | 'DOWN' | 'FLAT'): OHLC[] {
    const data: OHLC[] = [];
    let price = startPrice;
    for (let i = 0; i < length; i++) {
        const volatility = price * 0.01;
        const change = trend === 'UP' ? volatility : trend === 'DOWN' ? -volatility : (Math.random() - 0.5) * volatility;
        price += change;

        data.push({
            time: new Date(Date.now() - (length - i) * 86400000).toISOString(),
            open: price,
            high: price + volatility,
            low: price - volatility,
            close: price + (change * 0.5),
        });
    }
    return data;
}

async function runVerification() {
    console.log('--- Verifying Turtle Logic ---');

    // 1. Test ATR
    const mockData = createMockOHLC(30, 100, 'FLAT');
    const atr = calculateATR(mockData, 20);
    console.log(`ATR (20): ${atr.toFixed(4)}`);
    if (atr > 0) console.log('✅ ATR calculation seems valid (non-zero)');
    else console.error('❌ ATR calculation failed');

    // 2. Test 20-day Breakout (BUY)
    console.log('\n--- Testing 20-day Breakout (BUY) ---');
    const breakoutData = createMockOHLC(60, 100, 'FLAT');
    const breakoutPrice = 150; // Way above
    const marketData: MarketData = {
        symbol: 'TEST',
        ohlc: breakoutData,
        currentPrice: breakoutPrice,
        lastUpdated: new Date().toISOString(),
    };

    const signal = generateSignal(marketData);
    console.log('Signal:', signal);

    if (signal.action === 'BUY' && signal.reason.includes('20-day')) {
        console.log('✅ 20-day Breakout detected correctly');
    } else {
        console.error('❌ Failed to detect 20-day Breakout');
    }

    // 3. Test 55-day Breakout (BUY)
    console.log('\n--- Testing 55-day Breakout (BUY) ---');
    // Need to ensure 20-day high is also broken, but maybe 55-day is the key check
    // In our logic, we check 20 first, then 55 overrides? Or separate?
    // Our code:
    // if (currentPrice > high20) ...
    // if (currentPrice > high55) ... (overrides action)

    // Let's make a scenario where it's a 55-day breakout
    const longData = createMockOHLC(100, 100, 'FLAT');
    const marketData2: MarketData = {
        symbol: 'TEST2',
        ohlc: longData,
        currentPrice: 200, // Huge breakout
        lastUpdated: new Date().toISOString(),
    };
    const signal2 = generateSignal(marketData2);
    console.log('Signal:', signal2);

    if (signal2.action === 'BUY') {
        console.log('✅ 55-day Breakout detected (or 20-day, which is also true)');
    }
}

runVerification();
