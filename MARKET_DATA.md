# Turtelli 2.0 — Market Data Architecture

## Provider Abstraction

Turtelli uses a provider abstraction pattern. The rest of the system never knows which market data vendor is underneath.

### Interface

```typescript
interface MarketDataProvider {
  getDailyBars(symbol, options): Promise<DailyBar[]>
  getIntradayBars(symbol, options): Promise<IntradayBar[]>
  getCurrentPrice(symbol): Promise<PriceQuote>
  getCorporateActions(symbol, options): Promise<CorporateAction[]>
  getInstrumentMetadata(symbol): Promise<InstrumentMetadata>
  getMarketCalendar(year): Promise<MarketHoliday[]>
  getTradingStatus(symbol): Promise<TradingStatus>
}
```

### Adapters

| Provider | Free Tier | Real-Time | History | Rate Limit |
|----------|-----------|-----------|---------|------------|
| yfinance | Yes | No (15m delay) | 20+ years | Unlimited* |
| Alpha Vantage | Yes (25 req/day) | No | 20+ years | 25/day free |
| Polygon.io | Yes (5 req/min) | Yes (paid) | 2+ years free | 5/min free |

*yfinance is unofficial and may be rate-limited by Yahoo

### Provider Selection

Configure via environment variable:
```
MARKET_DATA_PROVIDER=polygon|alphavantage|yfinance
```

### Data Validation

Every bar received from a provider is validated before use:

1. **Duplicate Detection**: Same timestamp + symbol = reject
2. **Missing Sessions**: Check for gaps in trading days
3. **Impossible Prices**: High < Low, Close = 0, etc.
4. **Abnormal Moves**: >50% daily change triggers warning
5. **Stale Prices**: Timestamp older than expected
6. **Volume Check**: Zero volume on active instrument

### Corporate Actions

Handled automatically:
- Stock splits: adjust all historical prices
- Dividends: record cash, adjust prices
- Symbol changes: update mappings
- Delistings: force-close positions

### Two-Speed Data System

Monitoring frequency adapts to instrument state:

| State | Frequency | Data Type |
|-------|-----------|-----------|
| NORMAL | Daily | OHLCV after close |
| WATCHING | 15 min | Current price |
| NEAR_TRIGGER | 1-5 min | Current price |
| ACTIVE_POSITION | 1 min | Current price + OHLCV |
| NEAR_EXIT | Real-time | Full tick data |
