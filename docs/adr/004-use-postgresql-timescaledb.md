# ADR-004: Use PostgreSQL + TimescaleDB

## Status

Accepted

## Context

Turtelli needs a database for market data, signals, positions, and user data. Market data is time-series data that requires efficient querying.

## Decision

Use PostgreSQL with TimescaleDB extension.

## Consequences

### Positive
- ACID compliance for transactional data
- TimescaleDB for efficient time-series queries
- Mature and reliable
- Good ecosystem and tooling
- Extensible with custom functions

### Negative
- More complex than SQLite for development
- Requires separate database server
- TimescaleDB adds operational complexity

### Neutral
- Need to learn TimescaleDB-specific features
- Different backup/restore procedures

## Alternatives Considered

1. **SQLite**: Simpler, but not suitable for production workloads
2. **MongoDB**: Flexible schema, but weaker consistency guarantees
3. **ClickHouse**: Fast for analytics, but weaker for transactional data

## References

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
