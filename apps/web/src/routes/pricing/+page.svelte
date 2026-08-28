// ============================================================
// Turtelli 2.0 — Pricing Page
// ============================================================
// Prices come from config, never hardcoded business logic.

<script lang="ts">
  // Mirrors Plan table seeds; single source of truth is the DB
  const plans = [
    {
      name: "Free",
      priceM: 0,
      blurb: "Watch the system work. Full transparency, no clock.",
      features: [
        "Public portfolios & equity curves",
        "Closed trade history — wins AND losses",
        "Market overview",
        "Signals delayed 24 hours",
        "Educational content",
      ],
      cta: "Create free account",
      highlight: false,
    },
    {
      name: "Signals",
      priceM: 29,
      blurb: "Timely LONG/SHORT signals with complete levels.",
      features: [
        "Everything in Free",
        "Timely signal states (no delay)",
        "Entries, stops & exit levels",
        "Breakout / pyramid / exit alerts",
        "Daily scan summary email",
      ],
      cta: "Start Signals",
      highlight: true,
    },
    {
      name: "Pro",
      priceM: 79,
      blurb: "The full research stack for serious students of the system.",
      features: [
        "Everything in Signals",
        "Near-breakout scanner (all tiers)",
        "AI research layer & TimesFM experiments",
        "Market regime analytics",
        "Watchlists & portfolio sizing tools",
        "Complete signal history",
      ],
      cta: "Go Pro",
      highlight: false,
    },
  ];

  let annual = false;
</script>

<svelte:head>
  <title>Turtelli — Pricing</title>
</svelte:head>

<h1 class="text-3xl font-bold text-neutral-50 mb-2">Pricing</h1>
<p class="text-neutral-400 max-w-2xl mb-6">
  The portfolios and the full trade ledger are always free — that's the point.
  Subscriptions fund the data feeds and infrastructure.
</p>

<!-- Billing toggle -->
<label class="inline-flex items-center gap-3 mb-10 cursor-pointer select-none">
  <span class={`text-sm ${annual ? "text-neutral-500" : "text-neutral-200"}`}>Monthly</span>
  <input type="checkbox" bind:checked={annual} class="sr-only peer" />
  <span class="relative w-11 h-6 rounded-full bg-neutral-700 peer-checked:bg-turtle-600 transition-colors
               after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5
               after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
  <span class={`text-sm ${annual ? "text-neutral-200" : "text-neutral-500"}`}>
    Annual <span class="text-turtle-400 font-mono text-xs">(2 months free)</span>
  </span>
</label>

<div class="grid md:grid-cols-3 gap-6">
  {#each plans as plan}
    <div class={`rounded-xl p-6 flex flex-col ${plan.highlight
        ? "bg-gradient-to-b from-turtle-950 to-neutral-900 border border-turtle-700 relative"
        : "bg-neutral-900 border border-neutral-800"}`}>
      {#if plan.highlight}
        <span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-turtle-600 text-white text-[11px] font-medium">
          Most popular
        </span>
      {/if}
      <h3 class="text-lg font-semibold text-neutral-50">{plan.name}</h3>
      <p class="text-sm text-neutral-500 mt-1 mb-5">{plan.blurb}</p>
      <div class="mb-6">
        <span class="text-4xl font-bold font-mono text-neutral-50">
          ${plan.priceM === 0 ? 0 : (annual ? plan.priceM * 10 : plan.priceM)}
        </span>
        <span class="text-sm text-neutral-500">
          {plan.priceM === 0 ? "forever" : annual ? "/year" : "/month"}
        </span>
      </div>
      <ul class="space-y-2.5 text-sm text-neutral-400 flex-1">
        {#each plan.features as f}
          <li class="flex items-start gap-2">
            <span class="text-turtle-400 mt-0.5">✓</span>{f}
          </li>
        {/each}
      </ul>
      <button class={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${plan.highlight
          ? "bg-turtle-600 hover:bg-turtle-500 text-white"
          : "border border-neutral-700 hover:border-neutral-500 text-neutral-200"}`}>
        {plan.cta}
      </button>
    </div>
  {/each}
</div>

<p class="text-xs text-neutral-600 mt-8 leading-relaxed border-l-2 border-neutral-800 pl-4">
  Prices are configurable and shown from the current plan configuration; they may change with
  notice to existing subscribers. Cancellation takes effect at period end — your historical access
  never expires. Payments are processed by Stripe; Turtelli never stores card details.
</p>
