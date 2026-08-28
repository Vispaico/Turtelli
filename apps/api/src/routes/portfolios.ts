// ============================================================
// Turtelli 2.0 — Portfolio Routes (live store backed)
// ============================================================

import type { FastifyInstance } from "fastify";
import { liveStore } from "../services/liveStore.js";

export async function portfolioRoutes(app: FastifyInstance) {
  // GET /api/portfolios — both portfolios summary
  app.get("/", async () => {
    return { portfolios: liveStore.listPortfolios() };
  });

  // GET /api/portfolios/:name — one portfolio detail
  app.get("/:name", async (request, reply) => {
    const { name } = request.params as { name: string };
    const p = liveStore.getPortfolio(name);
    if (!p) return reply.code(404).send({ error: "portfolio_not_found", name });

    const openPositions = liveStore.listPositions({
      portfolio: name,
      status: "OPEN",
    });
    const closed = liveStore.listPositions({ portfolio: name }).filter(
      (x) => x.status !== "OPEN"
    );
    const skips = liveStore.listSkips({ portfolio: name });

    const winners = closed.filter((t) => (t.realizedPnl ?? 0) > 0).length;
    const losers = closed.length - winners;

    return {
      portfolio: p,
      openPositions,
      closedTrades: closed,
      skips,
      stats: {
        totalTrades: closed.length,
        winners,
        losers,
        winRatePct:
          closed.length > 0
            ? Number(((winners / closed.length) * 100).toFixed(2))
            : null,
        realizedPnl: Number(
          closed.reduce((acc, t) => acc + (t.realizedPnl ?? 0), 0).toFixed(2)
        ),
      },
    };
  });

  // GET /api/portfolios/:name/trades — full ledger (winners AND losers)
  app.get("/:name/trades", async (request) => {
    const { name } = request.params as { name: string };
    const { status, limit } = request.query as {
      status?: string;
      limit?: string;
    };
    let trades = liveStore.listPositions({ portfolio: name });
    if (status === "open") trades = trades.filter((t) => t.status === "OPEN");
    if (status === "closed")
      trades = trades.filter((t) => t.status !== "OPEN");
    // Most recent first
    trades.sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    if (limit) trades = trades.slice(0, parseInt(limit, 10));
    return {
      trades,
      total: trades.length,
      disclaimer:
        "All trades shown, including losses. Portfolios are never reset.",
    };
  });
}
