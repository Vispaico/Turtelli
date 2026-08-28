<script lang="ts">
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
        <a href="/trades" class="hover:text-white transition">Trades</a>
      </div>
    </div>
  </nav>

  <main class="max-w-3xl mx-auto px-5 py-12">
    <h1 class="text-3xl font-bold tracking-tight mb-2">Methodology</h1>
    <p class="text-neutral-400 text-sm mb-10">
      Exactly what the engine does, in plain language. No magic, no discretion,
      no AI making decisions.
    </p>

    <div class="space-y-8 text-sm leading-relaxed text-neutral-300">
      <section class="border border-neutral-800 rounded-xl p-6">
        <h2 class="font-semibold text-base mb-3 flex items-center gap-2">
          🐢 The Turtle rules
        </h2>
        <p class="text-neutral-400 mb-3">
          Turtelli implements Richard Dennis's famous Turtle Trading experiment
          rules — a complete, mechanical trend-following system from the 1980s,
          published in Curtis Faith's "Way of the Turtle".
        </p>
        <p class="text-neutral-400">
          Every night after market close we compute Donchian channels and ATR
          for each instrument in our universe. Nothing about this process is
          clever: it's arithmetic on public prices.
        </p>
      </section>

      <section class="border border-neutral-800 rounded-xl p-6">
        <h2 class="font-semibold text-base mb-3">Entry rules</h2>
        <ul class="space-y-2 text-neutral-400 list-disc list-inside">
          <li><strong class="text-neutral-200">System 1:</strong> buy when price closes above its highest high of the prior 20 trading days (sell short below the 20-day low)</li>
          <li><strong class="text-neutral-200">System 2:</strong> same, but using 55-day channels for slower, bigger trends</li>
          <li>The breakout level always excludes today's prices — no look-ahead, ever</li>
        </ul>
      </section>

      <section class="border border-neutral-800 rounded-xl p-6">
        <h2 class="font-semibold text-base mb-3">Position sizing</h2>
        <p class="text-neutral-400 mb-3">
          Each unit risks exactly 1% of current equity. Volatile instruments get
          smaller positions; calm ones get larger. This is the heart of the
          Turtle system.
        </p>
        <code class="block bg-neutral-900 rounded-lg p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
units = (equity × 1%) / (ATR × 2)
        </code>
      </section>

      <section class="border border-neutral-800 rounded-xl p-6">
        <h2 class="font-semibold text-base mb-3">Stops & exits</h2>
        <ul class="space-y-2 text-neutral-400 list-disc list-inside">
          <li>Initial stop: 2×ATR below entry (LONG) or above (SHORT)</li>
          <li>Stops only tighten — never widen</li>
          <li>Exit when price closes through the opposite 10-day (System 1) or 20-day (System 2) channel</li>
        </ul>
      </section>

      <section class="border border-neutral-800 rounded-xl p-6">
        <h2 class="font-semibold text-base mb-3">What the AI does NOT do</h2>
        <p class="text-neutral-400">
          No language model, neural network, or human decides entries, sizes,
          stops, or exits. Those come exclusively from the deterministic code
          above. AI systems in Turtelli may research, explain, and summarize —
          they cannot trade.
        </p>
      </section>

      <section class="border border-amber-900/40 bg-amber-950/10 rounded-xl p-6">
        <h2 class="font-semibold text-base mb-3 text-amber-300">Honest limitations</h2>
        <ul class="space-y-2 text-neutral-400 text-[13px] list-disc list-inside">
          <li>This is paper trading — fills are simulated with slippage assumptions, not real broker executions</li>
          <li>Gaps through stops can lose more than the intended risk</li>
          <li>Trend following endures long flat stretches and deep drawdowns by design</li>
          <li>Past backtests never predict future returns</li>
        </ul>
      </section>
    </div>
  </main>

  <footer class="border-t border-neutral-800/80 mt-16">
    <div class="max-w-6xl mx-auto px-5 py-8 text-xs text-neutral-600">
      Full rule documentation lives in TRADING_RULES.md in the repository.
    </div>
  </footer>
</div>
