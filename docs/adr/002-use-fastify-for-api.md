# ADR-002: Use Fastify for API

## Status

Accepted

## Context

Turtelli needs a high-performance API server for the public dashboard, trade pages, and admin interface.

## Decision

Use Fastify for the API server.

## Consequences

### Positive
- High performance (2x faster than Express in benchmarks)
- Native TypeScript support
- Schema-based validation
- Plugin architecture
- Good plugin ecosystem

### Negative
- Smaller community than Express
- Fewer middleware options
- May need custom solutions for some patterns

### Neutral
- Different API patterns than Express
- Need to learn Fastify-specific concepts

## Alternatives Considered

1. **Express**: Larger ecosystem, but slower performance
2. **NestJS**: More structured, but heavier and more complex
3. **Hono**: Very fast, but newer and less mature

## References

- [Fastify Documentation](https://fastify.dev/)
- [Fastify vs Express Benchmarks](https://fastify.dev/docs/latest/Benchmarks/)
