// ============================================================
// Turtelli 2.0 — Signal Routes
// ============================================================

import type { FastifyInstance } from "fastify";

export async function signalRoutes(app: FastifyInstance) {
  // GET /api/signals — List all signals with filtering
  app.get("/", async (request, reply) => {
    // TODO: Implement signal listing with filters
    // Query params: status, direction, system, instrument, limit, offset
    return {
      signals: [],
      total: 0,
      limit: 50,
      offset: 0,
    };
  });

  // GET /api/signals/:id — Get single signal with full details
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: Implement signal detail with events
    return {
      signal: null,
      events: [],
    };
  });

  // GET /api/signals/active — Get all active signals
  app.get("/active", async () => {
    // TODO: Implement active signals query
    return {
      signals: [],
      counts: {
        discovered: 0,
        watching: 0,
        armed: 0,
        triggered: 0,
        open: 0,
      },
    };
  });

  // GET /api/signals/near-breakout — Near-breakout scanner
  app.get("/near-breakout", async (request, reply) => {
    const { limit, sortBy } = request.query as {
      limit?: number;
      sortBy?: string;
    };
    // TODO: Implement near-breakout scanner
    return {
      instruments: [],
      total: 0,
    };
  });
}
