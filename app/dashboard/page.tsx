"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout';
import SignalTable from '@/components/SignalTable';
import PortfolioChart from '@/components/PortfolioChart';
import TradeTable from '@/components/TradeTable';
import ExitTable from '@/components/ExitTable';
import { Signal, MarketData, Portfolio, TrackedTrade } from '@/lib/types';
import { simulatePortfolio } from '@/lib/portfolio';

type SignalsResponse = {
    timestamp: string;
    markets: MarketData[];
    signals: Signal[];
    skipped: string[];
    openTrades: TrackedTrade[];
    closedTrades: TrackedTrade[];
};

const fetcher = async (url: string): Promise<SignalsResponse> => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
        const raw = await res.text();
        let msg = raw;
        try {
            const parsed = JSON.parse(raw) as { error?: string; message?: string };
            msg = parsed.error ?? parsed.message ?? raw;
        } catch {
            // noop
        }
        throw new Error(msg || `Failed to fetch (HTTP ${res.status})`);
    }
    return res.json();
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'main' | 'small'>('main');
    const [data, setData] = useState<SignalsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadSignals = useCallback(async (force = false) => {
        setIsRefreshing(true);
        setError(null);
        try {
            const next = await fetcher(`/api/signals?${force ? 'force=1&' : ''}t=${Date.now()}`);
            setData(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch signals');
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadSignals(false);
    }, [loadSignals]);

    // Cold start: if the API returns 0 markets (while the server is still warming/populating cache), retry automatically.
    useEffect(() => {
        if (!data) return;
        if (error) return;
        if (isRefreshing) return;
        if ((data.markets?.length ?? 0) > 0) return;

        const timer = setTimeout(() => {
            void loadSignals(false);
        }, 2500);

        return () => clearTimeout(timer);
    }, [data, error, isRefreshing, loadSignals]);

    const signals: Signal[] = useMemo(() => data?.signals ?? [], [data?.signals]);
    const markets: MarketData[] = useMemo(() => data?.markets ?? [], [data?.markets]);
    const openTrades: TrackedTrade[] = useMemo(() => data?.openTrades ?? [], [data?.openTrades]);
    const closedTrades: TrackedTrade[] = useMemo(() => data?.closedTrades ?? [], [data?.closedTrades]);

    const tradesForSimulation = useMemo(
        () => [...openTrades, ...closedTrades],
        [openTrades, closedTrades],
    );

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
            trades: tradesForSimulation,
            closedTrades,
        })
    ), [signals, marketMap, tradesForSimulation, closedTrades]);

    const smallPortfolio = useMemo<Portfolio>(() => (
        simulatePortfolio({
            id: 'small',
            name: 'Small Account ($800)',
            capital: 800,
            signals,
            marketMap,
            trades: tradesForSimulation,
            closedTrades,
        })
    ), [signals, marketMap, tradesForSimulation, closedTrades]);

    const currentPortfolio = activeTab === 'main' ? mainPortfolio : smallPortfolio;

    const handleRefresh = useCallback(() => {
        void loadSignals(true);
    }, [loadSignals]);

    return (
        <Layout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Trader Dashboard</h1>
                <div className="flex items-center gap-2 text-sm opacity-60">
                    {data?.timestamp && <span>Last updated {new Date(data.timestamp).toLocaleTimeString()}</span>}
                    {data && <span>({data.signals.length} signals / {data.markets.length} markets / {openTrades.length} open deals)</span>}
                    {error && <span className="text-accent-red">{error}</span>}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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

                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Recent Exits</h3>
                            <span className="text-xs opacity-60">{closedTrades.length} closed deals</span>
                        </div>
                        <ExitTable trades={closedTrades} />
                    </div>
                </div>

                {/* Right Column: Signals */}
                <div className="lg:col-span-1">
                    <SignalTable signals={signals} />
                    {isRefreshing && (
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
