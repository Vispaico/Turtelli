// ============================================================
// Turtelli 2.0 — Individual Trade Page Server Load
// ============================================================

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const { slug } = params;
  // Trade detail is fetched client-side so it always reflects live store.
  return { slug };
};