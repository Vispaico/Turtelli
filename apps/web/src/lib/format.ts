// ============================================================
// Turtelli 2.0 — Formatting Utilities
// ============================================================

export function fmtMoney(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtSignedMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${fmtMoney(Math.abs(n))}`;
}

export function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(decimals)}%`;
}

export function fmtSignedPct(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n).toFixed(decimals)}%`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pnlClass(n: number | null | undefined): string {
  if (n === null || n === undefined) return "text-neutral-400";
  return n >= 0 ? "text-long" : "text-short";
}

/** Trade page slug, e.g. nvda-long-2026-08-14 */
export function tradeSlug(
  symbol: string,
  direction: string,
  entryDate: string
): string {
  const datePart = entryDate.slice(0, 10);
  return `${symbol.toLowerCase()}-${direction.toLowerCase()}-${datePart}`;
}

/**
 * Human-readable exit/skip reasons. Never jargon without explanation.
 */
const REASON_LABELS: Record<string, string> = {
  stop_loss: "Stopped out (2N stop reached)",
  exit_channel: "Exit channel break (10/20-day opposite channel)",
  end_of_data: "Position closed at backtest/paper boundary",
  insufficient_capital: "Not enough capital for a minimum position",
  risk_limit: "Portfolio risk limit reached",
  correlation_exposure: "Too many positions in the same sector",
  max_positions: "Maximum number of open positions reached",
  minimum_quantity: "Position size below the minimum tradable quantity",
  existing_position: "Already holding this instrument",
  invalid_signal: "Signal failed data validation",
};

export function reasonLabel(reason: string | null | undefined): string {
  if (!reason) return "—";
  return REASON_LABELS[reason] ?? reason;
}
