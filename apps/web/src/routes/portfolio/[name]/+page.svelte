<script lang="ts">
  import { api } from "$lib/api";
  import { onMount } from "svelte";

  let detail: any = null;
  let loading = true;
  let error = false;

  export let data: any;
  const portfolioName: string = data.portfolio;

  onMount(async () => {
    try {
      detail = await api.portfolioDetail(portfolioName);
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  });

  const fmt = (n: number) =>
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
        <a href="/scanner" class="hover:text-white transition">Scanner</a>
        <a href="/trades" class="hover:text-white transition">Trades</a>
        <a href="/methodology" class="hover:text-white transition">Methodology</a>
      </div>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-5 py-12">
    {#if loading}
      <div class="h-64 bg-neutral-900 rounded-xl animate-pulse"></div>
    {:else if error || !detail}
      <div class="border border-red-900/40 bg-red-950/20 rounded-xl p-8 text-center">
        <p class="text-sm text-neutral-400">Portfolio unavailable.</p>
      </div>
    {:else}
      {@const p = detail.portfolio}
      <header class="mb-8">
        <a href="/" class="text-xs text-neutral-500 hover:text-neutral-300 transition">← All portfolios</a>
        <h1 class="text-3xl font-bold tracking-tight mt-3">{p.displayName}</h1>
        <p class="text-neutral-500 text-sm font-mono mt-1">
          Started with {fmt(p.initialEquity)} · never reset · every trade public
        </p>
      </header>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div class="border border-neutral-800 rounded-xl p-5">
          <div class="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Equity</div>
          <div class="text-2xl font-mono font-bold">{fmt(p.equity)}</div>
        </div>
        <div class="border border-neutral-800 rounded-xl p-5">
          <div class="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Return</div>
          <div class={`text-2xl font-mono font-bold ${p.totalReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {p.totalReturnPct >= 0 ? "+" : ""}{p.totalReturnPct.toFixed(2)}%
          </div>
        </div>
        <div class="border border-neutral-800 rounded-xl p-5">
          <div class="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Max Drawdown</div>
          <div class="text-2xl font-mono font-bold text-red-400/90">−{p.maxDrawdownPct.toFixed(1)}%</div>
        </div>
        <div class="border border-neutral-800 rounded-xl p-5">
          <div class="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Open Positions</div>
          <div class="text-2xl font-mono font-bold">{p.openPositions}</div>
        </div>
      </div>

      {#if detail.stats.totalTrades > 0}
        <section class="mb-10">
          <h2 class="font-semibold mb-4 text-sm uppercase tracking-wider text-neutral-400">Closed Trades</h2>
          <div class="space-y-2">
            {#each detail.closedTrades as t}
              <div class="flex justify-between items-center border border-neutral-800 rounded-lg px-5 py-3 bg-neutral-900/30">
                <span class="font-mono font-bold">{t.symbol}</span>
                <span class={`font-mono text-sm ${(t.realizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {(t.realizedPnl ?? 0) >= 0 ? "+" : ""}{fmt(t.realizedPnl ?? 0)}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if detail.skips.length > 0}
        <section>
          <h2 class="font-semibold mb-4 text-sm uppercase tracking-wider text-neutral-400">
            Skipped Signals ({detail.skips.length})
          </h2>
          <p class="text-xs text-neutral-600 mb-3">
            Signals this portfolio could not take — recorded for full transparency.
          </p>
          <div class="space-y-2">
            {#each detail.skips.slice(0, 20) as s}
              <div class="flex justify-between items-center border border-dashed border-neutral-800 rounded-lg px-5 py-2.5 text-sm">
                <span class="font-mono">{s.symbol}</span>
                <span class="text-xs text-neutral-500 font-mono">{s.reason.replace(/_/g, " ")}</span>
              </div>
            {/each}
          </div>
        </section>
      {/if}

      {#if detail.stats.totalTrades === 0 && detail.skips.length === 0}
        <div class="border border-neutral-800 rounded-xl p-12 text-center">
          <div class="text-3xl mb-3">⏳</div>
          <p class="text-sm text-neutral-400 max-w-md mx-auto">
            No trades or skips yet. The system only moves when a genuine Turtle
            breakout fires.
          </p>
        </div>
      {/if}
    {/if}
  </main>

  <footer class="border-t border-neutral-800/80 mt-16">
    <div class="max-w-6xl mx-auto px-5 py-8 text-xs text-neutral-600">
      Educational simulation. Not investment advice.
    </div>
  </footer>
</div>
