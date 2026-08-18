# Turtelli 2.0

**Radical Transparency in Turtle Trading**

Turtelli continuously monitors stocks, ETFs, and indices for legitimate Turtle Trading opportunities. Every signal is publicly executed in two virtual portfolios with full transparency — every trade, every loss, every skip is permanent.

## What is Turtelli?

- **Deterministic Trading Engine**: Implements the Turtle Trading methodology with zero human or AI discretion
- **Dual Virtual Portfolios**: $600 Micro and $10,000 Standard — never reset, always public
- **Radical Transparency**: Every trade is permanent. Losses are never hidden.
- **AI Research Layer**: TimesFM integration for research — never for trading decisions
- **Immutable Event Ledger**: Every state change is recorded forever

## Quick Start

```bash
# Clone
git clone https://github.com/Vispaico/turtelli.git
cd turtelli

# Setup
cp .env.example .env
pnpm install

# Start infrastructure
docker compose up -d postgres redis

# Initialize database
pnpm db:generate
pnpm db:migrate

# Start development
pnpm dev
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture.

### Tech Stack
- **Frontend**: SvelteKit, TypeScript, Tailwind CSS
- **API**: Fastify, TypeScript
- **Quant Engine**: Python, NumPy, Pandas
- **Database**: PostgreSQL + TimescaleDB
- **Cache/Queue**: Redis
- **Infrastructure**: Docker, Docker Compose

### Monorepo Structure
```
turtelli/
├── apps/
│   ├── web/           # SvelteKit frontend
│   ├── api/           # Fastify API server
│   ├── admin/         # Admin dashboard
│   └── quant-engine/  # Python trading engine
├── packages/
│   ├── db/            # Prisma schema & migrations
│   ├── types/         # TypeScript types
│   ├── strategy-config/ # Trading strategy config
│   ├── shared/        # Shared utilities
│   └── ui/            # Shared UI components
├── infrastructure/    # Docker, nginx, monitoring
├── tests/             # Integration & e2e tests
└── docs/              # Architecture decisions
```

## Trading Rules

See [TRADING_RULES.md](./TRADING_RULES.md) for complete Turtle Trading rules.

### System 1
- 20-day breakout entry
- 10-day opposite-channel exit
- Previous winner filter

### System 2
- 55-day breakout entry
- 20-day opposite-channel exit
- No previous winner filter

## Documentation

- [Architecture](./ARCHITECTURE.md)
- [Trading Rules](./TRADING_RULES.md)
- [Market Data](./MARKET_DATA.md)
- [Database](./DATABASE.md)
- [Security](./SECURITY.md)
- [Deployment](./DEPLOYMENT.md)
- [Research](./RESEARCH.md)
- [TimesFM](./TIMESFM.md)
- [AI Agents](./AGENTS.md)
- [Operations](./OPERATIONS.md)
- [Incident Response](./INCIDENT_RESPONSE.md)
- [Changelog](./CHANGELOG.md)

## Development

```bash
pnpm dev          # Start all services
pnpm test         # Run all tests
pnpm build        # Build for production
pnpm lint         # Lint all code
```

## Philosophy

Turtelli wins through:
- **Transparency**: Every trade is public
- **Discipline**: Rules are followed exactly
- **Auditability**: Every decision is recorded
- **Long-term results**: Compounding over time

**Never claim guaranteed profit. Never hide losses. Never fabricate backtests.**

## License

Private — All rights reserved.
