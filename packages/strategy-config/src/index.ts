// ============================================================
// Turtelli 2.0 — Strategy Configuration Types
// ============================================================

import type { TurtleConfig } from "./types";
import defaultConfig from "./turtle-defaults.json";

export type { TurtleConfig } from "./types";

export function getDefaultConfig(): TurtleConfig {
  return defaultConfig as TurtleConfig;
}

export function getConfigHash(config: TurtleConfig): string {
  // Deterministic hash for strategy versioning
  const crypto = require("crypto");
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(config, Object.keys(config).sort()))
    .digest("hex")
    .slice(0, 16);
}
