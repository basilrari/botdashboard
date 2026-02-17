"use client";

import { useState } from "react";
import type { AccountData, DeferredResolution, TradeEvent } from "@/types";
import type { ModeConfig } from "@/types";
import { fmtTime, fmtUsd } from "@/lib/format";
import { EventSection } from "./event-section";

interface TradeColumnProps {
  acct: AccountData;
  config: ModeConfig;
  mode: string;
  deferred: DeferredResolution[];
}

export function TradeColumn({ acct, config, mode, deferred }: TradeColumnProps) {
  const events = acct.trade_events || [];
  const wins = events.filter((e) => e.type === "RESOLUTION" && e.result === "WIN");
  const losses = events.filter((e) => e.type === "RESOLUTION" && e.result === "LOSS");
  const entries = events.filter((e) => e.type === "ENTRY");
  const nearMisses = events
    .filter((e) => e.type === "NEAR_MISS")
    .filter((e) => !(acct.label === "Dual (Both)" && e.reject_reason?.includes("disagrees")));

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-w-0">
      <h3 className={`text-sm sm:text-base font-semibold mb-2 ${config.cls}`}>
        {config.emoji} {acct.label}
      </h3>

      {deferred.length > 0 && (
        <div className="mb-1">
          <div className="text-xs font-medium text-purple-400 mb-1">⏳ Waiting ({deferred.length})</div>
          {deferred.map((d, i) => {
            const secsToCheck = Math.max(0, d.check_after - Date.now() / 1000);
            return (
              <div key={i} className="trade-card waiting">
                <strong>{d.strategy}</strong> — {d.side} @ {d.entry_price.toFixed(4)}
                <br />
                {fmtUsd(d.size_usdc)} • ~{(secsToCheck / 60).toFixed(0)}m
              </div>
            );
          })}
        </div>
      )}

      <EventSection
        title="✅ Wins"
        count={wins.length}
        events={wins}
        expanded={expandedSection === "wins"}
        onToggle={() => toggleSection("wins")}
        renderEvent={(e) => (
          <div className="trade-card win">
            <span className="text-green-400 font-semibold">+{fmtUsd(e.pnl)}</span>
            {e.fee ? <span className="text-gray-500 text-[10px]"> (fee {fmtUsd(e.fee)})</span> : null}
            <span className="text-gray-500"> {e.pct_return?.toFixed(1)}%</span>
            <br />
            <span className="text-gray-400 text-[10px]">
              {e.strategy} | {e.side} @ {e.entry_price?.toFixed(4)} | W: {e.winning_side}
            </span>
            {(e.binance_btc_move != null || e.size_usdc != null) && (
              <div className="text-gray-500 text-[10px] mt-0.5">
                BN: ${e.binance_btc_move?.toFixed(0)} | CL: ${e.chainlink_btc_move?.toFixed(0)} | {fmtUsd(e.size_usdc)}
              </div>
            )}
            <div className="text-gray-600 text-[9px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      <EventSection
        title="❌ Losses"
        count={losses.length}
        events={losses}
        expanded={expandedSection === "losses"}
        onToggle={() => toggleSection("losses")}
        renderEvent={(e) => (
          <div className="trade-card loss">
            <span className="text-red-400 font-semibold">{fmtUsd(e.pnl)}</span>
            <br />
            <span className="text-gray-400 text-[10px]">
              {e.strategy} | {e.side} @ {e.entry_price?.toFixed(4)} | W: {e.winning_side}
            </span>
            {(e.binance_btc_move != null || e.size_usdc != null) && (
              <div className="text-gray-500 text-[10px] mt-0.5">
                BN: ${e.binance_btc_move?.toFixed(0)} | CL: ${e.chainlink_btc_move?.toFixed(0)} | {fmtUsd(e.size_usdc)}
              </div>
            )}
            <div className="text-gray-600 text-[9px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      <EventSection
        title="📈 Entries"
        count={entries.length}
        events={entries}
        expanded={expandedSection === "entries"}
        onToggle={() => toggleSection("entries")}
        renderEvent={(e) => (
          <div className="trade-card entry">
            <strong>{e.side}</strong> @ {e.entry_price?.toFixed(4)}
            <span className="text-gray-500"> ({fmtUsd(e.size_usdc)})</span>
            <div className="text-gray-500 text-[10px] mt-0.5">
              BN: ${e.binance_btc_move?.toFixed(0)} | CL: ${e.chainlink_btc_move?.toFixed(0)} | T: {e.tick}s
            </div>
            <div className="text-gray-600 text-[9px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      <EventSection
        title="⚠️ Near Misses"
        count={nearMisses.length}
        events={nearMisses}
        expanded={expandedSection === "near_misses"}
        onToggle={() => toggleSection("near_misses")}
        renderEvent={(e) => (
          <div className="trade-card near-miss">
            <span className="text-gray-400 text-sm">{e.reject_reason}</span>
            <div className="text-gray-600 text-xs mt-1">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      {!wins.length && !losses.length && !entries.length && !nearMisses.length && !deferred.length && (
        <p className="text-gray-600 text-sm">No events yet...</p>
      )}
    </div>
  );
}
