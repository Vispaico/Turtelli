# Turtelli 2.0 — Database

## Overview

PostgreSQL 16 with TimescaleDB extension for time-series optimization.

## Schema Design Principles

1. **Immutable events**: Signal and portfolio events are never modified
2. **Full audit trail**: Every state change recorded
3. **Time-series optimized**: Daily bars use TimescaleDB hypertables
4. **Referential integrity**: Foreign keys enforced
5. **Strategic indexing**: Optimized for common query patterns

## Core Tables

### Authentication
- `User` — User accounts
- `Session` — Active sessions
- `Plan` — Subscription plans
- `Subscription` — User subscriptions

### Market Data
- `Exchange` — Trading venues
- `Instrument` — Stocks, ETFs, indices
- `DailyBar` — Daily OHLCV (TimescaleDB hypertable)
- `IntradayBar` — Intraday OHLCV
- `CorporateAction` — Splits, dividends, etc.

### Trading
- `Strategy` — Strategy definitions with versions
- `Signal` — Detected trading opportunities
- `SignalEvent` — Immutable signal state changes
- `Position` — Open/closed positions
- `PositionEvent` — Position state changes
- `Fill` — Simulated trade fills

### Portfolio
- `Portfolio` — TURTELLI_MICRO, TURTELLI_STANDARD
- `PortfolioSnapshot` — Daily equity snapshots
- `PortfolioEvent` — Portfolio state changes
- `TradeLedger` — Public trade history
- `TradeSkipped` — Record of skipped trades

### Research
- `MarketRegime` — Regime classification
- `TimesfmForecast` — TimesFM predictions
- `ResearchExperiment` — Research experiments

### Notifications
- `NotificationPreference` — User notification settings
- `NotificationLog` — Delivery tracking

### System
- `SystemHealth` — Component health status
- `AuditLog` — Security audit trail
- `DataValidationEvent` — Data quality issues

## Migrations

Managed by Prisma Migrate:
```bash
pnpm db:migrate        # Apply pending migrations
pnpm db:generate       # Generate Prisma client
pnpm db:studio         # Open Prisma Studio
pnpm db:seed           # Seed initial data
```

## Query Patterns

### Daily Scan (most frequent)
```sql
-- Get latest bars for universe
SELECT * FROM daily_bar
WHERE instrument_id = $1
ORDER BY date DESC
LIMIT 60;  -- need 55 days for System 2
```

### Signal Dashboard
```sql
-- Active signals with current status
SELECT s.*, i.symbol, i.name
FROM signal s
JOIN instrument i ON s.instrument_id = i.id
WHERE s.status IN ('DISCOVERED', 'WATCHING', 'ARMED', 'OPEN')
ORDER BY s.discovered_at DESC;
```

### Portfolio Performance
```sql
-- Daily equity curve
SELECT date, equity, total_return, drawdown
FROM portfolio_snapshot
WHERE portfolio_id = $1
ORDER BY date DESC;
```

### Trade Ledger (public)
```sql
-- Complete trade history
SELECT * FROM trade_ledger
WHERE portfolio_id = $1
ORDER BY entry_date DESC;
```

## Backup Strategy

- **Daily**: Full PostgreSQL dump
- **Hourly**: WAL archiving for point-in-time recovery
- **Monthly**: Offsite encrypted backup
- **Restore test**: Quarterly

## Performance

### Indexes
- `DailyBar`: instrument_id + date (composite, DESC)
- `Signal`: status + discovered_at (for dashboard)
- `Position`: portfolio_id + status (for portfolio view)
- `TradeLedger`: portfolio_id + entry_date (for public ledger)

### TimescaleDB
- Daily bars partitioned by date
- Continuous aggregates for common queries
- Compression for historical data (>1 year)
- Retention policies for raw data
