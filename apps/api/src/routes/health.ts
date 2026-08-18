// ============================================================
// Turtelli 2.0 — Health Check Routes
// ============================================================

import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
  });

  app.get("/ready", async () => {
    // TODO: Check database, Redis, market data provider
    return {
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        redis: "ok",
        marketData: "ok",
      },
    };
  });
}
