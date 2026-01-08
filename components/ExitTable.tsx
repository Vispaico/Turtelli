import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { TrackedTrade } from '@/lib/types';

export default function ExitTable({ trades }: { trades: TrackedTrade[] }) {
    if (!trades.length) {
        return (
            <div className="text-center text-sm opacity-60 py-8">
                No closed deals yet. Exits will show here once stops or targets are hit.
            </div>
        );
    }

    const rows = trades.slice(0, 20);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase opacity-60">
                    <tr>
                        <th className="p-3 text-left">Ticker</th>
                        <th className="p-3 text-left">Side</th>
                        <th className="p-3 text-left">Entry / Exit</th>
                        <th className="p-3 text-left">Result</th>
                        <th className="p-3 text-left">Reason</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {rows.map((trade) => {
                        const perUnit = trade.pnl ?? (() => {
                            if (!trade.exitPrice) return 0;
                            return trade.side === 'LONG'
                                ? (trade.exitPrice - trade.entryPrice)
                                : (trade.entryPrice - trade.exitPrice);
                        })();

                        const pnlPercent = trade.pnlPercent ?? (trade.exitPrice
                            ? (perUnit / trade.entryPrice) * 100
                            : 0);
                        const isWin = pnlPercent >= 0;
                        return (
                            <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 font-semibold">{trade.symbol}</td>
                                <td className="p-3 font-mono">{trade.side}</td>
                                <td className="p-3 font-mono">
                                    <div>${trade.entryPrice.toFixed(2)}</div>
                                    {trade.exitPrice !== undefined && (
                                        <div className="opacity-60">${trade.exitPrice.toFixed(2)}</div>
                                    )}
                                </td>
                                <td className={`p-3 font-mono ${isWin ? 'text-accent-green' : 'text-accent-red'}`}>
                                    <div className="flex items-center gap-2">
                                        {isWin ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                        <span>{pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
                                    </div>
                                    <span className="block text-xs opacity-60">{perUnit >= 0 ? '+' : ''}{perUnit.toFixed(2)} per unit</span>
                                </td>
                                <td className="p-3 text-xs opacity-70 uppercase">{trade.exitReason ?? 'N/A'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
