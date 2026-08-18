# Turtelli 2.0 — Security

## Overview

Turtelli handles payments, accounts, subscriber data, financial signals, and AI agents. Security is a first-class requirement.

## Security Principles

1. **Least Privilege**: Every component has minimal required access
2. **Defense in Depth**: Multiple layers of protection
3. **Zero Trust**: Verify everything, trust nothing
4. **Transparency**: Security events are logged and auditable

## Authentication

- Password hashing: bcrypt with cost factor 12
- Session tokens: cryptographically random, stored hashed
- JWT tokens: RS256 signed, short expiry (15 min)
- Refresh tokens: rotating, stored hashed, 30-day expiry
- Rate limiting: 5 failed attempts → 15 min lockout

## Authorization

### Role Hierarchy
```
USER < SIGNALS < PRO < ADMIN
```

### Subscription-Gated Features
| Feature | FREE | SIGNALS | PRO | ADMIN |
|---------|------|---------|-----|-------|
| Public portfolios | ✅ | ✅ | ✅ | ✅ |
| Delayed signals | ✅ | ✅ | ✅ | ✅ |
| Closed trade history | ✅ | ✅ | ✅ | ✅ |
| Market overview | ✅ | ✅ | ✅ | ✅ |
| Timely signals | ❌ | ✅ | ✅ | ✅ |
| Notifications | ❌ | ✅ | ✅ | ✅ |
| Near-breakout scanner | ❌ | ❌ | ✅ | ✅ |
| AI research layer | ❌ | ❌ | ✅ | ✅ |
| Market regimes | ❌ | ❌ | ✅ | ✅ |
| Watchlists | ❌ | ❌ | ✅ | ✅ |
| System management | ❌ | ❌ | ❌ | ✅ |

## Data Protection

### At Rest
- Database: encrypted connections, encrypted backups
- Secrets: environment variables, never in code
- PII: encrypted at rest, minimally collected

### In Transit
- HTTPS everywhere (TLS 1.3)
- HSTS enabled
- Certificate pinning for mobile (future)

### API Security
- CSRF protection on state-changing endpoints
- Input validation on all endpoints
- Output encoding to prevent XSS
- SQL injection prevention (Prisma parameterized queries)
- Rate limiting per IP and per user
- Request size limits

## Secrets Management

- Never commit secrets to git
- Use `.env` files locally (gitignored)
- Use environment variables in production
- Rotate secrets quarterly
- Audit secret access

## AI Agent Security

Agents are sandboxed:
- Research agents: read-only access to market data
- Engineering agents: no production access
- Browser agents: no trust for scraped data
- All agents: no write access to trading decisions

## Webhook Security

- Stripe webhooks: signature verification required
- All webhooks: IP allowlisting where possible
- Payload validation before processing

## Dependency Scanning

- `npm audit` in CI pipeline
- `pip-audit` for Python dependencies
- Automated Dependabot/Renovate updates
- Critical vulnerabilities block deployment

## Incident Response

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)

## Security Checklist

- [ ] All secrets in environment variables
- [ ] No API keys in frontend code
- [ ] HTTPS enforced
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] Rate limiting configured
- [ ] Dependencies audited
- [ ] Container isolation verified
- [ ] Backup encryption enabled
