// ============================================================
// Turtelli 2.0 — Research Page
// ============================================================
// Experimental results are ALWAYS labeled experimental.
// Nothing here influences production trades.

<script lang="ts">
  const experiments: Array<{
    name: string;
    status: "planned" | "running" | "completed";
    hypothesis: string;
    result?: string;
  }> = [
    {
      name: "Turtle Classic (baseline)",
      status: "completed",
      hypothesis: "Pure deterministic rules — the reference all enhancements must beat.",
      result: "SPY 2016–2026: 104 trades, CAGR +5.55%, maxDD −30.4%, PF 1.91.",
    },
    {
      name: "Turtle + TimesFM ranking",
      status: "planned",
      hypothesis: "Does ranking simultaneous signals by out-of-sample forecast quality improve expectancy?",
    },
    {
      name: "Turtle + regime filter",
      status: "planned",
      hypothesis: "Do Turtle breakouts perform differently across market regimes — and can that be measured without hindsight?",
    },
    {
      name: "TimesFM forecast calibration",
      status: "running",
      hypothesis: "Are quantile forecasts from the foundation model calibrated on daily equity data?",
    },
  ];

  const tone = {
    completed: "bg-green-900/40 text-green-400",
    running: "bg-blue-900/40 text-blue-300",
    planned: "bg-neutral-800 text-neutral-400",
  } as const;
</script>

<svelte:head>
  <title>Turtelli — Research</title>
</svelte:head>

<h1 class="text-3xl font-bold text-neutral-50 mb-2">Research</h1>
<p class="text-neutral-400 max-w-2xl mb-10">
  AI and ML live in a sealed research lab. Models may explain, rank, and forecast —
  <span class="text-neutral-200">they never decide trades.</span> Every experiment is
  pre-registered, versioned, and only evaluated on out-of-sample data.
</p>

<div class="grid gap-4 mb-10">
  {#each experiments as e}
    <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h3 class="font-semibold text-neutral-100">{e.name}</h3>
        <span class={`px-2 py-0.5 rounded text-[11px] font-mono uppercase ${tone[e.status]}`}>
          {e.status}
        </span>
      </div>
      <p class="text-sm text-neutral-400">{e.hypothesis}</p>
      {#if e.result}
        <p class="text-sm font-mono text-neutral-300 mt-3 bg-neutral-800/60 rounded-lg px-3 py-2">{e.result}</p>
      {/if}
    </div>
  {/each}
</div>

<div class="bg-gradient-to-b from-neutral-900 to-transparent border border-neutral-800 rounded-xl p-6">
  <h3 class="font-semibold text-neutral-100 mb-3">The firewall</h3>
  <ul class="text-sm text-neutral-400 space-y-2.5 list-disc list-inside leading-relaxed">
    <li>Production trading decisions come exclusively from deterministic rule code</li>
    <li>Forecasts are captured <span class="text-neutral-200">before outcomes are known</span> and stored immutably with model version + features</li>
    <li>A model may influence sizing or filtering only after strong out-of-sample evidence — and then only via a published strategy-version change</li>
    <li>All experimental outputs carry an EXPERIMENTAL marker everywhere they appear</li>
  </ul>
</div>
