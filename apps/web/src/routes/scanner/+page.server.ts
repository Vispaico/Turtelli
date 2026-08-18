// ============================================================
// Turtelli 2.0 — Scanner Page Server Load
// ============================================================

import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  // TODO: Fetch real scanner data from API
  return {
    instruments: [],
    universeSize: 0,
  };
};
