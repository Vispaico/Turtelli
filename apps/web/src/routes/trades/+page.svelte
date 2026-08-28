<script lang="ts">
  import { api } from "$lib/api";
  import { onMount } from "svelte";

  let trades: any[] = [];
  let summary: any = null;
  let loading = true;
  let error = false;
  let filter: "all" | "open" | "closed" = "all";

  function setFilter(f: string) {
    filter = f as "all" | "open" | "closed";
  }

  onMount(async () => {
    try {
      const r = await api.trades();
      trades = r.trades;
      summary = r.summary;
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  });

  $: shown =
    filter === "all"
      ? trades
      : trades.filter((t) =>
          filter === "open" ? t.status === "OPEN" : t.status !== "OPEN"
        );

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
        <a href="/" class="hover:text-white transition">Dashboard</a>
        <a href="/scanner" class="hover:text-white transition">Scanner</a>
        <a href="/methodology" class="hover:text-white transition">Methodology</a>
      </div>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-5 py-12">
    <header class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight">Trade Ledger</h1>
      <p class="text-neutral-400 mt-2 text-sm max-w-xl">
        Every position ever taken by both portfolios. Winners and losers alike —
        permanent and public.
      </p>
    </header>

    {#if loading}
      <div class="space-y-2 animate-pulse">
        {#each Array(5) as _}
          <div class="h-14 bg-neutral-900 rounded-lg"></div>
        {/each}
      </div>
    {:else if error}
      <div class="border border-red-900/40 bg-red-950/20 rounded-xl p-8 text-center">
        <p class="text-sm text-neutral-400">Ledger unavailable — engine offline.</p>
      </div>
    {:else}
      {#if summary && summary.totalTrades > 0}
        <div class="grid grid-cols-4 gap-4 mb-8 max-w-lg">
          <div class="border border-neutral-800 rounded-lg p-3 text-center">
            <div class="font-mono font-semibold">{summary.totalTrades}</div>
            <div class="text-[11px] text-neutral-500">closed</div>
          </div>
          <div class="border border-neutral-800 rounded-lg p-3 text-center">
            <div class="font-mono font-semibold text-emerald-400">{summary.winners}</div>
            <div class="text-[11px] text-neutral-500">winners</div>
          </div>
          <div class="border border-neutral-800 rounded-lg p-3 text-center">
            <div class="font-mono font-semibold text-red-400">{summary.losers}</div>
            <div class="text-[11px] text-neutral-500">losers</div>
          </div>
          <div class="border border-neutral-800 rounded-lg p-3 text-center">
            <div class="font-mono font-semibold">
              {summary.winRatePct !== null ? `${summary.winRatePct}%` : "—"}
            </div>
            <div class="text-[11px] text-neutral-500">win rate</div>
          </div>
        </div>
      {/if}

      <div class="flex gap-2 mb-4 text-xs font-mono">
        {#each ["all", "open", "closed"] as f}
          <button
            class="px-3 py-1.5 rounded-md border transition {filter === f
              ? 'border-emerald-600 text-emerald-400'
              : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'}"
            on:click={() => setFilter(f)}>
            {f}
          </button>
        {/each}
      </div>

      {#if shown.length === 0}
        <div class="border border-neutral-800 rounded-xl p-12 text-center">
          <div class="text-3xl mb-3">📖</div>
          <h2 class="font-semibold mb-1">The ledger is empty</h2>
          <p class="text-sm text-neutral-500 max-w-md mx-auto">
            No trades yet. Turtelli only takes positions when a genuine Turtle
            breakout fires — that could take days or weeks. Patience is part of
            the system.
          </p>
        </div>
      {:else}
        <div class="overflow-x-auto border border-neutral-800 rounded-xl">
          <table class="w-full text-sm">
            <thead class="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-800 bg-neutral-900/40">
              <tr>
                <th class="px-4 py-3">Symbol</th>
                <th class="px-4 py-3">Dir</th>
                <th class="px-4 py-3 hidden md:table-cell">Portfolio</th>
                <th class="px-4 py-3">Entry</th>
                <th class="px-4 py-3 hidden sm:table-cell">Date</th>
                <th class="px-4 py-3 text-right">P&L</th>
                <th class="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-800/70">
              {#each shown as t (t.positionId)}
                <tr class="hover:bg-neutral-900/40 transition-colors">
                  <td class="px-4 py-3 font-mono font-bold">{t.symbol}</td>
                  <td class="px-4 py-3">
                    <span class={`text-xs font-mono ${t.direction === "LONG" ? "text-emerald-400" : "text-red-400"}`}>
                      {t.direction}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-xs text-neutral-400 hidden md:table-cell">
                    {t.portfolio === "TURTELLI_MICRO" ? "Micro" : "Standard"}
                  </td>
                  <td class="px-4 py-3 font-mono text-xs">{fmt(t.entryPrice)}</td>
                  <td class="px-4 py-3 text-xs text-neutral-500 hidden sm:table-cell">{t.entryDate}</td>
                  <td class={`px-4 py-3 text-right font-mono text-xs ${
                    t.status === "OPEN"
                      ? "text-neutral-500"
                      : (t.realizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {#if t.status === "OPEN"}
                      open @ {fmt(t.lastPrice)}
                    {:else}
                      {(t.realizedPnl ?? 0) >= 0 ? "+" : ""}{fmt(t.realizedPnl ?? 0)}
                    {/if}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span class={`text-[11px] font-mono px-2 py-0.5 rounded ${
                      t.status === "OPEN"
                        ? "bg-blue-950 text-blue-400"
                        : t.closeReason === "stop_loss"
                          ? "bg-red-950/60 text-red-400"
                          : "bg-neutral-800 text-neutral-400"}`}>
                      {t.status === "OPEN" ? "OPEN" : t.closeReason?.replace("_", " ") || t.status}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  </main>

  <footer class="border-t border-neutral-800/80 mt-16">
    <div class="max-w-6xl mx-auto px-5 py-8 text-xs text-neutral-600">
      Educational simulation. Not investment advice. Past performance does not
      guarantee future results.
    </div>
  </footer>
</div>
