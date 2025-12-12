'use client';

import React from 'react';
import { Signal } from '@/lib/types';

export default function Ticker({ signals }: { signals: Signal[] }) {
    return (
        <div className="w-full overflow-hidden bg-black/20 border-y border-white/5 py-2">
            <div className="flex animate-scroll whitespace-nowrap">
                {/* Duplicate list for seamless loop */}
                {[...signals, ...signals].map((signal, i) => (
                    <div key={`${signal.symbol}-${i}`} className="inline-flex items-center mx-6">
                        <span className="font-bold mr-2">{signal.symbol}</span>
                        <span className={`text-sm font-medium ${signal.action === 'BUY' ? 'text-accent-green' :
                            signal.action === 'SELL' ? 'text-accent-red' : 'text-gray-400'
                            }`}>
                            {signal.action}
                        </span>
                        <span className="ml-2 text-xs opacity-60">
                            @ {signal.entryPrice > 0 ? signal.entryPrice.toFixed(2) : '---'}
                        </span>
                    </div>
                ))}
            </div>
            <style jsx>{`
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
        </div>
    );
}
