"use client";

import React, { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import SignalTable from '@/components/SignalTable';
import PortfolioChart from '@/components/PortfolioChart';
import TradeTable from '@/components/TradeTable';
import { Signal, MarketData, Portfolio } from '@/lib/types';
import { simulatePortfolio } from '@/lib/portfolio';

type SignalsResponse = {
    timestamp: string;
    markets: MarketData[];
    signals: Signal[];
    skipped: string[];
};

const fetcher = (url: string): Promise<SignalsResponse> => fetch(url, { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to fetch');
    }
    return res.json();
});

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'main' | 'small'>('main');
    const { data, error, isLoading, mutate, isValidating } = useSWR<SignalsResponse>('/api/signals', fetcher, {
        dedupingInterval: 60 * 60 * 1000,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });

    const signals: Signal[] = useMemo(() => data?.signals ?? [], [data?.signals]);
    const markets: MarketData[] = useMemo(() => data?.markets ?? [], [data?.markets]);

    const marketMap = useMemo(() => (
        markets.reduce((acc, item) => {
            acc[item.symbol] = item;
            return acc;
        }, {} as Record<string, MarketData>)
    ), [markets]);

    const mainPortfolio = useMemo<Portfolio>(() => (
        simulatePortfolio({
            id: 'main',
            name: 'Main Portfolio ($10k)',
            capital: 10_000,
            signals,
            marketMap,
        })
    ), [signals, marketMap]);

    const smallPortfolio = useMemo<Portfolio>(() => (
        simulatePortfolio({
            id: 'small',
            name: 'Small Account ($800)',
            capital: 800,
            signals,
            marketMap,
        })
    ), [signals, marketMap]);

    const currentPortfolio = activeTab === 'main' ? mainPortfolio : smallPortfolio;

    const handleRefresh = useCallback(async () => {
        await mutate(fetcher(`/api/signals?force=1&t=${Date.now()}`), {
            revalidate: false,
            rollbackOnError: true,
        });
    }, [mutate]);

    return (
        <Layout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Trader Dashboard</h1>
                <div className="flex items-center gap-2 text-sm opacity-60">
                    {data?.timestamp && <span>Last updated {new Date(data.timestamp).toLocaleTimeString()}</span>}
                    {error && <span className="text-accent-red">{error.message}</span>}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isLoading || isValidating}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading || isValidating ? 'animate-spin' : ''}`} />
                    Refresh Signals
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Portfolio */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Portfolio Tabs */}
                    <div className="glass-card p-6">
                        <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                            <button
                                onClick={() => setActiveTab('main')}
                                className={`text-lg font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'main' ? 'bg-accent-green text-black' : 'hover:bg-white/5'}`}
                            >
                                Main ($10k)
                            </button>
                            <button
                                onClick={() => setActiveTab('small')}
                                className={`text-lg font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'small' ? 'bg-accent-green text-black' : 'hover:bg-white/5'}`}
                            >
                                Small ($800)
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-4 bg-white/5 rounded-lg">
                                <span className="block opacity-60 text-sm mb-1">Balance</span>
                                <span className="text-2xl font-bold font-mono">${currentPortfolio.currentBalance.toFixed(2)}</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-lg">
                                <span className="block opacity-60 text-sm mb-1">Total P&amp;L</span>
                                <span className={`text-2xl font-bold font-mono ${currentPortfolio.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                    {currentPortfolio.totalPnl >= 0 ? '+' : ''}{currentPortfolio.totalPnl.toFixed(2)}
                                </span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-lg">
                                <span className="block opacity-60 text-sm mb-1">P&amp;L %</span>
                                <span className={`text-2xl font-bold font-mono ${currentPortfolio.totalPnlPercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                    {currentPortfolio.totalPnlPercent.toFixed(2)}%
                                </span>
                            </div>
                        </div>

                        <div className="h-[300px]">
                            <PortfolioChart portfolio={currentPortfolio} />
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Simulated Trades</h3>
                            <span className="text-xs opacity-60">IG Costs Paid: ${currentPortfolio.totalIgCost.toFixed(2)}</span>
                        </div>
                        <TradeTable positions={currentPortfolio.positions} />
                    </div>
                </div>

                {/* Right Column: Signals */}
                <div className="lg:col-span-1">
                    <SignalTable signals={signals} />
                    {(isLoading || isValidating) && (
                        <p className="text-center text-sm opacity-60 mt-4">Refreshing signals...</p>
                    )}
                    {!!(data?.skipped?.length) && (
                        <p className="text-xs text-accent-red mt-4 text-center">
                            Skipped tickers: {data.skipped.join(', ')}
                        </p>
                    )}
                </div>
            </div>
        </Layout>
    );
}
