# Turtelli 2.0 — Operations

## System Components

| Component | Port | Health Check |
|-----------|------|--------------|
| Web (SvelteKit) | 3000 | GET / |
| API (Fastify) | 3001 | GET /health |
| Admin | 3002 | GET / |
| PostgreSQL | 5432 | pg_isready |
| Redis | 6379 | redis-cli ping |
| Prometheus | 9090 | GET /-/healthy |
| Grafana | 3003 | GET /api/health |

## Daily Operations

### Market Close Routine
1. Verify daily scan completed
2. Check for data validation errors
3. Review new signals
4. Verify portfolio updates
5. Check notification delivery

### Morning Routine
1. Review overnight alerts
2. Check system health
3. Verify market data freshness
4. Review any failed jobs

## Monitoring

### Key Metrics
- Signals generated per day
- Trades executed
- Portfolio performance
- Market data latency
- Error rates
- Queue depth

### Alert Thresholds
- Database connection failures: immediate
- Market data provider down: immediate
- Worker queue > 100: warning
- Error rate > 5%: warning
- Disk space < 20%: warning
- SSL cert expiry < 30 days: warning

## Incident Response

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)

## Backup & Recovery

### Daily Backups
```bash
pg_dump -U turtelli turtelli | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore
```bash
gunzip -c backup_YYYYMMDD.sql.gz | psql -U turtelli turtelli
```

### Recovery Time Objective
- Database: 1 hour
- Full system: 4 hours

## Scaling

### Current Capacity
- 1,000 instruments
- 10,000 daily signals
- 100 concurrent users

### Growth Path
1. Add read replicas (database)
2. Add CDN (static assets)
3. Add load balancer (API)
4. Consider Kubernetes (if justified)
