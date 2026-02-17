import type { TradeEvent } from "@/types";

interface EventSectionProps {
  title: string;
  count: number;
  events: TradeEvent[];
  expanded: boolean;
  onToggle: () => void;
  renderEvent: (e: TradeEvent) => React.ReactNode;
}

export function EventSection({
  title,
  count,
  events,
  expanded,
  onToggle,
  renderEvent,
}: EventSectionProps) {
  if (count === 0) return null;
  const sorted = [...events].sort((a, b) => (b.time || "").localeCompare(a.time || ""));
  const preview = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="mb-1.5">
      <div className="text-xs sm:text-sm font-medium text-gray-300 mb-1">
        {title} ({count})
      </div>
      {preview.map((e, i) => (
        <div key={i}>{renderEvent(e)}</div>
      ))}
      {rest.length > 0 && (
        <>
          <button
            onClick={onToggle}
            className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer mt-1"
          >
            {expanded ? "▲ Collapse" : `▼ View all ${count}`}
          </button>
          {expanded && (
            <div className="max-h-48 overflow-y-auto mt-0.5">
              {rest.map((e, i) => (
                <div key={i}>{renderEvent(e)}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
