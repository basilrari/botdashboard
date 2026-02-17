"use client";

import { useBotState } from "@/hooks/use-bot-state";
import { THRESHOLD, MODE_CONFIG } from "@/config/constants";
import { fmtUsd } from "@/lib/format";
import {
  MetricCard,
  EquityChart,
  TradeColumn,
  DashboardHeader,
  UptimeBar,
  PausedBanner,
  MarketWindow,
  AccountPerformance,
  DecisionLog,
  SystemHealth,
  ApiHealthLog,
  DashboardFooter,
  LoadingState,
} from "@/components";

export default function Dashboard() {
  const { state, error, lastFetch } = useBotState();

  if (!state) {
    return <LoadingState error={error} />;
  }

  const mkt = state.current_market;
  const accounts = state.accounts || {};
  const btcMove = state.btc_move || 0;
  const clMove = state.chainlink_btc_move || 0;
  const spread = Math.abs((state.btc_price || 0) - (state.chainlink_btc_price || 0));
  const windowPct = mkt ? Math.min(1, Math.max(0, mkt.seconds_elapsed / 300)) : 0;

  return (
    <div className="dashboard-container">
      <DashboardHeader updatedAt={state.updated_at} hasError={!!error} />

      <UptimeBar
        uptimeSeconds={state.uptime_seconds}
        activeSeconds={state.active_seconds}
        pausedSeconds={state.paused_seconds}
      />

      {state.bot_paused && <PausedBanner />}

      {/* Live Prices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon="⛓️"
          label="Chainlink BTC"
          value={state.chainlink_btc_price ? fmtUsd(state.chainlink_btc_price) : "STALE"}
          sublabel={state.rtds_stale ? `⚠️ ${state.rtds_seconds_since_update.toFixed(0)}s` : undefined}
          alert={state.rtds_stale}
        />
        <MetricCard icon="🅱️" label="Binance BTC" value={fmtUsd(state.btc_price)} />
        <MetricCard icon="📊" label="Spread" value={fmtUsd(spread)} />
        <MetricCard
          icon="🎯"
          label="Price to Beat"
          value={mkt?.btc_start_price ? fmtUsd(mkt.btc_start_price) : "—"}
        />
      </div>

      {/* BTC Moves */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          icon={Math.abs(btcMove) >= THRESHOLD ? "✅" : "❌"}
          label="BN Move"
          value={`$${btcMove >= 0 ? "+" : ""}${btcMove.toFixed(0)}`}
          valueColor={Math.abs(btcMove) >= THRESHOLD ? "text-green-400" : "text-gray-400"}
        />
        <MetricCard
          icon={Math.abs(clMove) >= THRESHOLD ? "✅" : "❌"}
          label="CL Move"
          value={`$${clMove >= 0 ? "+" : ""}${clMove.toFixed(0)}`}
          valueColor={Math.abs(clMove) >= THRESHOLD ? "text-green-400" : "text-gray-400"}
        />
        <MetricCard
          icon={Math.abs(btcMove) >= THRESHOLD && Math.abs(clMove) >= THRESHOLD ? "✅" : "⏳"}
          label="Dual ±$26"
          value={Math.abs(btcMove) >= THRESHOLD && Math.abs(clMove) >= THRESHOLD ? "YES" : "No"}
          valueColor={Math.abs(btcMove) >= THRESHOLD && Math.abs(clMove) >= THRESHOLD ? "text-green-400" : "text-yellow-400"}
        />
      </div>

      {mkt && (
        <MarketWindow
          market={mkt}
          yesPrice={state.yes_price}
          noPrice={state.no_price}
          windowPct={windowPct}
        />
      )}

      <AccountPerformance accounts={accounts} />

      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold mb-3">📉 Equity Over Time</h2>
        <EquityChart accounts={accounts} />
      </div>

      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold mb-3">📋 Trade & Signal Log</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(MODE_CONFIG).map(([mode, cfg]) => {
            const acct = accounts[mode];
            if (!acct) return null;
            const deferred = (state.deferred_resolutions || []).filter((d) => d.mode === mode);
            return (
              <TradeColumn
                key={mode}
                acct={acct}
                config={cfg}
                mode={mode}
                deferred={deferred}
              />
            );
          })}
        </div>
      </div>

      <DecisionLog entries={state.decision_log || []} />

      <SystemHealth state={state} market={mkt ?? null} />

      {(state.api_health_log || []).length > 0 && (
        <ApiHealthLog entries={state.api_health_log!} />
      )}

      <DashboardFooter lastFetch={lastFetch} />
    </div>
  );
}
