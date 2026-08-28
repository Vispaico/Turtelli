// ============================================================
// Turtelli 2.0 — Trades & Instruments Routes (live store backed)
// ============================================================

import type { FastifyInstance } from "fastify";
import { liveStore } from "../services/liveStore.js";

export async function tradeRoutes(app: FastifyInstance) {
  // GET /api/trades — public ledger across both portfolios
  app.get("/", async (request) => {
    const { portfolio, status, direction, limit } = request.query as {
      portfolio?: string;
      status?: string;
      direction?: string;
      limit?: string;
    };
    let trades = liveStore.listPositions({ portfolio });
    if (status === "open") trades = trades.filter((t) => t.status === "OPEN");
    if (status === "closed") trades = trades.filter((t) => t.status !== "OPEN");
    if (direction === "LONG" || direction === "SHORT")
      trades = trades.filter((t) => t.direction === direction);
    trades.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    if (limit) trades = trades.slice(0, parseInt(limit, 10));

    const closed = liveStore
      .listPositions()
      .filter((t) => t.status !== "OPEN");
    const winners = closed.filter((t) => (t.realizedPnl ?? 0) > 0).length;

    return {
      trades,
      total: trades.length,
      summary: {
        totalTrades: closed.length,
        winners,
        losers: closed.length - winners,
        winRatePct:
          closed.length > 0
            ? Number(((winners / closed.length) * 100).toFixed(2))
            : null,
      },
      disclaimer:
        "Every trade is public and permanent. Losses are never hidden.",
    };
  });

  // GET /api/trades/:portfolio/:symbol/:entryDate — permanent trade page data
  app.get("/:portfolio/:symbol/:entryDate", async (request, reply) => {
    const { portfolio, symbol, entryDate } = request.params as Record<
      string,
      string
    >;
    const trade = liveStore.getPosition(portfolio, symbol, entryDate);
    if (!trade) return reply.code(404).send({ error: "trade_not_found" });

    const signal = trade.signalId
      ? liveStore.getSignal(trade.signalId)
      : undefined;
    const skipsForSignal = liveStore
      .listSkips()
      .filter((s) => s.signalId === trade.signalId);

    return {
      trade,
      signal,
      timeline: [
        {
          event: "Breakout triggered",
          time: signal?.triggerDate ?? entryDate,
        },
        {
          event: `Position opened — ${trade.quantity} shares @ ${trade.entryPrice}`,
          time: trade.entryDate,
        },
        ...(trade.status !== "OPEN"
          ? [
              {
                event: `Position closed (${trade.closeReason}) @ ${trade.closedPrice}`,
                time: trade.closedDate ?? "",
              },
            ]
          : []),
      ],
      portfolioParticipation: {
        thisPortfolioExecuted: true,
        skipsInOtherPortfolio: skipsForSignal.map((s) => ({
          portfolio: s.portfolio,
          reason: s.reason,
        })),
      },
    };
  });
}
