// ============================================================
// Turtelli 2.0 — Database Seed
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create subscription plans
  const freePlan = await prisma.plan.upsert({
    where: { name: "free" },
    update: {},
    create: {
      name: "free",
      displayName: "Free",
      description: "Access to public portfolios and trade history",
      priceMonthly: 0,
      priceAnnual: 0,
      features: JSON.stringify({
        publicPortfolios: true,
        delayedSignals: true,
        closedTradeHistory: true,
        marketOverview: true,
        educationalContent: true,
      }),
      maxWatchlists: 5,
      maxAlerts: 10,
    },
  });

  const signalsPlan = await prisma.plan.upsert({
    where: { name: "signals" },
    update: {},
    create: {
      name: "signals",
      displayName: "Signals",
      description: "Timely LONG/SHORT signals with entries, stops, and exits",
      priceMonthly: 2900, // $29/month
      priceAnnual: 29000, // $290/year
      features: JSON.stringify({
        publicPortfolios: true,
        delayedSignals: false,
        closedTradeHistory: true,
        marketOverview: true,
        educationalContent: true,
        timelySignals: true,
        entries: true,
        stops: true,
        exits: true,
        notifications: true,
      }),
      maxWatchlists: 10,
      maxAlerts: 25,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: "pro" },
    update: {},
    create: {
      name: "pro",
      displayName: "Pro",
      description: "Full access including near-breakout scanner, AI research, and analytics",
      priceMonthly: 7900, // $79/month
      priceAnnual: 79000, // $790/year
      features: JSON.stringify({
        publicPortfolios: true,
        delayedSignals: false,
        closedTradeHistory: true,
        marketOverview: true,
        educationalContent: true,
        timelySignals: true,
        entries: true,
        stops: true,
        exits: true,
        notifications: true,
        nearBreakoutScanner: true,
        advancedAnalytics: true,
        aiResearchLayer: true,
        marketRegimes: true,
        watchlists: true,
        portfolioSizingTools: true,
        signalHistory: true,
      }),
      maxWatchlists: 50,
      maxAlerts: 100,
    },
  });

  // Create default portfolios
  const micro = await prisma.portfolio.upsert({
    where: { name: "TURTELLI_MICRO" },
    update: {},
    create: {
      name: "TURTELLI_MICRO",
      displayName: "Turtelli Micro",
      description: "Starting capital: $600 — demonstrates Turtle Trading with small capital",
      initialEquity: 600,
      currentEquity: 600,
      maxRiskPerTrade: 0.02,
      maxCorrelated: 2,
      maxTotalPositions: 6,
      allowFractional: false,
      commission: 0,
      slippage: 0.001,
    },
  });

  const standard = await prisma.portfolio.upsert({
    where: { name: "TURTELLI_STANDARD" },
    update: {},
    create: {
      name: "TURTELLI_STANDARD",
      displayName: "Turtelli Standard",
      description: "Starting capital: $10,000 — full Turtle Trading system",
      initialEquity: 10000,
      currentEquity: 10000,
      maxRiskPerTrade: 0.02,
      maxCorrelated: 3,
      maxTotalPositions: 12,
      allowFractional: true,
      commission: 0,
      slippage: 0.001,
    },
  });

  // Create default strategies
  const system1 = await prisma.strategy.upsert({
    where: { name_version: { name: "turtle_system_1", version: 1 } },
    update: {},
    create: {
      name: "turtle_system_1",
      displayName: "Turtle System 1",
      description: "20-day breakout with 10-day exit",
      version: 1,
      configHash: "abc123", // Will be calculated properly
      config: JSON.stringify({
        entry: { entryDays: 20, exitDays: 10, previousWinnerFilter: true },
        atr: { period: 20, smoothing: "wilder" },
        risk: { stopN: 2.0, pyramidIntervalN: 0.5, maxUnits: 4 },
        exit: { channelDays: 10 },
      }),
    },
  });

  const system2 = await prisma.strategy.upsert({
    where: { name_version: { name: "turtle_system_2", version: 1 } },
    update: {},
    create: {
      name: "turtle_system_2",
      displayName: "Turtle System 2",
      description: "55-day breakout with 20-day exit",
      version: 1,
      configHash: "def456",
      config: JSON.stringify({
        entry: { entryDays: 55, exitDays: 20, previousWinnerFilter: false },
        atr: { period: 20, smoothing: "wilder" },
        risk: { stopN: 2.0, pyramidIntervalN: 0.5, maxUnits: 4 },
        exit: { channelDays: 20 },
      }),
    },
  });

  // Create major US exchanges
  const exchanges = [
    { name: "NYSE", countryCode: "US", timezone: "America/New_York", currency: "USD" },
    { name: "NASDAQ", countryCode: "US", timezone: "America/New_York", currency: "USD" },
    { name: "AMEX", countryCode: "US", timezone: "America/New_York", currency: "USD" },
  ];

  for (const exchange of exchanges) {
    await prisma.exchange.upsert({
      where: { name: exchange.name },
      update: {},
      create: exchange,
    });
  }

  // Create initial instruments (major US stocks and ETFs)
  const instruments = [
    // Tech giants
    { symbol: "AAPL", name: "Apple Inc.", assetClass: "EQUITY", exchange: "NASDAQ", country: "US", currency: "USD", sector: "Technology", industry: "Consumer Electronics", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "MSFT", name: "Microsoft Corporation", assetClass: "EQUITY", exchange: "NASDAQ", country: "US", currency: "USD", sector: "Technology", industry: "Software", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "GOOGL", name: "Alphabet Inc.", assetClass: "EQUITY", exchange: "NASDAQ", country: "US", currency: "USD", sector: "Technology", industry: "Internet Content", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "AMZN", name: "Amazon.com Inc.", assetClass: "EQUITY", exchange: "NASDAQ", country: "US", currency: "USD", sector: "Consumer Cyclical", industry: "Internet Retail", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "NVDA", name: "NVIDIA Corporation", assetClass: "EQUITY", exchange: "NASDAQ", country: "US", currency: "USD", sector: "Technology", industry: "Semiconductors", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "META", name: "Meta Platforms Inc.", assetClass: "EQUITY", exchange: "NASDAQ", country: "US", currency: "USD", sector: "Technology", industry: "Social Media", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "TSLA", name: "Tesla Inc.", assetClass: "EQUITY", exchange: "NASDAQ", country: "US", currency: "USD", sector: "Consumer Cyclical", industry: "Auto Manufacturers", fractional: true, pricePrecision: 2, minQuantity: 1 },
    // ETFs
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: null, industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "QQQ", name: "Invesco QQQ Trust", assetClass: "ETF", exchange: "NASDAQ", country: "US", currency: "USD", sector: null, industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "IWM", name: "iShares Russell 2000 ETF", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: null, industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: null, industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: null, industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    // Sector ETFs
    { symbol: "XLF", name: "Financial Select Sector SPDR Fund", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: "Financial", industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "XLK", name: "Technology Select Sector SPDR Fund", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: "Technology", industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "XLE", name: "Energy Select Sector SPDR Fund", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: "Energy", industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "XLV", name: "Health Care Select Sector SPDR Fund", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: "Healthcare", industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "XLI", name: "Industrial Select Sector SPDR Fund", assetClass: "ETF", exchange: "NYSE", country: "US", currency: "USD", sector: "Industrials", industry: null, fractional: true, pricePrecision: 2, minQuantity: 1 },
    // Finance
    { symbol: "JPM", name: "JPMorgan Chase & Co.", assetClass: "EQUITY", exchange: "NYSE", country: "US", currency: "USD", sector: "Financial", industry: "Banking", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "BAC", name: "Bank of America Corp.", assetClass: "EQUITY", exchange: "NYSE", country: "US", currency: "USD", sector: "Financial", industry: "Banking", fractional: true, pricePrecision: 2, minQuantity: 1 },
    // Healthcare
    { symbol: "JNJ", name: "Johnson & Johnson", assetClass: "EQUITY", exchange: "NYSE", country: "US", currency: "USD", sector: "Healthcare", industry: "Pharmaceuticals", fractional: true, pricePrecision: 2, minQuantity: 1 },
    { symbol: "UNH", name: "UnitedHealth Group Inc.", assetClass: "EQUITY", exchange: "NYSE", country: "US", currency: "USD", sector: "Healthcare", industry: "Healthcare Plans", fractional: true, pricePrecision: 2, minQuantity: 1 },
  ];

  const nyse = await prisma.exchange.findUnique({ where: { name: "NYSE" } });
  const nasdaq = await prisma.exchange.findUnique({ where: { name: "NASDAQ" } });

  for (const inst of instruments) {
    const exchangeId = inst.exchange === "NASDAQ" ? nasdaq!.id : nyse!.id;
    const { exchange, ...rest } = inst;
    await prisma.instrument.upsert({
      where: { symbol: inst.symbol },
      update: {},
      create: {
        ...rest,
        exchangeId,
        providerMappings: JSON.stringify({
          polygon: inst.symbol,
          alphavantage: inst.symbol,
          yfinance: inst.symbol,
        }),
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log(`   - ${3} plans created`);
  console.log(`   - ${2} portfolios created`);
  console.log(`   - ${2} strategies created`);
  console.log(`   - ${exchanges.length} exchanges created`);
  console.log(`   - ${instruments.length} instruments created`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
