# ADR-003: Use Python for Quant Engine

## Status

Accepted

## Context

Turtelli needs a quantitative trading engine for Turtle Trading calculations, backtesting, and research.

## Decision

Use Python for the quant engine.

## Consequences

### Positive
- Rich ecosystem for quantitative finance (NumPy, Pandas, SciPy)
- Excellent for research and experimentation
- Easy to prototype and iterate
- Good integration with ML/AI tools
- Clear separation from TypeScript API

### Negative
- Different language than API (requires inter-service communication)
- Slower than compiled languages for some operations
- GIL limitations for concurrent operations

### Neutral
- Need to manage Python dependencies separately
- Different deployment considerations

## Alternatives Considered

1. **TypeScript/Node.js**: Same language as API, but weaker quantitative libraries
2. **Rust**: Maximum performance, but slower development
3. **Julia**: Good for quant, but smaller ecosystem

## References

- [NumPy Documentation](https://numpy.org/)
- [Pandas Documentation](https://pandas.pydata.org/)
