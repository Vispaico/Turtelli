import React from 'react';
import { Signal, MarketData } from '@/lib/types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// Simple Sparkline SVG
const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const height = 40;
    const width = 100;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        </svg>
    );
};

export default function SignalCard({ signal, marketData }: { signal: Signal, marketData?: MarketData }) {
    const isBuy = signal.action === 'BUY';
    const isSell = signal.action === 'SELL';
    const colorClass = isBuy ? 'text-accent-green' : isSell ? 'text-accent-red' : 'text-gray-400';
    const strokeColor = isBuy ? '#00ff9d' : isSell ? '#ff4d4d' : '#9ca3af';

    // Use last 20 closes for sparkline
    const sparkData = marketData?.ohlc.slice(-20).map(c => c.close) || [];
    const indicators = signal.indicators || marketData?.indicators;

    return (
        <div className="glass-card p-6 hover:scale-105 transition-transform duration-300 cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold">{signal.symbol}</h3>
                    <p className="text-xs opacity-60">{signal.reason || 'Monitoring'}</p>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 ${colorClass}`}>
                    {isBuy && <ArrowUp className="w-4 h-4" />}
                    {isSell && <ArrowDown className="w-4 h-4" />}
                    {!isBuy && !isSell && <Minus className="w-4 h-4" />}
                    <span className="font-bold text-sm">{signal.action}</span>
                </div>
            </div>

            <div className="mb-4 h-10">
                <Sparkline data={sparkData} color={strokeColor} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <span className="block opacity-50 text-xs">Entry</span>
                    <span className="font-mono">{signal.entryPrice > 0 ? signal.entryPrice.toFixed(2) : '-'}</span>
                </div>
                <div className="text-right">
                    <span className="block opacity-50 text-xs">Stop</span>
                    <span className="font-mono text-accent-red">{signal.stopLoss > 0 ? signal.stopLoss.toFixed(2) : '-'}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] mt-4 opacity-70">
                <div>
                    <span className="block">RSI</span>
                    <span className="font-mono">{typeof indicators?.rsi14 === 'number' ? indicators.rsi14.toFixed(1) : '—'}</span>
                </div>
                <div className="text-center">
                    <span className="block">MACD</span>
                    <span className="font-mono">{typeof indicators?.macd === 'number' ? indicators.macd.toFixed(2) : '—'}</span>
                </div>
                <div className="text-right">
                    <span className="block">SMA20</span>
                    <span className="font-mono">{typeof indicators?.sma20 === 'number' ? indicators.sma20.toFixed(2) : '—'}</span>
                </div>
            </div>
        </div>
    );
}
