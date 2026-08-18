// ============================================================
// Turtelli 2.0 — Root Layout
// ============================================================

<script lang="ts">
  import "../app.css";
</script>

<div class="min-h-screen bg-neutral-950">
  <!-- Navigation -->
  <nav class="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <span class="text-2xl">🐢</span>
          <span class="text-xl font-bold text-neutral-50">Turtelli</span>
          <span class="text-xs text-neutral-500 font-mono">2.0</span>
        </div>

        <!-- Navigation Links -->
        <div class="flex items-center gap-6">
          <a href="/" class="text-sm text-neutral-400 hover:text-neutral-50 transition-colors">
            Dashboard
          </a>
          <a href="/trades" class="text-sm text-neutral-400 hover:text-neutral-50 transition-colors">
            Trades
          </a>
          <a href="/scanner" class="text-sm text-neutral-400 hover:text-neutral-50 transition-colors">
            Scanner
          </a>
          <a href="/research" class="text-sm text-neutral-400 hover:text-neutral-50 transition-colors">
            Research
          </a>
          <a href="/chat" class="text-sm text-neutral-400 hover:text-neutral-50 transition-colors">
            AI Chat
          </a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>

  <!-- Footer -->
  <footer class="border-t border-neutral-800 mt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between text-sm text-neutral-500">
        <div class="flex items-center gap-2">
          <span>🐢</span>
          <span>Turtelli 2.0 — Radical Transparency in Turtle Trading</span>
        </div>
        <div class="flex items-center gap-4">
          <a href="/about" class="hover:text-neutral-300 transition-colors">About</a>
          <a href="/disclaimer" class="hover:text-neutral-300 transition-colors">Disclaimer</a>
          <a href="/privacy" class="hover:text-neutral-300 transition-colors">Privacy</a>
        </div>
      </div>
      <div class="mt-4 text-xs text-neutral-600">
        Past performance does not guarantee future results. Trading involves risk.
        This is a paper trading simulation for educational purposes.
      </div>
    </div>
  </footer>
</div>
