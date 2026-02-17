import type { DecisionEntry } from "@/types";
import { fmtTime } from "@/lib/format";

const DECISION_ICONS: Record<string, string> = {
  TRADE: "📈",
  WIN: "✅",
  LOSS: "❌",
  NEW_MARKET: "🔄",
  SKIP: "⏭️",
  WAIT: "⏳",
  STOP: "🛑",
  EXPIRED: "⏰",
  PAUSED: "🚨",
  RESUMED: "▶️",
};

interface DecisionLogProps {
  entries: DecisionEntry[];
}

export function DecisionLog({ entries }: DecisionLogProps) {
  const displayEntries = (entries || []).slice().reverse().slice(0, 20);

  return (
    <details className="card">
      <summary className="cursor-pointer text-base font-semibold">📝 Raw Decision Log</summary>
      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
        {displayEntries.map((entry, i) => (
          <div
            key={i}
            className="text-xs sm:text-sm font-mono text-gray-400"
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
          >
            {DECISION_ICONS[entry.action] || "ℹ️"} [{fmtTime(entry.time)}] {entry.strategy?.padEnd(15)} | {entry.reason}
            {entry.slug ? ` | ${entry.slug}` : ""}
          </div>
        ))}
      </div>
    </details>
  );
}
