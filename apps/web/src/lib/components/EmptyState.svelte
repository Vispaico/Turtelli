<script lang="ts">
  export let icon = "🐢";
  export let title: string;
  export let message: string;
</script>

<div class="rounded-lg border border-neutral-800 bg-neutral-900 p-12 text-center">
  <span class="mb-4 block text-4xl">{icon}</span>
  <h3 class="mb-2 text-lg font-semibold text-neutral-200">{title}</h3>
  <p class="mx-auto max-w-md text-sm text-neutral-500">{message}</p>
</div>
