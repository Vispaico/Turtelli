// ============================================================
// Turtelli 2.0 — Performance Page
// ============================================================
// BACKTEST and LIVE/PAPER are permanently separated. They will
// never share a chart axis or a summary table.

<script lang="ts">
  let tab: "paper" | "backtest" = "paper";

  type Pf = { returnPct: number | null; maxDD: number | null; trades: number | null; winRate: number | null };

  const paper: Record<string, Pf> = {
    micro: { returnPct: null, maxDD: null, trades: null, winRate: null },
    standard: { returnPct: null, maxDD: null, trades: null, winRate: null },
  };

  const backtest = [
    { symbol: "SPY", system: "System 1", period: "2016–2026", trades: 104, cagr: 5.55, maxDD: 30.4, sharpe: 0.49, pf: 1.91 },
  ];

  const pf = (key: string): Pf => paper[key];
  const pct = (v: number | null) => (v === null ? "—" : v.toFixed(2) + "%");
  const num = (v: number | null) => (v === null ? "—" : String(v));
</script>

<svelte:head>
  <title>Turtelli — Performance</title>
</svelte:head>

<h1 class="text-3xl font-bold text-neutral-50 mb-2">Performance</h1>
<p class="text-neutral-400 max-w-2xl mb-8">
  Two separate records, always kept apart:
  <span class="text-neutral-200">LIVE/PAPER</span> — the public portfolios trading since inception —
  and <span class="text-neutral-200">BACKTEST</span> — historical simulations of the same rules.
  They are never mixed.
</p>

<!-- Tabs -->
<div class="flex gap-2 mb-8">
  <button
    class={tab === "paper" ? "bg-turtle-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"}
    on:click={() => (tab = "paper")}
  >
    Live / Paper
  </button>
  <button
    class={tab === "backtest" ? "bg-turtle-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors" : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"}
    on:click={() => (tab = "backtest")}
  >
    Backtests
  </button>
</div>

{#if tab === "paper"}
  <div class="grid md:grid-cols-2 gap-6">
    {#each ["micro", "standard"] as key}
      <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-5">
          <h3 class="font-semibold text-neutral-100">{key === "micro" ? "Turtelli Micro" : "Turtelli Standard"}</h3>
          <span class="text-[11px] font-mono px-2 py-1 rounded-md bg-green-900/40 text-green-400">LIVE/PAPER</span>
        </div>
        <dl class="grid grid-cols-2 gap-y-4 text-sm">
          <dt class="text-neutral-500">Total return</dt>
          <dd class="text-right font-mono">{pct(pf(key).returnPct)}</dd>
          <dt class="text-neutral-500">Max drawdown</dt>
          <dd class="text-right font-mono">−{pct(pf(key).maxDD)}</dd>
          <dt class="text-neutral-500">Closed trades</dt>
          <dd class="text-right font-mono">{num(pf(key).trades)}</dd>
          <dt class="text-neutral-500">Win rate</dt>
          <dd class="text-right font-mono">{pct(pf(key).winRate)}</dd>
        </dl>
      </div>
    {/each}
    <p class="md:col-span-2 text-xs text-neutral-600 leading-relaxed border-l-2 border-neutral-800 pl-4">
      Paper statistics appear after the first closed trades. Inception balances are fixed at
      $600.00 and $10,000.00 respectively and can never be reset.
    </p>
  </div>
{:else}
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden overflow-x-auto mb-6">
    <div class="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
      <h3 class="font-semibold text-neutral-100">Historical simulations</h3>
      <span class="text-[11px] font-mono px-2 py-1 rounded-md bg-blue-900/40 text-blue-300">BACKTEST</span>
    </div>
    <table class="w-full text-sm min-w-[720px]">
      <thead>
        <tr class="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
          <th class="px-4 py-3">Symbol</th>
          <th class="px-4 py-3">System</th>
          <th class="px-4 py-3 text-right">Period</th>
          <th class="px-4 py-3 text-right">Trades</th>
          <th class="px-4 py-3 text-right">CAGR</th>
          <th class="px-4 py-3 text-right">Max DD</th>
          <th class="px-4 py-3 text-right">Sharpe</th>
          <th class="px-4 py-3 text-right">PF</th>
        </tr>
      </thead>
      <tbody>
        {#each backtest as b}
          <tr class="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors font-mono">
            <td class="px-4 py-3 text-neutral-100">{b.symbol}</td>
            <td class="px-4 py-3 text-neutral-400">{b.system}</td>
            <td class="px-4 py-3 text-right text-neutral-400">{b.period}</td>
            <td class="px-4 py-3 text-right">{b.trades}</td>
            <td class="px-4 py-3 text-right text-long">+{b.cagr.toFixed(2)}%</td>
            <td class="px-4 py-3 text-right text-short">−{b.maxDD.toFixed(2)}%</td>
            <td class="px-4 py-3 text-right">{b.sharpe.toFixed(2)}</td>
            <td class="px-4 py-3 text-right">{b.pf.toFixed(2)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="text-xs text-neutral-600 leading-relaxed border-l-2 border-neutral-800 pl-4">
    Backtests are simulations of the exact same rule code used by the live portfolios, with
    documented slippage assumptions. They involve hindsight in universe selection and cannot
    account for all market conditions. Past performance — simulated or live — does not
    guarantee future results.
  </p>
{/if}