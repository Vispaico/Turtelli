<script lang="ts">
  export let label: string;
  export let value: string;
  export let tone: "default" | "long" | "short" | "accent" = "default";
</script>

<div class="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
  <div
    class="font-mono text-2xl font-bold {tone === 'long'
      ? 'text-long'
      : tone === 'short'
        ? 'text-short'
        : tone === 'accent'
          ? 'text-turtle-400'
          : 'text-neutral-50'}"
  >
    {value}
  </div>
  <div class="mt-1 text-xs text-neutral-500">{label}</div>
</div>
