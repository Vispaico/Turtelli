// ============================================================
// Turtelli 2.0 — Signals Page
// ============================================================
// FREE: delayed. SIGNALS/PRO: timely. Gate is server-side; this page
// reflects what the API returns for the current session.

<script lang="ts">
  const activeSignals: Array<{
    symbol: string;
    direction: "LONG" | "SHORT";
    system: string;
    state: string;
    breakoutLevel: number | null;
    stop: number | null;
    distancePct: number | null;
  }> = [];
</script>

<svelte:head>
  <title>Turtelli — Signals</title>
</svelte:head>

<h1 class="text-3xl font-bold text-neutral-50 mb-2">Signals</h1>
<p class="text-neutral-400 mb-8">
  Deterministic Turtle signals. No discretion — every level below is reproducible from
  published rules and public price data.
</p>

{#if activeSignals.length === 0}
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
    <span class="text-4xl mb-4 block">📡</span>
    <h3 class="font-semibold text-neutral-300 mb-1">No live signals right now</h3>
    <p class="text-sm text-neutral-500 max-w-md mx-auto">
      Signals appear when instruments approach or cross their Turtle channel levels.
      Free accounts see a 24h delay; subscribers see levels as they arm.
    </p>
  </div>
{:else}
  <div class="grid gap-4">
    {#each activeSignals as s}
      <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div>
            <div class="font-mono font-bold text-lg text-neutral-50">{s.symbol}</div>
            <div class="text-xs text-neutral-500">{s.system}</div>
          </div>
          <span class={`px-2 py-1 rounded text-xs font-medium ${s.direction === "LONG" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
            {s.direction}
          </span>
        </div>
        <div class="flex items-center gap-8 font-mono text-sm">
          <div class="text-right">
            <div class="text-neutral-500 text-xs">Breakout</div>
            <div>{s.breakoutLevel === null ? "—" : `$${s.breakoutLevel.toFixed(2)}`}</div>
          </div>
          <div class="text-right">
            <div class="text-neutral-500 text-xs">Initial stop</div>
            <div class="text-short">{s.stop === null ? "—" : `$${s.stop.toFixed(2)}`}</div>
          </div>
          <div class="text-right">
            <div class="text-neutral-500 text-xs">Distance</div>
            <div>{s.distancePct === null ? "—" : `${s.distancePct.toFixed(2)}%`}</div>
          </div>
          <span class="px-2 py-1 rounded text-xs bg-neutral-800 text-neutral-300">{s.state}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<p class="text-xs text-neutral-600 mt-6">
  Signal states follow the published state machine: DISCOVERED → WATCHING → ARMED → TRIGGERED → OPEN → CLOSED.
  Every transition is an immutable ledger event.
</p>
