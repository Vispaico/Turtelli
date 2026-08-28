// ============================================================
// Turtelli 2.0 — Internal Ingest Routes (quant engine -> API)
// ============================================================

import type { FastifyInstance } from "fastify";
import {
  liveStore,
  type SignalRecord,
  type PositionRecord,
  type SkipRecord,
  type PortfolioSnapshot,
  type ScanStatus,
} from "../services/liveStore.js";

export async function ingestRoutes(app: FastifyInstance) {
  // POST /internal/ingest — quant engine pushes scan/trade output here.
  // SECURITY: protected by INGEST_TOKEN shared secret (x-ingest-token header).
  app.post("/ingest", async (request, reply) => {
    const token = request.headers["x-ingest-token"];
    const expected = process.env.INGEST_TOKEN;
    if (!expected || token !== expected) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const body = request.body as {
      signals?: SignalRecord[];
      positions?: PositionRecord[];
      skips?: SkipRecord[];
      portfolios?: PortfolioSnapshot[];
      scanStatus?: ScanStatus;
    };

    if (body.signals) await liveStore.ingestSignals(body.signals);
    if (body.positions)
      for (const p of body.positions) await liveStore.ingestPosition(p);
    if (body.skips) for (const s of body.skips) await liveStore.ingestSkip(s);
    if (body.portfolios)
      for (const p of body.portfolios)
        await liveStore.ingestPortfolioSnapshot(p);
    if (body.scanStatus) await liveStore.ingestScanStatus(body.scanStatus);

    return {
      ok: true,
      ingested: {
        signals: body.signals?.length ?? 0,
        positions: body.positions?.length ?? 0,
        skips: body.skips?.length ?? 0,
        portfolios: body.portfolios?.length ?? 0,
      },
    };
  });
}
