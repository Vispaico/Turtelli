<script lang="ts">
  import { api, type SignalRecord } from "$lib/api";
  import { onMount } from "svelte";

  let instruments: SignalRecord[] = [];
  let loading = true;
  let error = false;
  let sortKey: "distance" | "symbol" | "atr" = "distance";

  onMount(async () => {
    try {
      instruments = await api.nearBreakout(8, 50);
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  });

  $: sorted = [...instruments].sort((a, b) => {
    if (sortKey === "distance")
      return a.distanceToBreakoutPct - b.distanceToBreakoutPct;
    if (sortKey === "atr") return b.atr - a.atr;
    return a.symbol.localeCompare(b.symbol);
  });

  const fmtPrice = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });
</script>

<div class="min-h-screen bg-neutral-950">
  <nav class="border-b border-neutral-800/80 sticky top-0 z-50 bg-neutral-950/85 backdrop-blur">
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <span class="text-2xl">🐢</span>
        <span class="font-bold tracking-tight text-lg">Turtelli</span>
      </a>
      <div class="flex gap-6 text-sm text-neutral-400">
        <a href="/" class="hover:text-white transition">Dashboard</a>
        <a href="/trades" class="hover:text-white transition">Trades</a>
        <a href="/methodology" class="hover:text-white transition">Methodology</a>
      </div>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-5 py-12">
    <header class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight">Near-Breakout Scanner</h1>
      <p class="text-neutral-400 mt-2 text-sm max-w-xl">
        Instruments approaching their 20-day Donchian channel — the level where
        Turtelli's System 1 triggers. Sorted by proximity.
      </p>
    </header>

    {#if loading}
      <div class="space-y-2 animate-pulse">
        {#each Array(6) as _}
          <div class="h-16 bg-neutral-900 rounded-lg"></div>
        {/each}
      </div>
    {:else if error}
      <div class="border border-red-900/40 bg-red-950/20 rounded-xl p-8 text-center">
        <p class="text-sm text-neutral-400">Scanner unavailable — engine offline.</p>
      </div>
    {:else if sorted.length === 0}
      <!-- Empty state -->
      <div class="border border-neutral-800 rounded-xl p-12 text-center">
        <div class="text-3xl mb-3">🔍</div>
        <h2 class="font-semibold mb-1">Nothing near breakout right now</h2>
        <p class="text-sm text-neutral-500">
          The universe is quiet. Check back after the next market scan.
        </p>
      </div>
    {:else}
      <div class="flex gap-2 mb-4 text-xs font-mono">
        <button
          class="px-3 py-1.5 rounded-md border transition {sortKey === 'distance'
            ? 'border-emerald-600 text-emerald-400'
            : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}"
          on:click={() => (sortKey = "distance")}>
          distance
        </button>
        <button
          class="px-3 py-1.5 rounded-md border transition {sortKey === 'atr'
            ? 'border-emerald-600 text-emerald-400'
            : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}"
          on:click={() => (sortKey = "atr")}>
          ATR
        </button>
        <button
          class="px-3 py-1.5 rounded-md border transition {sortKey === 'symbol'
            ? 'border-emerald-600 text-emerald-400'
            : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}"
          on:click={() => (sortKey = "symbol")}>
          symbol
        </button>
      </div>

      <div class="space-y-2">
        {#each sorted as s (s.signalId)}
          <div class="flex items-center justify-between border border-neutral-800 rounded-lg px-5 py-4 hover:border-neutral-700 transition-colors bg-neutral-900/30">
            <div class="flex items-center gap-4 min-w-0">
              <span class="font-mono font-bold text-lg w-20">{s.symbol}</span>
              <span class={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                s.direction === "LONG"
                  ? "bg-emerald-950 text-emerald-400"
                  : "bg-red-950 text-red-400"}`}>
                {s.direction}
              </span>
              <span class="text-xs text-neutral-500 hidden md:inline">System 1 · 20d channel</span>
            </div>
            <div class="text-right">
              <div class="font-mono text-sm">
                <span class={s.distanceToBreakoutPct < 1
                  ? "text-amber-400 font-semibold"
                  : "text-neutral-300"}>
                  {s.distanceToBreakoutPct.toFixed(2)}%
                </span>
                <span class="text-neutral-600 text-xs"> from breakout</span>
              </div>
              <div class="text-[11px] text-neutral-600 font-mono mt-0.5">
                trigger {fmtPrice(s.breakoutLevel)} · now {fmtPrice(s.triggerPrice)}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>

  <footer class="border-t border-neutral-800/80 mt-16">
    <div class="max-w-6xl mx-auto px-5 py-8 text-xs text-neutral-600">
      Breakout levels are computed after each close from prior bars only.
      Educational simulation — not investment advice.
    </div>
  </footer>
</div>
