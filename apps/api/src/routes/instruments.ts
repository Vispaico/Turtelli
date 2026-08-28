// ============================================================
// Turtelli 2.0 — Instrument & System Routes (live store backed)
// ============================================================

import type { FastifyInstance } from "fastify";
import { liveStore } from "../services/liveStore.js";

export async function instrumentRoutes(app: FastifyInstance) {
  // GET /api/instruments/scan-status — health of the nightly scan
  app.get("/scan-status", async () => {
    const s = liveStore.getScanStatus();
    return {
      ...s,
      healthy:
        s.lastScanAt !== null &&
        Date.now() - new Date(s.lastScanAt).getTime() < 36 * 3600 * 1000,
    };
  });

  // GET /api/instruments/universe-states — per-symbol monitoring states
  app.get("/universe-states", async () => {
    const scan = liveStore.getScanStatus();
    return { states: scan.states, asOf: scan.lastScanAt };
  });
}
