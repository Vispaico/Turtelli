# ADR-006: Use Prisma for Database ORM

## Status

Accepted

## Context

Turtelli needs a type-safe ORM for PostgreSQL database access.

## Decision

Use Prisma for database ORM.

## Consequences

### Positive
- Type-safe database queries
- Excellent migration system
- Good TypeScript integration
- Schema-first approach
- Good documentation

### Negative
- Generated client can be large
- Some advanced queries may need raw SQL
- Learning curve for complex relations

### Neutral
- Need to run `prisma generate` after schema changes
- Different query patterns than other ORMs

## Alternatives Considered

1. **TypeORM**: More traditional ORM, but less type-safe
2. **Drizzle**: More lightweight, but less mature
3. **Knex.js**: Query builder, not full ORM

## References

- [Prisma Documentation](https://www.prisma.io/docs)
