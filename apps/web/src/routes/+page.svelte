<script lang="ts">
  import "../app.css";
  import { api, type PortfolioSnapshot, type ScanStatus } from "$lib/api";
  import { onMount } from "svelte";

  let portfolios: PortfolioSnapshot[] = [];
  let scan: ScanStatus | null = null;
  let loading = true;
  let apiDown = false;

  onMount(async () => {
    try {
      const [p, s] = await Promise.all([api.portfolios(), api.scanStatus()]);
      portfolios = p;
      scan = s;
    } catch {
      apiDown = true;
    } finally {
      loading = false;
    }
  });

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });
</script>

<div class="min-h-screen bg-neutral-950">
  <!-- Nav -->
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
      <div class="animate-pulse space-y-4">
        <div class="h-10 w-96 bg-neutral-900 rounded"></div>
        <div class="h-24 bg-neutral-900 rounded"></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="h-48 bg-neutral-900 rounded"></div>
          <div class="h-48 bg-neutral-900 rounded"></div>
        </div>
      </div>
    {:else if apiDown}
      <!-- Failure state -->
      <div class="border border-red-900/40 bg-red-950/20 rounded-xl p-8 text-center mt-16">
        <div class="text-3xl mb-3">🔌</div>
        <h2 class="text-lg font-semibold mb-1">Engine offline</h2>
        <p class="text-sm text-neutral-400 max-w-md mx-auto">
          The Turtelli API isn't responding. The system runs its market scan after
          each close — check back soon.
        </p>
      </div>
    {:else}
      <!-- Hero -->
      <header class="mb-10">
        <div class="flex items-center gap-2 text-xs font-mono text-emerald-500/90 mb-3">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          AUTONOMOUS SYSTEM
          {#if scan?.lastScanAt}
            <span class="text-neutral-600 ml-2">
              last scan {new Date(scan.lastScanAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC
            </span>
          {/if}
        </div>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
          Turtle trading,<br />
          <span class="text-neutral-500">executed in public.</span>
        </h1>
        <p class="text-neutral-400 mt-4 max-w-xl">
          A deterministic rules engine watches the market every night and trades
          two paper portfolios — a $600 Micro and a $10,000 Standard — with
          every decision, win, loss, and skip recorded permanently.
        </p>

        {#if scan}
          <div class="flex flex-wrap gap-x-8 gap-y-2 mt-6 text-sm font-mono text-neutral-500">
            <span><span class="text-neutral-200">{scan.scannedCount}</span> markets scanned</span>
            <span><span class="text-neutral-200">{scan.candidatesFound}</span> breakouts today</span>
            <span><span class="text-neutral-200">{Object.values(scan.states ?? {}).reduce((a, b) => a + b, 0)}</span> universe size</span>
          </div>
        {/if}
      </header>

      <!-- Portfolios -->
      <section class="grid md:grid-cols-2 gap-4 mb-12">
        {#each portfolios as p (p.portfolio)}
          <a
            href="/portfolio/{p.portfolio}"
            class="group block border border-neutral-800 rounded-xl p-6 hover:border-neutral-600 transition-colors bg-gradient-to-b from-neutral-900/60 to-transparent"
          >
            <div class="flex justify-between items-start mb-5">
              <div>
                <div class="text-xs uppercase tracking-wider text-neutral-500 font-mono">
                  {p.portfolio === "TURTELLI_MICRO" ? "Micro" : "Standard"}
                </div>
                <div class="text-3xl font-bold font-mono mt-1">{fmt(p.equity)}</div>
              </div>
              <div class={`text-right ${p.totalReturnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                <div class="text-xl font-mono font-semibold">
                  {p.totalReturnPct >= 0 ? "+" : ""}{p.totalReturnPct.toFixed(2)}%
                </div>
                <div class="text-[11px] text-neutral-500">since inception</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center border-t border-neutral-800/70 pt-4">
              <div>
                <div class="font-mono text-sm">{fmt(p.initialEquity)}</div>
                <div class="text-[11px] text-neutral-500">start</div>
              </div>
              <div>
                <div class="font-mono text-sm">{p.openPositions}</div>
                <div class="text-[11px] text-neutral-500">open</div>
              </div>
              <div>
                <div class="font-mono text-sm text-red-400/90">−{p.maxDrawdownPct.toFixed(1)}%</div>
                <div class="text-[11px] text-neutral-500">max DD</div>
              </div>
            </div>
            <div class="mt-4 text-xs text-neutral-600 group-hover:text-neutral-400 transition">
              View ledger →
            </div>
          </a>
        {/each}
      </section>

      <!-- Transparency banner -->
      <section class="border border-neutral-800 rounded-xl p-6 mb-12 bg-neutral-900/30">
        <h2 class="font-semibold mb-2">No cherry-picking. No resets. Ever.</h2>
        <p class="text-sm text-neutral-400 leading-relaxed">
          Every trade these portfolios make is published — the winners
          <em class="text-emerald-400 not-italic">and</em> the losers. When a portfolio can't
          afford a signal or hits a risk limit, that skip is recorded too.
          There is no admin button to reset balances; corrections can only ever be
          new auditable events.
        </p>
      </section>
    {/if}
  </main>

  <footer class="border-t border-neutral-800/80 mt-16">
    <div class="max-w-6xl mx-auto px-5 py-8 text-xs text-neutral-600 space-y-2">
      <p>
        Turtelli is an educational paper-trading simulation. Nothing here is
        investment advice. Past performance does not guarantee future results.
      </p>
      <p>Deterministic rules only — no AI decides trades in this system.</p>
    </div>
  </footer>
</div>
