# Turtelli 2.0 — Changelog

All notable changes to Turtelli will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-08-17

### Added
- Initial architecture design
- Repository scaffold
- Database schema (Prisma)
- Strategy configuration
- Market data provider interface
- Core type definitions
- Docker Compose for local development
- CI/CD pipeline
- Documentation:
  - ARCHITECTURE.md
  - TRADING_RULES.md
  - MARKET_DATA.md
  - SECURITY.md
  - DEPLOYMENT.md
  - DATABASE.md
  - RESEARCH.md
  - TIMESFM.md
  - AGENTS.md
  - OPERATIONS.md
  - INCIDENT_RESPONSE.md
  - CHANGELOG.md

### Decisions
- SvelteKit for frontend (lightweight, fast)
- Fastify for API (high performance)
- Python for quant engine (NumPy/Pandas ecosystem)
- PostgreSQL + TimescaleDB (time-series optimized)
- Turborepo for monorepo management
- Prisma for database ORM

### Pending
- [ ] Authentication implementation
- [ ] Market data adapters
- [ ] Turtle engine implementation
- [ ] Portfolio engine
- [ ] Signal state machine
- [ ] Event ledger
- [ ] Public dashboard
- [ ] Trade pages
- [ ] Notifications
- [ ] Payment integration
- [ ] AI chat interface
