# Turtelli 2.0 — Deployment

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker & Docker Compose
- PostgreSQL 16 + TimescaleDB
- Redis 7+

## Local Development

### 1. Clone and install
```bash
git clone https://github.com/Vispaico/turtelli.git
cd turtelli
cp .env.example .env
pnpm install
```

### 2. Start infrastructure
```bash
docker compose up -d postgres redis
```

### 3. Initialize database
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4. Start development
```bash
pnpm dev
```

This starts:
- Web: http://localhost:3000
- API: http://localhost:3001
- Admin: http://localhost:3002
- Grafana: http://localhost:3003

### 5. Start quant engine
```bash
cd apps/quant-engine
python -m turtelli_quant.scanner
```

## Production Deployment

### Architecture
- VPS (Hetzner/DigitalOcean)
- Docker Compose for service management
- Nginx reverse proxy
- Let's Encrypt SSL
- PostgreSQL + TimescaleDB
- Redis
- Prometheus + Grafana monitoring

### Environment Variables
All configuration via environment variables. See `.env.example`.

### Database Migrations
```bash
pnpm db:migrate
```

### Monitoring
- Prometheus: metrics collection
- Grafana: dashboards and alerting
- Sentry: error tracking
- Structured logging: JSON logs for analysis

### Backups
- Daily PostgreSQL dumps
- Encrypted and stored offsite
- Monthly restore tests
- TimescaleDB continuous aggregates for historical data

## CI/CD

### Pipeline
1. Lint (TypeScript + Python)
2. Unit tests
3. Integration tests
4. Strategy tests
5. Build
6. Deploy (manual approval for production)

### Environments
- **Development**: Local Docker Compose
- **Staging**: Mirror of production
- **Production**: Live system

## Scaling Considerations

### Current (VPS)
- Single server
- Docker Compose
- Sufficient for initial launch

### Future (if needed)
- Separate API and worker servers
- Read replicas for database
- CDN for static assets
- Load balancer for API
- Kubernetes only if justified by actual scale

## Monitoring Stack

### Metrics
- System health: CPU, memory, disk
- Application: request latency, error rates
- Business: signals generated, trades executed
- Market data: provider latency, success rates

### Alerts
- Database connection failures
- Market data provider outages
- Worker queue backlog
- High error rates
- Disk space warnings
- SSL certificate expiry

### Dashboards
- System Overview
- Market Data Health
- Signal Activity
- Portfolio Performance
- User Activity
