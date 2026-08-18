# ADR-005: Use Turborepo for Monorepo

## Status

Accepted

## Context

Turtelli is a monorepo with multiple apps and packages that share code.

## Decision

Use Turborepo for monorepo management.

## Consequences

### Positive
- Fast incremental builds
- Efficient caching
- Good TypeScript support
- Easy to add new packages
- Works well with pnpm

### Negative
- Additional tooling to learn
- May have edge cases with complex dependency graphs

### Neutral
- Need to configure build pipeline
- Different from other monorepo tools

## Alternatives Considered

1. **Nx**: More features, but heavier
2. **Lerna**: Older, less actively maintained
3. **Rush**: Microsoft-backed, but more complex

## References

- [Turborepo Documentation](https://turbo.build/repo)
