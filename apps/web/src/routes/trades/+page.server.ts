// ============================================================
// Turtelli 2.0 — Trades Page Server Load
// ============================================================

import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  // TODO: Fetch real trade data from API
  return {
    trades: [],
  };
};
