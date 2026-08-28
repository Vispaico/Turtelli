// ============================================================
// Turtelli 2.0 — Markets Page
// ============================================================

<script lang="ts">
  const instruments: Array<{
    symbol: string;
    name: string;
    close: number | null;
    distLong20: number | null;   // % from 20d breakout (long)
    state: string;
  }> = [];

  const states = ["NEAR_EXIT", "ACTIVE_POSITION", "NEAR_TRIGGER", "WATCHING", "NORMAL"];
  const tone: Record<string, string> = {
    NEAR_EXIT: "text-short",
    ACTIVE_POSITION: "text-purple-400",
    NEAR_TRIGGER: "text-yellow-400",
    WATCHING: "text-blue-400",
    NORMAL: "text-neutral-500",
  };
</script>

<svelte:head>
  <title>Turtelli — Markets</title>
</svelte:head>

<h1 class="text-3xl font-bold text-neutral-50 mb-2">Markets</h1>
<p class="text-neutral-400 mb-8">Every instrument in the universe, with its monitoring state.</p>

{#if instruments.length === 0}
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
    <span class="text-4xl mb-4 block">🌍</span>
    <h3 class="font-semibold text-neutral-300 mb-1">Universe loads after the first daily scan</h3>
    <p class="text-sm text-neutral-500">The scanner runs after US market close. Check back then.</p>
  </div>
{:else}
  <div class="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden overflow-x-auto">
    <table class="w-full text-sm min-w-[640px]">
      <thead>
        <tr class="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
          <th class="px-4 py-3">Symbol</th>
          <th class="px-4 py-3 text-right">Last close</th>
          <th class="px-4 py-3 text-right">From 20d breakout</th>
          <th class="px-4 py-3">State</th>
        </tr>
      </thead>
      <tbody>
        {#each instruments as i}
          <tr class="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
            <td class="px-4 py-3">
              <span class="font-mono font-medium text-neutral-100">{i.symbol}</span>
              <span class="block text-xs text-neutral-500">{i.name}</span>
            </td>
            <td class="px-4 py-3 text-right font-mono text-neutral-300">
              {i.close === null ? "—" : `$${i.close.toFixed(2)}`}
            </td>
            <td class="px-4 py-3 text-right font-mono text-neutral-300">
              {i.distLong20 === null ? "—" : `${i.distLong20.toFixed(2)}%`}
            </td>
            <td class="px-4 py-3">
              <span class={`text-xs font-mono ${tone[i.state] ?? "text-neutral-500"}`}>{i.state}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
