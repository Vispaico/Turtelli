<script lang="ts">
  export let kind:
    | "long"
    | "short"
    | "open"
    | "closed"
    | "system"
    | "neutral" = "neutral";

  function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(" ");
  }
</script>

<span
  class={cn(
    "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
    kind === "long" && "bg-green-900/50 text-green-400",
    kind === "short" && "bg-red-900/50 text-red-400",
    kind === "open" && "bg-blue-900/50 text-blue-400",
    kind === "closed" && "bg-neutral-800 text-neutral-300",
    kind === "system" && "bg-purple-900/40 text-purple-300",
    kind === "neutral" && "bg-neutral-800 text-neutral-400",
  )}
>
  <slot />
</span>