// ============================================================
// Turtelli 2.0 — Homepage / Dashboard
// ============================================================

<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;

  // Mock data for now — will be replaced with real API calls
  const stats = {
    marketsScanned: 0,
    signalsDiscovered: 0,
    signalsArmed: 0,
    signalsTriggeredToday: 0,
    activePositions: 0,
    recentlyClosed: 0,
  };

  const portfolios = {
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
  };
</script>

<svelte:head>
  <title>Turtelli — Dashboard</title>
  <meta name="description" content="Turtelli 2.0 — Radical Transparency in Turtle Trading" />
</svelte:head>

<!-- Hero Section -->
<div class="text-center mb-12">
  <h1 class="text-4xl font-bold text-neutral-50 mb-4">
    🐢 Turtelli 2.0
  </h1>
  <p class="text-xl text-neutral-400 max-w-2xl mx-auto">
    Autonomous Turtle Trading with Radical Transparency
  </p>
  <p class="text-sm text-neutral-500 mt-2 font-mono">
    Last scan: No scans yet — system initializing
  </p>
</div>

<!-- Stats Grid -->
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
    <div class="text-2xl font-bold text-neutral-50">{stats.marketsScanned}</div>
    <div class="text-xs text-neutral-500 mt-1">Markets Scanned</div>
  </div>
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
    <div class="text-2xl font-bold text-blue-400">{stats.signalsDiscovered}</div>
    <div class="text-xs text-neutral-500 mt-1">Signals Discovered</div>
  </div>
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
    <div class="text-2xl font-bold text-yellow-400">{stats.signalsArmed}</div>
    <div class="text-xs text-neutral-500 mt-1">Signals Armed</div>
  </div>
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
    <div class="text-2xl font-bold text-green-400">{stats.signalsTriggeredToday}</div>
    <div class="text-xs text-neutral-500 mt-1">Triggered Today</div>
  </div>
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
    <div class="text-2xl font-bold text-purple-400">{stats.activePositions}</div>
    <div class="text-xs text-neutral-500 mt-1">Active Positions</div>
  </div>
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
    <div class="text-2xl font-bold text-neutral-400">{stats.recentlyClosed}</div>
    <div class="text-xs text-neutral-500 mt-1">Recently Closed</div>
  </div>
</div>

<!-- Portfolio Cards -->
<div class="grid md:grid-cols-2 gap-6 mb-12">
  <!-- Micro Portfolio -->
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-neutral-50">{portfolios.micro.name}</h2>
      <span class="text-xs font-mono text-neutral-500">$600 initial</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="text-3xl font-bold text-neutral-50 font-mono">
          ${portfolios.micro.equity.toFixed(2)}
        </div>
        <div class="text-xs text-neutral-500 mt-1">Current Equity</div>
      </div>
      <div>
        <div class="text-3xl font-bold font-mono {portfolios.micro.return >= 0 ? 'text-long' : 'text-short'}">
          {portfolios.micro.return >= 0 ? '+' : ''}{portfolios.micro.return.toFixed(2)}%
        </div>
        <div class="text-xs text-neutral-500 mt-1">Total Return</div>
      </div>
      <div>
        <div class="text-xl font-mono text-short">
          {portfolios.micro.drawdown.toFixed(2)}%
        </div>
        <div class="text-xs text-neutral-500 mt-1">Max Drawdown</div>
      </div>
      <div>
        <div class="text-xl font-mono text-neutral-300">
          {portfolios.micro.trades}
        </div>
        <div class="text-xs text-neutral-500 mt-1">Total Trades</div>
      </div>
    </div>
    <div class="mt-4 h-32 bg-neutral-800 rounded flex items-center justify-center">
      <span class="text-xs text-neutral-500">Equity curve will render here</span>
    </div>
  </div>

  <!-- Standard Portfolio -->
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-neutral-50">{portfolios.standard.name}</h2>
      <span class="text-xs font-mono text-neutral-500">$10,000 initial</span>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <div class="text-3xl font-bold text-neutral-50 font-mono">
          ${portfolios.standard.equity.toFixed(2)}
        </div>
        <div class="text-xs text-neutral-500 mt-1">Current Equity</div>
      </div>
      <div>
        <div class="text-3xl font-bold font-mono {portfolios.standard.return >= 0 ? 'text-long' : 'text-short'}">
          {portfolios.standard.return >= 0 ? '+' : ''}{portfolios.standard.return.toFixed(2)}%
        </div>
        <div class="text-xs text-neutral-500 mt-1">Total Return</div>
      </div>
      <div>
        <div class="text-xl font-mono text-short">
          {portfolios.standard.drawdown.toFixed(2)}%
        </div>
        <div class="text-xs text-neutral-500 mt-1">Max Drawdown</div>
      </div>
      <div>
        <div class="text-xl font-mono text-neutral-300">
          {portfolios.standard.trades}
        </div>
        <div class="text-xs text-neutral-500 mt-1">Total Trades</div>
      </div>
    </div>
    <div class="mt-4 h-32 bg-neutral-800 rounded flex items-center justify-center">
      <span class="text-xs text-neutral-500">Equity curve will render here</span>
    </div>
  </div>
</div>

<!-- Near-Breakout Scanner Preview -->
<div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-neutral-50">Near-Breakout Scanner</h2>
    <a href="/scanner" class="text-sm text-turtle-400 hover:text-turtle-300 transition-colors">
      View All →
    </a>
  </div>
  <div class="text-center py-8">
    <span class="text-4xl mb-4 block">🔍</span>
    <p class="text-neutral-400">No instruments near breakout yet</p>
    <p class="text-xs text-neutral-500 mt-2">System will populate after first market scan</p>
  </div>
</div>
