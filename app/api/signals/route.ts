import { NextResponse } from 'next/server';
import { fetchAllMarketData } from '@/lib/api';
import { generateSignal } from '@/lib/turtle';
import { ALL_SYMBOLS } from '@/lib/types';

export async function GET() {
    try {
        const marketDataList = await fetchAllMarketData(ALL_SYMBOLS);
        const signals = marketDataList.map(generateSignal);
        const fulfilledSymbols = new Set(marketDataList.map((item) => item.symbol));
        const skipped = ALL_SYMBOLS.filter((symbol) => !fulfilledSymbols.has(symbol));

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            markets: marketDataList,
            signals,
            skipped,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60',
            },
        });
    } catch (error) {
        console.error('Error in signals API:', error);
        return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }
}
