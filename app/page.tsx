import React from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Ticker from '@/components/Ticker';
import SignalCard from '@/components/SignalCard';
import PortfolioSnapshot from '@/components/PortfolioSnapshot';
import { fetchAllMarketData } from '@/lib/api';
import { generateSignal } from '@/lib/turtle';
import { simulatePortfolio } from '@/lib/portfolio';
import { ALL_SYMBOLS, MarketData } from '@/lib/types';

export const revalidate = 3600;

export default async function Home() {
  // Fetch data server-side
  const allSymbols = ALL_SYMBOLS;
  const marketDataList = await fetchAllMarketData(allSymbols);
  const signals = marketDataList.map(generateSignal);

  // Create a map for easy lookup
  const marketDataMap = marketDataList.reduce((acc, data) => {
    acc[data.symbol] = data;
    return acc;
  }, {} as Record<string, MarketData>);

  const mainPortfolio = simulatePortfolio({
    id: 'main',
    name: 'Main Portfolio ($10k)',
    capital: 10_000,
    signals,
    marketMap: marketDataMap,
  });

  const smallPortfolio = simulatePortfolio({
    id: 'small',
    name: 'Small Account ($800)',
    capital: 800,
    signals,
    marketMap: marketDataMap,
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="text-center py-20 space-y-6 animate-fade-in">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
          Trade Like a Turtle.
        </h1>
        <p className="text-xl md:text-2xl opacity-70 max-w-2xl mx-auto font-light">
          Proven signals for financial freedom. Automated breakout strategies for Indices and Stocks.
        </p>
        <div className="pt-8">
          <Link
            href="/dashboard"
            className="bg-accent-green text-black font-bold py-4 px-8 rounded-full text-lg hover:scale-105 transition-transform inline-block shadow-[0_0_20px_rgba(0,255,157,0.3)]"
          >
            Start Trading
          </Link>
        </div>
      </section>

      {/* Ticker */}
      <section className="mb-16">
        <Ticker signals={signals} />
      </section>

      {/* Portfolios */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <span className="w-1 h-8 bg-accent-green rounded-full"></span>
          Live Portfolios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PortfolioSnapshot portfolio={mainPortfolio} />
          <PortfolioSnapshot portfolio={smallPortfolio} />
        </div>
      </section>

      {/* Signals Grid */}
      <section>
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <span className="w-1 h-8 bg-accent-green rounded-full"></span>
          Latest Signals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {signals.map((signal) => (
            <SignalCard
              key={signal.symbol}
              signal={signal}
              marketData={marketDataList.find(m => m.symbol === signal.symbol)}
            />
          ))}
        </div>
      </section>
    </Layout>
  );
}
