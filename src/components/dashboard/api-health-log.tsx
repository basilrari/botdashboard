import type { ApiHealthEntry } from "@/types";
import { fmtTime } from "@/lib/format";

const PROVIDER_ICONS: Record<string, string> = {
  SYSTEM: "⚙️",
  CHAINLINK: "⛓️",
  CLOB_WS: "📡",
  BINANCE: "🅱️",
};

interface ApiHealthLogProps {
  entries: ApiHealthEntry[];
}

export function ApiHealthLog({ entries }: ApiHealthLogProps) {
  if (entries.length === 0) return null;

  const displayEntries = [...entries].reverse();

  return (
    <details className="card">
      <summary className="cursor-pointer text-base font-semibold">
        📡 API Health Log ({entries.length})
      </summary>
      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
        {displayEntries.map((entry, i) => (
          <div key={i} className="text-xs sm:text-sm font-mono text-gray-400 truncate">
            {PROVIDER_ICONS[entry.provider] || "📡"} [{fmtTime(entry.time)}] {entry.event}: {entry.detail}
          </div>
        ))}
      </div>
    </details>
  );
}
