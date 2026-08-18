// ============================================================
// Turtelli 2.0 — Individual Trade Page Server Load
// ============================================================

import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params }) => {
  const { slug } = params;

  // TODO: Fetch real trade data from API
  // For now, return empty data
  return {
    slug,
    trade: null,
    timeline: [],
  };
};
