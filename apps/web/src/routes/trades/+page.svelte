// ============================================================
// Turtelli 2.0 — Trades Page
// ============================================================

<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;

  // Mock data for now
  const trades: Array<{
    id: string;
    slug: string;
    instrument: string;
    direction: string;
    system: string;
    entryPrice: number;
    exitPrice: number | null;
    returnPercent: number | null;
    status: string;
    entryDate: string;
  }> = [];
</script>

<svelte:head>
  <title>Turtelli — Trade Ledger</title>
</svelte:head>

<div class="mb-8">
  <h1 class="text-3xl font-bold text-neutral-50 mb-2">Trade Ledger</h1>
  <p class="text-neutral-400">Every trade, every loss, every skip — permanent and public.</p>
</div>

<!-- Filters -->
<div class="flex items-center gap-4 mb-6">
  <select class="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-300">
    <option value="all">All Systems</option>
    <option value="system1">System 1</option>
    <option value="system2">System 2</option>
  </select>
  <select class="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-300">
    <option value="all">All Directions</option>
    <option value="long">Long</option>
    <option value="short">Short</option>
  </select>
  <select class="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-300">
    <option value="all">Both Portfolios</option>
    <option value="micro">Micro ($600)</option>
    <option value="standard">Standard ($10,000)</option>
  </select>
</div>

<!-- Trade Table -->
{#if trades.length === 0}
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
    <span class="text-4xl mb-4 block">📊</span>
    <h3 class="text-lg font-semibold text-neutral-300 mb-2">No Trades Yet</h3>
    <p class="text-neutral-500">The system will begin trading once market data is connected and the first scan completes.</p>
  </div>
{:else}
  <div class="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
    <table class="w-full">
      <thead>
        <tr class="border-b border-neutral-800">
          <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Instrument</th>
          <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Direction</th>
          <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">System</th>
          <th class="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Entry</th>
          <th class="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Exit</th>
          <th class="text-right px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Return</th>
          <th class="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each trades as trade}
          <tr class="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
            <td class="px-4 py-3">
              <a href="/trades/{trade.slug}" class="text-neutral-50 hover:text-turtle-400 font-mono font-medium">
                {trade.instrument}
              </a>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 rounded text-xs font-medium {trade.direction === 'LONG' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}">
                {trade.direction}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-neutral-400">{trade.system}</td>
            <td class="px-4 py-3 text-right font-mono text-sm text-neutral-300">${trade.entryPrice.toFixed(2)}</td>
            <td class="px-4 py-3 text-right font-mono text-sm text-neutral-300">
              {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—'}
            </td>
            <td class="px-4 py-3 text-right font-mono text-sm {trade.returnPercent !== null && trade.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}">
              {trade.returnPercent !== null ? `${trade.returnPercent >= 0 ? '+' : ''}${trade.returnPercent.toFixed(2)}%` : '—'}
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-1 rounded text-xs font-medium {trade.status === 'OPEN' ? 'bg-blue-900/50 text-blue-400' : 'bg-neutral-800 text-neutral-400'}">
                {trade.status}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
