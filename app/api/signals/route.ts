import { NextResponse } from 'next/server';
import { getSignalSnapshot } from '@/lib/tradeEngine';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const forceParam = url.searchParams.get('force');
        const force = forceParam === '1' || forceParam === 'true';
        const snapshot = await getSignalSnapshot({ force });

        return NextResponse.json(snapshot, {
            headers: {
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error in signals API:', error);
        return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }
}
