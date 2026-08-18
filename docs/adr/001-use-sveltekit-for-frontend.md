# ADR-001: Use SvelteKit for Frontend

## Status

Accepted

## Context

Turtelli needs a modern frontend framework for the public dashboard, trade pages, and admin interface.

## Decision

Use SvelteKit for the frontend.

## Consequences

### Positive
- Lightweight and fast (no virtual DOM overhead)
- Excellent TypeScript support
- Built-in routing and SSR
- Small bundle sizes
- Good DX with hot module replacement

### Negative
- Smaller ecosystem than React/Next.js
- Fewer pre-built components
- May need custom solutions for some UI patterns

### Neutral
- Team needs to learn Svelte (if unfamiliar)
- Component library choices are more limited

## Alternatives Considered

1. **Next.js/React**: Larger ecosystem, more components, but heavier runtime
2. **Vue/Nuxt**: Good DX, but Svelte is more lightweight
3. **Vanilla TypeScript**: Maximum control, but too much boilerplate

## References

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Svelte vs React Performance](https://krausest.github.io/js-framework-benchmark/)
