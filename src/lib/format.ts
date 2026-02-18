export function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso || "?";
  }
}

export function fmtUptime(s: number | null | undefined): string {
  if (s == null || typeof s !== "number" || Number.isNaN(s) || s <= 0) return "0s";
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || typeof n !== "number" || Number.isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Safe .toFixed: avoids crash when value is null/undefined/NaN. */
export function safeToFixed(value: number | null | undefined, digits: number): string {
  if (value == null || typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

/**
 * Tailwind class for BTC move intensity: gray below min, green above min, intense green above full.
 * minThreshold = entry ($17), fullThreshold = full size ($44).
 */
export function getMoveValueColor(
  absMove: number,
  minThreshold: number,
  fullThreshold: number
): string {
  if (absMove < minThreshold) return "text-gray-400";
  if (absMove < fullThreshold) return "text-green-500";
  return "text-emerald-400 font-semibold";
}
