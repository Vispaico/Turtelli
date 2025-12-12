import React from 'react';
import { PortfolioPosition } from '@/lib/types';
import { ArrowDown, ArrowUp } from 'lucide-react';

export default function TradeTable({ positions }: { positions: PortfolioPosition[] }) {
    if (!positions.length) {
        return (
            <div className="text-center text-sm opacity-60 py-10">
                No simulated trades at the moment. Waiting for the next breakout.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase opacity-60">
                    <tr>
                        <th className="p-3 text-left">Ticker</th>
                        <th className="p-3 text-left">Qty</th>
                        <th className="p-3 text-left">Entry / Current</th>
                        <th className="p-3 text-left">P&amp;L</th>
                        <th className="p-3 text-left">IG Costs</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {positions.map((position) => {
                        const isProfit = position.pnl >= 0;
                        return (
                            <tr key={`${position.symbol}-${position.entryPrice}-${position.side}`} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 font-semibold">
                                    <div className="flex items-center gap-2">
                                        {isProfit ? <ArrowUp className="w-3 h-3 text-accent-green" /> : <ArrowDown className="w-3 h-3 text-accent-red" />}
                                        <span>{position.symbol}</span>
                                    </div>
                                    <p className="text-xs opacity-60 mt-1">{position.side === 'LONG' ? 'Long' : 'Short'} signal</p>
                                </td>
                                <td className="p-3 font-mono">{position.quantity}</td>
                                <td className="p-3 font-mono">
                                    <div>${position.entryPrice.toFixed(2)}</div>
                                    <div className="opacity-60">${position.currentPrice.toFixed(2)}</div>
                                </td>
                                <td className={`p-3 font-mono ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                                    {isProfit ? '+' : ''}{position.pnl.toFixed(2)}
                                    <span className="block text-xs opacity-60">{position.pnlPercent.toFixed(2)}%</span>
                                </td>
                                <td className="p-3 font-mono text-accent-red">-${position.igCost.toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
