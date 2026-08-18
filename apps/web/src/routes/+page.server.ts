// ============================================================
// Turtelli 2.0 — Page Load Function
// ============================================================

import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  // TODO: Fetch real data from API
  // For now, return empty data
  return {
    stats: {
      marketsScanned: 0,
      signalsDiscovered: 0,
      signalsArmed: 0,
      signalsTriggeredToday: 0,
      activePositions: 0,
      recentlyClosed: 0,
    },
    portfolios: {
      micro: {
        name: "Turtelli Micro",
        equity: 600,
        return: 0,
        drawdown: 0,
        trades: 0,
      },
      standard: {
        name: "Turtelli Standard",
        equity: 10000,
        return: 0,
        drawdown: 0,
        trades: 0,
      },
    },
  };
};
