// ============================================================
// Turtelli 2.0 — Admin Dashboard
// ============================================================

<script lang="ts">
</script>

<div class="min-h-screen bg-neutral-950 p-8">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-neutral-50 mb-8">🐢 Turtelli Admin</h1>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div class="text-2xl font-bold text-green-400">✓</div>
        <div class="text-sm text-neutral-400 mt-2">System Status</div>
        <div class="text-lg font-mono text-neutral-50">Healthy</div>
      </div>
      
      <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div class="text-2xl font-bold text-blue-400">📊</div>
        <div class="text-sm text-neutral-400 mt-2">Markets Scanned</div>
        <div class="text-lg font-mono text-neutral-50">0</div>
      </div>
      
      <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div class="text-2xl font-bold text-yellow-400">⚡</div>
        <div class="text-sm text-neutral-400 mt-2">Active Signals</div>
        <div class="text-lg font-mono text-neutral-50">0</div>
      </div>
      
      <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div class="text-2xl font-bold text-purple-400">👥</div>
        <div class="text-sm text-neutral-400 mt-2">Users</div>
        <div class="text-lg font-mono text-neutral-50">0</div>
      </div>
    </div>
    
    <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold text-neutral-50 mb-4">Quick Actions</h2>
      <div class="flex gap-4">
        <button class="px-4 py-2 bg-turtle-600 text-white rounded hover:bg-turtle-700 transition-colors">
          Run Daily Scan
        </button>
        <button class="px-4 py-2 bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 transition-colors">
          View Logs
        </button>
        <button class="px-4 py-2 bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 transition-colors">
          Check Health
        </button>
      </div>
    </div>
    
    <div class="text-center text-neutral-500 text-sm">
      Admin dashboard will be fully implemented in Phase 15.
    </div>
  </div>
</div>
