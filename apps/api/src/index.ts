// ============================================================
// Turtelli 2.0 — API Server Entry Point
// ============================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { healthRoutes } from "./routes/health.js";
import { ingestRoutes } from "./routes/ingest.js";
import { signalRoutes } from "./routes/signals.js";
import { portfolioRoutes } from "./routes/portfolios.js";
import { instrumentRoutes } from "./routes/instruments.js";
import { tradeRoutes } from "./routes/trades.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // --- Plugins ---
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === "production",
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // --- Routes ---
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(ingestRoutes, { prefix: "/internal" });
  await app.register(signalRoutes, { prefix: "/api/signals" });
  await app.register(portfolioRoutes, { prefix: "/api/portfolios" });
  await app.register(instrumentRoutes, { prefix: "/api/instruments" });
  await app.register(tradeRoutes, { prefix: "/api/trades" });

  // --- Start ---
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Turtelli API running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
