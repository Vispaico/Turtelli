# Turtelli 2.0 — Architecture

## Overview

Turtelli is a production-quality Turtle Trading signal engine with radical transparency. It continuously monitors a universe of stocks, ETFs, and indices, detects legitimate Turtle Trading opportunities, and publicly executes every valid signal in two virtual portfolios.

## Design Principles

1. **Deterministic Trading Engine** — LLMs/AI may research and explain but never decide trades
2. **Radical Transparency** — Every trade, every loss, every skip is public and permanent
3. **Anti-Lookahead** — Never use future data in any calculation
4. **Immutable Event Ledger** — Every state change is recorded forever
5. **Provider Abstraction** — No tight coupling to any market data vendor

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    PUBLIC LAYER                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Dashboard │  │ Trade    │  │ AI Chat           │  │
│  │ (SvelteKit)│  │ Pages   │  │ (Grounded RAG)   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       └──────────────┼─────────────────┘             │
├──────────────────────┼──────────────────────────────┤
│                 API LAYER (Fastify)                   │
│  ┌──────────┐  ┌─────────┐  ┌────────────────────┐  │
│  │ REST API  │  │ WebSockets│ │ Admin API          │  │
│  └────┬─────┘  └────┬────┘  └────────┬───────────┘  │
├───────┼──────────────┼───────────────┼───────────────┤
│              CORE SERVICES                           │
│  ┌────────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Signal     │ │ Portfolio│ │ Event Ledger       │  │
│  │ Engine     │ │ Engine   │ │ (Immutable)        │  │
│  └─────┬──────┘ └────┬─────┘ └───────────────────┘  │
│        │              │                               │
│  ┌─────┴──────────────┴─────┐                        │
│  │   TURTLE ENGINE (Python)  │                        │
│  │   Deterministic rules     │                        │
│  │   Donchian channels       │                        │
│  │   ATR / N calculations    │                        │
│  │   Position sizing         │                        │
│  └──────────┬───────────────┘                        │
├─────────────┼────────────────────────────────────────┤
│            DATA LAYER                                │
│  ┌──────────┴───────┐  ┌──────────────────────────┐  │
│  │ PostgreSQL        │  │ Redis                     │  │
│  │ + TimescaleDB     │  │ (cache, queues, locks)    │  │
│  └──────────────────┘  └──────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│          MARKET DATA ABSTRACTION                      │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │ Polygon   │ │ AlphaVant.│ │ yfinance (free)     │  │
│  │ Adapter   │ │ Adapter   │ │ Adapter             │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
├──────────────────────────────────────────────────────┤
│          RESEARCH LAYER (AI/ML — Read Only)           │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │
│  │ TimesFM   │ │ Regime    │ │ Browser Agents      │  │
│  │ Forecasts │ │ Classifier│ │ (Research Only)     │  │
│  └──────────┘ └───────────┘ └────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Service Boundaries

### 1. Web App (`apps/web`)
- SvelteKit frontend
- Public dashboard, trade pages, near-breakout scanner
- AI chat interface
- Uses API layer for all data

### 2. API Server (`apps/api`)
- Fastify REST API + WebSocket
- Authentication, authorization
- Subscription management
- All business logic entry point

### 3. Admin Dashboard (`apps/admin`)
- System health monitoring
- Signal management
- Portfolio oversight
- User management

### 4. Quant Engine (`apps/quant-engine`)
- Python-based Turtle Trading rules
- Donchian channel calculations
- ATR / N calculations
- Position sizing
- Backtesting engine
- Runs as independent service via Redis queues

### 5. Shared Packages (`packages/`)
- `db` — Prisma schema, migrations, client
- `types` — TypeScript type definitions
- `strategy-config` — Turtle strategy configuration
- `shared` — Shared utilities
- `ui` — Shared UI components

## Data Flow: Daily Scan

```
1. Scheduler triggers daily scan (after market close)
2. Fetch daily OHLCV for universe from market data provider
3. Validate data (duplicates, gaps, impossible values)
4. Quant engine calculates Donchian channels + ATR for each instrument
5. Signal engine checks for breakouts
6. For each valid signal:
   a. Create signal event (DISCOVERED)
   b. Update monitoring state
   c. For each portfolio:
      - Check affordability
      - Calculate position size
      - Check risk limits
      - If valid: create fill, record in ledger
      - If invalid: record skip reason
7. Update dashboard data
8. Send notifications
9. Record all events in immutable ledger
```

## Data Flow: Intraday Monitoring

```
1. Adaptive scheduler polls instruments based on state
2. NORMAL: daily only (after close)
3. WATCHING: every 15 min
4. NEAR_TRIGGER: every 1-5 min
5. ACTIVE_POSITION: every 1 min
6. NEAR_EXIT: every 30 sec or real-time
7. On price update: recalculate if breakout triggered
8. On trigger: execute trade in both portfolios
```

## Security Boundaries

- **Public**: Dashboard, trade pages (read-only)
- **Authenticated**: Watchlists, notifications, AI chat
- **Subscriber**: Timely signals, near-breakout scanner, advanced analytics
- **Admin**: System management, user management
- **AI Agents**: Read-only access to research data, no write access to trading decisions

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | SvelteKit | Lightweight, fast, good DX |
| API | Fastify | High performance, TypeScript native |
| Quant Engine | Python | NumPy/Pandas ecosystem, research tooling |
| Database | PostgreSQL + TimescaleDB | Time-series optimized, reliable |
| Cache/Queue | Redis | Battle-tested, fast |
| Monorepo | Turborepo + pnpm | Efficient builds, shared code |
| ORM | Prisma | Type-safe, migration management |

## Anti-Lookahead Rules

1. When calculating today's signal, only use data available at market close yesterday
2. Channel highs/lows exclude today's price
3. ATR uses completed bars only
4. Stops are calculated at entry, not adjusted retroactively
5. Automated tests specifically verify no future data leakage
