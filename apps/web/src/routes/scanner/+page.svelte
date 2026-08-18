// ============================================================
// Turtelli 2.0 — Near-Breakout Scanner Page
// ============================================================

<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;

  // Mock data for now
  const instruments: Array<{
    symbol: string;
    direction: string;
    system: string;
    distancePercent: number;
    distanceAtr: number;
    breakoutLevel: number;
    currentPrice: number;
    atr: number;
  }> = [];

  let sortBy = "distance";
  let filterDirection = "all";
  let filterSystem = "all";
</script>

<svelte:head>
  <title>Turtelli — Near-Breakout Scanner</title>
</svelte:head>

<div class="mb-8">
  <h1 class="text-3xl font-bold text-neutral-50 mb-2">Near-Breakout Scanner</h1>
  <p class="text-neutral-400">Instruments approaching Turtle breakout levels</p>
</div>

<!-- Filters -->
<div class="flex items-center gap-4 mb-6">
  <select bind:value={sortBy} class="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-300">
    <option value="distance">Sort by Distance</option>
    <option value="atr">Sort by ATR Distance</option>
    <option value="symbol">Sort by Symbol</option>
  </select>
  <select bind:value={filterDirection} class="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-300">
    <option value="all">All Directions</option>
    <option value="LONG">Long</option>
    <option value="SHORT">Short</option>
  </select>
  <select bind:value={filterSystem} class="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-300">
    <option value="all">All Systems</option>
    <option value="system1">System 1 (20-day)</option>
    <option value="system2">System 2 (55-day)</option>
  </select>
</div>

<!-- Scanner Results -->
{#if instruments.length === 0}
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
    <span class="text-4xl mb-4 block">🔍</span>
    <h3 class="text-lg font-semibold text-neutral-300 mb-2">No Near-Breakout Instruments</h3>
    <p class="text-neutral-500">The scanner will populate after the first market scan completes.</p>
    <p class="text-xs text-neutral-600 mt-2">Monitoring {data.universeSize || 0} instruments in the universe</p>
  </div>
{:else}
  <div class="grid gap-4">
    {#each instruments as instrument}
      <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div>
              <div class="text-lg font-mono font-bold text-neutral-50">{instrument.symbol}</div>
              <div class="text-xs text-neutral-500">{instrument.system}</div>
            </div>
            <span class="px-2 py-1 rounded text-xs font-medium {instrument.direction === 'LONG' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}">
              {instrument.direction}
            </span>
          </div>
          <div class="text-right">
            <div class="text-lg font-mono text-neutral-300">
              {instrument.distancePercent.toFixed(2)}% from breakout
            </div>
            <div class="text-xs text-neutral-500">
              {instrument.distanceAtr.toFixed(2)} ATR away
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-mono text-neutral-400">
              Breakout: ${instrument.breakoutLevel.toFixed(2)}
            </div>
            <div class="text-sm font-mono text-neutral-400">
              Current: ${instrument.currentPrice.toFixed(2)}
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-neutral-500">ATR: ${instrument.atr.toFixed(2)}</div>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}
