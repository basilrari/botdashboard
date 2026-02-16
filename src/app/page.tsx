"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────
interface BotState {
  updated_at: string;
  uptime_seconds: number;
  bot_paused: boolean;
  btc_price: number | null;
  chainlink_btc_price: number | null;
  rtds_connected: boolean;
  rtds_stale: boolean;
  rtds_seconds_since_update: number;
  clob_ws_connected: boolean;
  clob_ws_seconds_since_update: number;
  yes_price: number;
  no_price: number;
  btc_move: number;
  chainlink_btc_move: number;
  delta_pct: number;
  current_market: MarketInfo | null;
  accounts: Record<string, AccountData>;
  decision_log: DecisionEntry[];
  deferred_resolutions: DeferredResolution[];
}

interface MarketInfo {
  title: string;
  slug: string;
  seconds_elapsed: number;
  seconds_remaining: number;
  tick_in_window: number;
  btc_start_price: number;
  btc_current_move: number;
}

interface AccountData {
  label: string;
  mode: string;
  equity: number;
  pnl: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  pending_trade: PendingTrade | null;
  equity_history: { ts: number; equity: number }[];
  trade_events: TradeEvent[];
}

interface PendingTrade {
  side: string;
  pm_price: number;
  size_usdc: number;
}

interface TradeEvent {
  type: string;
  time: string;
  strategy?: string;
  side?: string;
  winning_side?: string;
  entry_price?: number;
  capital_deployed?: number;
  size_usdc?: number;
  pnl?: number;
  fee?: number;
  pct_return?: number;
  equity_after?: number;
  result?: string;
  binance_btc_move?: number;
  chainlink_btc_move?: number;
  reject_reason?: string;
  tick?: number;
  market_slug?: string;
}

interface DecisionEntry {
  time: string;
  action: string;
  reason: string;
  strategy: string;
}

interface DeferredResolution {
  slug: string;
  mode: string;
  strategy: string;
  side: string;
  entry_price: number;
  size_usdc: number;
  queued_at: number;
  check_after: number;
}

// ── Config ───────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const REFRESH_MS = 2000;
const THRESHOLD = 26.0;

// ── Helpers ──────────────────────────────────────────────────────
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso || "?";
  }
}

function fmtUptime(s: number): string {
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  return hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MODE_CONFIG: Record<string, { emoji: string; color: string; cls: string }> = {
  binance_only: { emoji: "🟡", color: "#FFD700", cls: "mode-binance" },
  chainlink_only: { emoji: "🔵", color: "#42A5F5", cls: "mode-chainlink" },
  dual: { emoji: "🟢", color: "#00E676", cls: "mode-dual" },
};

// ── Main Page ────────────────────────────────────────────────────
export default function Dashboard() {
  const [state, setState] = useState<BotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/state`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState(data);
      setError(null);
      setLastFetch(Date.now());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchState]);

  async function sendCommand(action: string) {
    try {
      await fetch(`${API_URL}/api/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {
      /* ignore */
    }
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-gray-400 text-lg">
            {error ? `Connection error: ${error}` : "Connecting to bot..."}
          </p>
          <p className="text-gray-600 text-sm mt-2">
            Make sure the API server is running at {API_URL}
          </p>
        </div>
      </div>
    );
  }

  const mkt = state.current_market;
  const accounts = state.accounts || {};
  const btcMove = state.btc_move || 0;
  const clMove = state.chainlink_btc_move || 0;
  const spread = Math.abs((state.btc_price || 0) - (state.chainlink_btc_price || 0));
  const windowPct = mkt ? Math.min(1, Math.max(0, mkt.seconds_elapsed / 300)) : 0;

  // Build chart data
  const chartData = buildChartData(accounts);

  return (
    <div className="max-w-[1600px] mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">⚡ BTC 5-Min Paper Trader</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            Last update: {fmtTime(state.updated_at)}
          </span>
          <span className={`status-dot ${error ? "red" : "green"}`} />
        </div>
      </div>

      {/* Paused Banner */}
      {state.bot_paused && (
        <div className="paused-banner flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <div>
            <p className="font-semibold text-red-400">BOT PAUSED</p>
            <p className="text-sm text-red-300/70">
              One or more APIs are down or stale. No trades until all feeds recover.
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button className="btn btn-secondary" onClick={() => sendCommand("skip")}>
          ⏭️ Skip Market
        </button>
        <button className="btn btn-danger" onClick={() => sendCommand("stop")}>
          🛑 Stop Bot
        </button>
        <div className="ml-auto flex items-center gap-4 text-sm text-gray-400">
          <span>Uptime: <strong className="text-white">{fmtUptime(state.uptime_seconds)}</strong></span>
        </div>
      </div>

      {/* Live Prices */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon="⛓️"
          label="Chainlink BTC/USD"
          value={state.chainlink_btc_price ? fmtUsd(state.chainlink_btc_price) : "— STALE —"}
          sublabel={state.rtds_stale ? `⚠️ ${state.rtds_seconds_since_update.toFixed(0)}s ago` : undefined}
          alert={state.rtds_stale}
        />
        <MetricCard icon="🅱️" label="Binance BTC/USDT" value={fmtUsd(state.btc_price)} />
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
          label="Binance Move"
          value={`$${btcMove >= 0 ? "+" : ""}${btcMove.toFixed(2)}`}
          valueColor={Math.abs(btcMove) >= THRESHOLD ? "text-green-400" : "text-gray-400"}
        />
        <MetricCard
          icon={Math.abs(clMove) >= THRESHOLD ? "✅" : "❌"}
          label="Chainlink Move"
          value={`$${clMove >= 0 ? "+" : ""}${clMove.toFixed(2)}`}
          valueColor={Math.abs(clMove) >= THRESHOLD ? "text-green-400" : "text-gray-400"}
        />
        <MetricCard
          icon={Math.abs(btcMove) >= THRESHOLD && Math.abs(clMove) >= THRESHOLD ? "✅" : "⏳"}
          label="Dual ±$26"
          value={Math.abs(btcMove) >= THRESHOLD && Math.abs(clMove) >= THRESHOLD ? "CONFIRMED" : "Not yet"}
          valueColor={Math.abs(btcMove) >= THRESHOLD && Math.abs(clMove) >= THRESHOLD ? "text-green-400" : "text-yellow-400"}
        />
      </div>

      {/* Market Window */}
      {mkt && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">📊 {mkt.title}</h2>
            {mkt.slug && (
              <a
                href={`https://polymarket.com/event/${mkt.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                View on Polymarket ↗
              </a>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3 mb-3 text-center">
            <div>
              <div className="metric-label">Elapsed</div>
              <div className="text-lg font-mono">{mkt.seconds_elapsed.toFixed(0)}s</div>
            </div>
            <div>
              <div className="metric-label">Remaining</div>
              <div className="text-lg font-mono">{mkt.seconds_remaining.toFixed(0)}s</div>
            </div>
            <div>
              <div className="metric-label">YES Price</div>
              <div className="text-lg font-mono">{state.yes_price.toFixed(4)}</div>
            </div>
            <div>
              <div className="metric-label">NO Price</div>
              <div className="text-lg font-mono">{state.no_price.toFixed(4)}</div>
            </div>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${windowPct * 100}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">
            {(windowPct * 100).toFixed(0)}% of window elapsed
          </p>
        </div>
      )}

      {/* Account Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(MODE_CONFIG).map(([mode, cfg]) => {
          const acct = accounts[mode];
          if (!acct) return null;
          return (
            <div key={mode} className="card">
              <h3 className={`text-lg font-semibold mb-3 ${cfg.cls}`}>
                {cfg.emoji} {acct.label}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Equity</span>
                  <span className="font-mono font-bold">{fmtUsd(acct.equity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">PnL</span>
                  <span className={`font-mono ${acct.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {acct.pnl >= 0 ? "+" : ""}{fmtUsd(acct.pnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Trades</span>
                  <span className="font-mono">{acct.total_trades} (W:{acct.wins} L:{acct.losses})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="font-mono">
                    {acct.total_trades > 0 ? `${(acct.win_rate * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
                {acct.pending_trade && (
                  <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-sm">
                    🔄 Pending: <strong>{acct.pending_trade.side}</strong> @{" "}
                    {acct.pending_trade.pm_price.toFixed(4)} ({fmtUsd(acct.pending_trade.size_usdc)})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equity Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">📉 Equity Over Time</h2>
          <button className="btn btn-secondary text-xs" onClick={() => sendCommand("reset_chart")}>
            🔄 Reset
          </button>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="time"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "#1e293b" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={{ stroke: "#1e293b" }}
                tickLine={false}
                domain={["dataMin - 1", "dataMax + 1"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Legend />
              <ReferenceLine y={100} stroke="#4b5563" strokeDasharray="3 3" label={{ value: "$100", fill: "#64748b", fontSize: 11 }} />
              {Object.entries(MODE_CONFIG).map(([mode, cfg]) => {
                const acct = accounts[mode];
                if (!acct) return null;
                return (
                  <Line
                    key={mode}
                    type="monotone"
                    dataKey={acct.label}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">Chart will appear after a few minutes of data...</p>
        )}
      </div>

      {/* Trade Events */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">📋 Trade & Signal Log</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Decision Log */}
      <details className="card">
        <summary className="cursor-pointer text-lg font-semibold">📝 Raw Decision Log</summary>
        <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
          {(state.decision_log || [])
            .slice()
            .reverse()
            .slice(0, 20)
            .map((entry, i) => {
              const icon: Record<string, string> = {
                TRADE: "📈", WIN: "✅", LOSS: "❌", NEW_MARKET: "🔄",
                SKIP: "⏭️", WAIT: "⏳", STOP: "🛑", EXPIRED: "⏰",
                PAUSED: "🚨", RESUMED: "▶️",
              };
              return (
                <div key={i} className="text-xs font-mono text-gray-400">
                  {icon[entry.action] || "ℹ️"} [{fmtTime(entry.time)}] {entry.strategy?.padEnd(15)} | {entry.reason}
                </div>
              );
            })}
        </div>
      </details>

      {/* System Health */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">🏥 System Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
            detail={`${state.rtds_seconds_since_update.toFixed(0)}s ago`}
          />
          <HealthCard
            label="Binance API"
            ok={state.btc_price != null}
            status={state.btc_price != null ? "Receiving" : "No data"}
            detail="BTC/USDT"
          />
          <HealthCard
            label="CLOB WebSocket"
            ok={state.clob_ws_connected && state.clob_ws_seconds_since_update < 900}
            warning={state.clob_ws_seconds_since_update >= 900}
            status={
              state.clob_ws_seconds_since_update >= 900
                ? "Awaiting"
                : state.clob_ws_connected
                  ? "Live"
                  : "Reconnecting"
            }
            detail={
              state.clob_ws_seconds_since_update >= 900
                ? "Waiting for market data"
                : `${state.clob_ws_seconds_since_update.toFixed(0)}s ago`
            }
          />
          <HealthCard
            label="Bot Status"
            ok={!state.bot_paused}
            status={state.bot_paused ? "PAUSED" : "Trading"}
            detail={state.bot_paused ? "Waiting for APIs" : "All systems go"}
          />
          <HealthCard
            label="Market"
            ok={!!mkt?.slug}
            status={mkt?.slug ? "Found" : "Searching..."}
            detail="Gamma API"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 py-2">
        Polling {API_URL} every {REFRESH_MS / 1000}s • {lastFetch ? `Last fetch: ${new Date(lastFetch).toLocaleTimeString()}` : ""}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sublabel,
  alert,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  sublabel?: string;
  alert?: boolean;
  valueColor?: string;
}) {
  return (
    <div className={`card ${alert ? "border-red-500/50" : ""}`}>
      <div className="metric-label mb-1">
        {icon} {label}
      </div>
      <div className={`metric-value ${valueColor || ""}`}>{value}</div>
      {sublabel && <div className="text-xs text-red-400 mt-1">{sublabel}</div>}
    </div>
  );
}

function HealthCard({
  label,
  ok,
  status,
  detail,
  warning,
}: {
  label: string;
  ok: boolean;
  status: string;
  detail: string;
  warning?: boolean;
}) {
  const dotColor = warning ? "yellow" : ok ? "green" : "red";
  const textColor = warning ? "text-yellow-400" : ok ? "text-green-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
      <span className={`status-dot ${dotColor}`} />
      <div>
        <div className="text-xs font-medium">{label}</div>
        <div className={`text-xs ${textColor}`}>{status}</div>
        <div className="text-[10px] text-gray-500">{detail}</div>
      </div>
    </div>
  );
}

function TradeColumn({
  acct,
  config,
  mode,
  deferred,
}: {
  acct: AccountData;
  config: { emoji: string; color: string; cls: string };
  mode: string;
  deferred: DeferredResolution[];
}) {
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
    <div>
      <h3 className={`font-semibold mb-2 ${config.cls}`}>
        {config.emoji} {acct.label}
      </h3>

      {/* Waiting */}
      {deferred.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-purple-400 mb-1">⏳ Waiting ({deferred.length})</div>
          {deferred.map((d, i) => {
            const secsToCheck = Math.max(0, d.check_after - Date.now() / 1000);
            return (
              <div key={i} className="trade-card waiting">
                <strong>{d.strategy}</strong> — {d.side} @ {d.entry_price.toFixed(4)}
                <br />
                {fmtUsd(d.size_usdc)} • Check in ~{(secsToCheck / 60).toFixed(0)}m
              </div>
            );
          })}
        </div>
      )}

      {/* Wins */}
      <EventSection
        title="✅ Wins"
        count={wins.length}
        events={wins}
        expanded={expandedSection === "wins"}
        onToggle={() => toggleSection("wins")}
        renderEvent={(e) => (
          <div className="trade-card win">
            <span className="text-green-400 font-semibold">+{fmtUsd(e.pnl)}</span>
            {e.fee ? <span className="text-gray-500 text-xs"> (fee {fmtUsd(e.fee)})</span> : null}
            <span className="text-gray-500"> {e.pct_return?.toFixed(1)}%</span>
            <br />
            <span className="text-gray-400 text-xs">
              {e.strategy} | {e.side} @ {e.entry_price?.toFixed(4)} | Winner: {e.winning_side}
            </span>
            {(e.binance_btc_move != null || e.size_usdc != null) && (
              <div className="text-gray-500 text-xs mt-1">
                BN: ${e.binance_btc_move?.toFixed(0)} | CL: ${e.chainlink_btc_move?.toFixed(0)} | Size: {fmtUsd(e.size_usdc)}
              </div>
            )}
            <div className="text-gray-600 text-[10px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      {/* Losses */}
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
            <span className="text-gray-400 text-xs">
              {e.strategy} | {e.side} @ {e.entry_price?.toFixed(4)} | Winner: {e.winning_side}
            </span>
            {(e.binance_btc_move != null || e.size_usdc != null) && (
              <div className="text-gray-500 text-xs mt-1">
                BN: ${e.binance_btc_move?.toFixed(0)} | CL: ${e.chainlink_btc_move?.toFixed(0)} | Size: {fmtUsd(e.size_usdc)}
              </div>
            )}
            <div className="text-gray-600 text-[10px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      {/* Entries */}
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
            <div className="text-gray-500 text-xs mt-1">
              BN: ${e.binance_btc_move?.toFixed(0)} | CL: ${e.chainlink_btc_move?.toFixed(0)} | Tick: {e.tick}s
            </div>
            <div className="text-gray-600 text-[10px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      {/* Near Misses */}
      <EventSection
        title="⚠️ Near Misses"
        count={nearMisses.length}
        events={nearMisses}
        expanded={expandedSection === "near_misses"}
        onToggle={() => toggleSection("near_misses")}
        renderEvent={(e) => (
          <div className="trade-card near-miss">
            <span className="text-gray-400 text-xs">{e.reject_reason}</span>
            <div className="text-gray-600 text-[10px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      {!wins.length && !losses.length && !entries.length && !nearMisses.length && !deferred.length && (
        <p className="text-gray-600 text-xs">No events yet...</p>
      )}
    </div>
  );
}

function EventSection({
  title,
  count,
  events,
  expanded,
  onToggle,
  renderEvent,
}: {
  title: string;
  count: number;
  events: TradeEvent[];
  expanded: boolean;
  onToggle: () => void;
  renderEvent: (e: TradeEvent) => React.ReactNode;
}) {
  if (count === 0) return null;
  const sorted = [...events].sort((a, b) => (b.time || "").localeCompare(a.time || ""));
  const preview = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="mb-2">
      <div className="text-xs font-medium text-gray-300 mb-1">
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
            <div className="max-h-64 overflow-y-auto mt-1">
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

// ── Chart data builder ───────────────────────────────────────────
function buildChartData(accounts: Record<string, AccountData>) {
  const timeMap: Record<number, Record<string, number>> = {};

  for (const [, acct] of Object.entries(accounts)) {
    for (const pt of acct.equity_history || []) {
      if (!timeMap[pt.ts]) timeMap[pt.ts] = {};
      timeMap[pt.ts][acct.label] = pt.equity;
    }
  }

  return Object.entries(timeMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([ts, values]) => ({
      time: new Date(Number(ts) * 1000).toLocaleTimeString(),
      ...values,
    }));
}
