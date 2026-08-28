// ============================================================
// Turtelli 2.0 — Signal Routes (live store backed)
// ============================================================

import type { FastifyInstance } from "fastify";
import { liveStore } from "../services/liveStore.js";

export async function signalRoutes(app: FastifyInstance) {
  // GET /api/signals — list signals with filtering
  app.get("/", async (request) => {
    const { state, direction, limit } = request.query as {
      state?: string;
      direction?: "LONG" | "SHORT";
      limit?: string;
    };
    const signals = liveStore.listSignals({
      state: state as never,
      direction,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    return {
      signals,
      total: signals.length,
    };
  });

  // GET /api/signals/active — counts by state + active list
  app.get("/active", async () => {
    const active = liveStore.listSignals().filter((s) =>
      ["DISCOVERED", "WATCHING", "NEAR_TRIGGER", "TRIGGERED", "OPEN"].includes(
        s.state
      )
    );
    const counts: Record<string, number> = {};
    for (const s of liveStore.listSignals()) {
      counts[s.state] = (counts[s.state] || 0) + 1;
    }
    return { signals: active, counts };
  });

  // GET /api/signals/near-breakout — scanner
  app.get("/near-breakout", async (request) => {
    const { maxDistancePct, limit } = request.query as {
      maxDistancePct?: string;
      limit?: string;
    };
    const instruments = liveStore.nearBreakout(
      maxDistancePct ? parseFloat(maxDistancePct) : 5
    );
    return {
      instruments: typeof limit === "string"
        ? instruments.slice(0, parseInt(limit, 10))
        : instruments,
      total: instruments.length,
    };
  });

  // GET /api/signals/:id — single signal detail
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const signal = liveStore.getSignal(id);
    if (!signal) {
      return reply.code(404).send({ error: "signal_not_found", id });
    }
    return { signal };
  });
}
