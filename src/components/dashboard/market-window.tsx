import type { MarketInfo } from "@/types";
import { safeToFixed } from "@/lib/format";

interface MarketWindowProps {
  market: MarketInfo;
  yesPrice: number;
  noPrice: number;
  windowPct: number;
}

export function MarketWindow({ market, yesPrice, noPrice, windowPct }: MarketWindowProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h2 className="text-base sm:text-lg font-semibold truncate max-w-[70%]">📊 {market.title}</h2>
        {market.slug && (
          <a
            href={`https://polymarket.com/event/${market.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline shrink-0"
          >
            Polymarket ↗
          </a>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3 mb-3 text-center">
        <div>
          <div className="metric-label">Elapsed</div>
          <div className="text-base font-mono">{safeToFixed(market.seconds_elapsed, 0)}s</div>
        </div>
        <div>
          <div className="metric-label">Left</div>
          <div className="text-base font-mono">{safeToFixed(market.seconds_remaining, 0)}s</div>
        </div>
        <div>
          <div className="metric-label">YES</div>
          <div className="text-base font-mono">{safeToFixed(yesPrice, 3)}</div>
        </div>
        <div>
          <div className="metric-label">NO</div>
          <div className="text-base font-mono">{safeToFixed(noPrice, 3)}</div>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(windowPct ?? 0) * 100}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-1.5 text-right">
        {safeToFixed((windowPct ?? 0) * 100, 0)}%
      </p>
    </div>
  );
}
