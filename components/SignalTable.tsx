'use client';

import React, { useMemo, useState } from 'react';
import { Signal, INDICES, STOCKS } from '@/lib/types';
import { ArrowUp, ArrowDown } from 'lucide-react';

type SignalTab = 'INDICES' | 'STOCKS';

export default function SignalTable({ signals }: { signals: Signal[] }) {
    const [tab, setTab] = useState<SignalTab>('INDICES');

    const filteredSignals = useMemo(() => {
        if (!signals.length) return [];

        const universeReady = (INDICES.length + STOCKS.length) > 0;
        if (!universeReady) return signals;

        const allowed = tab === 'INDICES' ? new Set(INDICES) : new Set(STOCKS);
        const matched = signals.filter((signal) => allowed.has(signal.symbol));

        // If the tab-filter produces no matches but we clearly have data, fall back to showing everything.
        // This prevents a blank UI if symbol lists get out of sync with API payloads.
        return matched.length ? matched : signals;
    }, [signals, tab]);

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-lg">Public Signals</h3>
                <div className="flex gap-2">
                    {(['INDICES', 'STOCKS'] as SignalTab[]).map((item) => (
                        <button
                            key={item}
                            onClick={() => setTab(item)}
                            className={`px-4 py-1 rounded-full text-sm font-semibold transition-colors ${tab === item ? 'bg-white/15 text-white' : 'opacity-60 hover:opacity-100'}`}
                        >
                            {item === 'INDICES' ? 'Indices' : 'Stocks'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-2 text-xs opacity-60 border-b border-white/5">
                Showing {filteredSignals.length} of {signals.length}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase opacity-60">
                        <tr>
                            <th className="p-4">Ticker</th>
                            <th className="p-4">Action</th>
                            <th className="p-4">Entry</th>
                            <th className="p-4">Stop</th>
                            <th className="p-4">Target</th>
                            <th className="p-4">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredSignals.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-sm opacity-60">
                                    No signals available for {tab === 'INDICES' ? 'indices' : 'stocks'} right now.
                                </td>
                            </tr>
                        )}
                        {filteredSignals.map((signal) => {
                            const isBuy = signal.action === 'BUY';
                            const isSell = signal.action === 'SELL';
                            return (
                                <tr key={signal.symbol} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold">
                                    <div>{signal.symbol}</div>
                                    {signal.reason && <p className="text-xs opacity-60 font-normal mt-1">{signal.reason}</p>}
                                </td>
                                <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isBuy
                                            ? 'bg-green-500/20 text-accent-green'
                                            : isSell
                                                ? 'bg-red-500/20 text-accent-red'
                                                : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {isBuy && <ArrowUp className="w-3 h-3" />}
                                            {isSell && <ArrowDown className="w-3 h-3" />}
                                            {!isBuy && !isSell && <span className="w-3" />}
                                            <span>{signal.action}</span>
                                    </span>
                                </td>
                                <td className="p-4 font-mono">{signal.entryPrice > 0 ? signal.entryPrice.toFixed(2) : '-'}</td>
                                <td className="p-4 font-mono text-accent-red">{signal.stopLoss > 0 ? signal.stopLoss.toFixed(2) : '-'}</td>
                                <td className="p-4 font-mono text-accent-green">{signal.targetPrice > 0 ? signal.targetPrice.toFixed(2) : '-'}</td>
                                <td className="p-4 opacity-50 text-xs">{new Date(signal.timestamp).toLocaleTimeString()}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
