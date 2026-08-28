<script lang="ts">
  import "../app.css";
</script>

<div class="min-h-screen flex flex-col">
  <nav class="sticky top-0 z-50 border-b" style="border-color: var(--border); background: rgba(10,14,18,0.85); backdrop-filter: blur(8px);">
    <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 3l11 7v12l-11 7-11-7V10l11-7z" stroke="var(--accent)" stroke-width="2"/>
          <circle cx="16" cy="16" r="4.5" fill="var(--accent)"/>
        </svg>
        <span class="font-semibold tracking-tight text-lg">turtelli</span>
      </a>
      <div class="hidden md:flex items-center gap-1 text-sm">
        <a href="/portfolio/micro" class="btn-ghost !py-1.5">Micro</a>
        <a href="/portfolio/standard" class="btn-ghost !py-1.5">Standard</a>
        <a href="/signals" class="btn-ghost !py-1.5">Signals</a>
        <a href="/trades" class="btn-ghost !py-1.5">Trades</a>
        <a href="/methodology" class="btn-ghost !py-1.5">Methodology</a>
        <a href="/pricing" class="btn-primary !py-1.5 ml-2">Pricing</a>
      </div>
      <button class="md:hidden btn-ghost !px-2" aria-label="menu">☰</button>
    </div>
  </nav>

  <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
    <slot />
  </main>

  <footer class="border-t mt-16" style="border-color: var(--border);">
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div class="flex items-center gap-2 text-dim">
          <span class="text-accent">◆</span> turtelli — deterministic turtle trading, radical transparency
        </div>
        <div class="flex gap-4 text-dim">
          <a href="/methodology" class="hover:text-[var(--text)]">Rules</a>
          <a href="/performance" class="hover:text-[var(--text)]">Performance</a>
          <a href="/pricing" class="hover:text-[var(--text)]">Pricing</a>
        </div>
      </div>
      <p class="text-xs leading-relaxed" style="color: var(--text-dim);">
        Paper trading simulation for educational purposes. All trades are hypothetical,
        executed in virtual portfolios. Past performance — simulated or real — does not
        guarantee future results. Nothing here is investment advice.
      </p>
    </div>
  </footer>
</div>
