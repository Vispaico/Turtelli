// ============================================================
// Turtelli 2.0 — Trade Routes
// ============================================================

import type { FastifyInstance } from "fastify";

export async function tradeRoutes(app: FastifyInstance) {
  // GET /api/trades — Public trade ledger (all portfolios)
  app.get("/", async (request, reply) => {
    const { limit, offset, direction, system } = request.query as {
      limit?: number;
      offset?: number;
      direction?: string;
      system?: string;
    };
    // TODO: Implement public trade ledger
    return {
      trades: [],
      total: 0,
      summary: {
        totalTrades: 0,
        winners: 0,
        losers: 0,
        winRate: 0,
        averageReturn: 0,
      },
    };
  });

  // GET /api/trades/:slug — Get individual trade by slug
  // e.g., /api/trades/nvda-long-2026-08-14
  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    // TODO: Implement trade detail page
    return {
      trade: null,
      timeline: [],
      aiExplanation: null,
    };
  });

  // GET /api/trades/stats — Aggregate trade statistics
  app.get("/stats/aggregate", async () => {
    // TODO: Implement aggregate stats
    return {
      micro: {
        totalTrades: 0,
        winners: 0,
        losers: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
      },
      standard: {
        totalTrades: 0,
        winners: 0,
        losers: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
      },
    };
  });
}
