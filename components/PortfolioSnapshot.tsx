import React from 'react';
import { Portfolio } from '@/lib/types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function PortfolioSnapshot({ portfolio }: { portfolio: Portfolio }) {
    const isPositive = portfolio.totalPnl >= 0;

    return (
        <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-24 h-24" />
            </div>

            <h3 className="text-lg font-medium opacity-80 mb-2">{portfolio.name}</h3>

            <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold">
                    ${portfolio.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-bold">{portfolio.totalPnlPercent.toFixed(2)}%</span>
                </div>
                <span className="text-sm opacity-60">All Time P&L</span>
            </div>

            <div className="space-y-2 text-sm border-t border-white/10 pt-4">
                <div className="flex justify-between">
                    <span className="opacity-60">Trades Taken</span>
                    <span className="font-mono">{portfolio.tradeCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="opacity-60">IG Costs (Actual)</span>
                    <span className="font-mono text-accent-red">-${portfolio.totalIgCost.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
