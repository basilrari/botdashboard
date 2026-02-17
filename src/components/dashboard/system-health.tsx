import type { BotState } from "@/types";
import type { MarketInfo } from "@/types";
import { HealthCard } from "@/components/ui";
import { getClobWsStatus } from "@/lib/clob-status";
import { safeToFixed } from "@/lib/format";

interface SystemHealthProps {
  state: BotState;
  market: MarketInfo | null;
}

export function SystemHealth({ state, market }: SystemHealthProps) {
  const clobStatus = getClobWsStatus(state);

  return (
    <div className="card">
      <h2 className="text-base sm:text-lg font-semibold mb-3">🏥 System Health</h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <HealthCard
          label="RTDS WebSocket"
          ok={state.rtds_connected && !state.rtds_stale}
          status={
            state.rtds_connected && !state.rtds_stale
              ? "Live"
              : state.rtds_connected
                ? "STALE"
                : "Disconnected"
          }
          detail={state.rtds_seconds_since_update != null ? `${safeToFixed(state.rtds_seconds_since_update, 0)}s ago` : "—"}
        />
        <HealthCard
          label="Binance API"
          ok={state.btc_price != null}
          status={state.btc_price != null ? "Receiving" : "No data"}
          detail="BTC/USDT"
        />
        <HealthCard
          label="CLOB WebSocket"
          ok={clobStatus.ok}
          warning={clobStatus.warning}
          status={clobStatus.status}
          detail={clobStatus.detail}
        />
        <HealthCard
          label="Bot Status"
          ok={!state.bot_paused}
          status={state.bot_paused ? "PAUSED" : "Trading"}
          detail={state.bot_paused ? "Waiting for APIs" : "All systems go"}
        />
        <HealthCard
          label="Market"
          ok={!!market?.slug}
          status={market?.slug ? "Found" : "Searching..."}
          detail="Gamma API"
        />
      </div>
    </div>
  );
}
