// ============================================================
// Turtelli 2.0 — Individual Trade Page
// ============================================================

<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;

  // Mock data for now
  const trade = {
    instrument: "NVDA",
    direction: "LONG",
    system: "System 1",
    status: "OPEN",
    entryPrice: 120.50,
    currentPrice: 125.30,
    exitLevel: 115.20,
    initialStop: 112.50,
    currentStop: 118.00,
    returnPercent: 3.98,
    holdingDays: 5,
    entryDate: "2026-08-14",
    triggeredAt: "2026-08-14T15:45:00Z",
    discoveredAt: "2026-08-12T16:00:00Z",
    aiScore: 72,
    marketRegime: "TRENDING_UP",
  };

  const timeline = [
    { time: "2026-08-12T16:00:00Z", event: "Signal discovered", icon: "🔍" },
    { time: "2026-08-13T16:00:00Z", event: "Approaching breakout (0.18% away)", icon: "👀" },
    { time: "2026-08-14T15:45:00Z", event: "Breakout triggered at $120.50", icon: "🎯" },
    { time: "2026-08-14T15:45:00Z", event: "Position opened — 83 shares @ $120.50", icon: "📈" },
  ];
</script>

<svelte:head>
  <title>Turtelli — {trade.instrument} {trade.direction}</title>
</svelte:head>

<!-- Breadcrumb -->
<div class="text-sm text-neutral-500 mb-6">
  <a href="/trades" class="hover:text-neutral-300 transition-colors">Trades</a>
  <span class="mx-2">→</span>
  <span class="text-neutral-300">{trade.instrument} {trade.direction} {trade.entryDate}</span>
</div>

<!-- Trade Header -->
<div class="flex items-start justify-between mb-8">
  <div>
    <div class="flex items-center gap-3 mb-2">
      <h1 class="text-3xl font-bold text-neutral-50">{trade.instrument}</h1>
      <span class="px-3 py-1 rounded text-sm font-medium {trade.direction === 'LONG' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}">
        {trade.direction}
      </span>
      <span class="px-3 py-1 rounded text-sm font-medium bg-neutral-800 text-neutral-300">
        {trade.system}
      </span>
      <span class="px-3 py-1 rounded text-sm font-medium {trade.status === 'OPEN' ? 'bg-blue-900/50 text-blue-400' : 'bg-neutral-800 text-neutral-400'}">
        {trade.status}
      </span>
    </div>
    <p class="text-neutral-400">
      Detected {trade.discoveredAt} · Triggered {trade.triggeredAt}
    </p>
  </div>
  <div class="text-right">
    <div class="text-3xl font-bold font-mono {trade.returnPercent >= 0 ? 'text-long' : 'text-short'}">
      {trade.returnPercent >= 0 ? '+' : ''}{trade.returnPercent.toFixed(2)}%
    </div>
    <div class="text-sm text-neutral-500 mt-1">{trade.holdingDays} days holding</div>
  </div>
</div>

<div class="grid lg:grid-cols-3 gap-6">
  <!-- Left Column: Chart + Details -->
  <div class="lg:col-span-2 space-y-6">
    <!-- Chart -->
    <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-neutral-50 mb-4">Price Chart</h2>
      <div class="h-80 bg-neutral-800 rounded flex items-center justify-center">
        <span class="text-neutral-500">TradingView chart will render here</span>
      </div>
    </div>

    <!-- Trade Details -->
    <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-neutral-50 mb-4">Trade Details</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div class="text-xs text-neutral-500 mb-1">Entry Price</div>
          <div class="text-lg font-mono text-neutral-50">${trade.entryPrice.toFixed(2)}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">Current Price</div>
          <div class="text-lg font-mono text-neutral-50">${trade.currentPrice.toFixed(2)}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">Initial Stop</div>
          <div class="text-lg font-mono text-short">${trade.initialStop.toFixed(2)}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">Current Stop</div>
          <div class="text-lg font-mono text-short">${trade.currentStop.toFixed(2)}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">Exit Level</div>
          <div class="text-lg font-mono text-neutral-50">${trade.exitLevel.toFixed(2)}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">System</div>
          <div class="text-lg font-mono text-neutral-50">{trade.system}</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">AI Score</div>
          <div class="text-lg font-mono text-turtle-400">{trade.aiScore}/100</div>
        </div>
        <div>
          <div class="text-xs text-neutral-500 mb-1">Market Regime</div>
          <div class="text-lg font-mono text-neutral-50">{trade.marketRegime}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Right Column: Timeline + Explanation -->
  <div class="space-y-6">
    <!-- Timeline -->
    <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-neutral-50 mb-4">Timeline</h2>
      <div class="space-y-4">
        {#each timeline as event}
          <div class="flex items-start gap-3">
            <span class="text-lg">{event.icon}</span>
            <div>
              <div class="text-sm text-neutral-300">{event.event}</div>
              <div class="text-xs text-neutral-500">{event.time}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- AI Explanation -->
    <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-neutral-50 mb-4">Explanation</h2>
      <p class="text-sm text-neutral-400 leading-relaxed">
        NVDA triggered a System 1 LONG signal because its price crossed the previous 20-session high of ${trade.entryPrice.toFixed(2)}.
        ATR(20) at the trigger was $5.00.
        The initial stop according to the configured 2N rule was ${trade.initialStop.toFixed(2)}.
      </p>
      <div class="mt-4 p-3 bg-neutral-800 rounded">
        <div class="text-xs text-neutral-500 mb-1">AI Research Score</div>
        <div class="text-2xl font-bold text-turtle-400">{trade.aiScore}/100</div>
        <div class="text-xs text-neutral-500 mt-1">This score is informational only and never represents certainty.</div>
      </div>
    </div>

    <!-- Portfolio Participation -->
    <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-neutral-50 mb-4">Portfolio Participation</h2>
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 bg-neutral-800 rounded">
          <span class="text-sm text-neutral-300">Turtelli Micro</span>
          <span class="text-sm font-mono text-neutral-500">Participated</span>
        </div>
        <div class="flex items-center justify-between p-3 bg-neutral-800 rounded">
          <span class="text-sm text-neutral-300">Turtelli Standard</span>
          <span class="text-sm font-mono text-neutral-500">Participated</span>
        </div>
      </div>
    </div>
  </div>
</div>
