"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, LineSeries, UTCTimestamp, ColorType, CrosshairMode } from "lightweight-charts";

// ── Types ────────────────────────────────────────────────────────
interface BotState {
  updated_at: string;
  uptime_seconds: number;
  active_seconds: number;
  paused_seconds: number;
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
  api_health_log?: ApiHealthEntry[];
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
  slug?: string;
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

interface ApiHealthEntry {
  time: string;
  provider: string;
  event: string;
  detail: string;
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
  if (s <= 0) return "0s";
  const days = Math.floor(s / 86400);
  const hrs = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  if (days > 0) return `${days}d ${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
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

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-3xl mb-4">⚡</div>
          <p className="text-gray-400 text-sm">
            {error ? `Connection error: ${error}` : "Connecting to bot..."}
          </p>
          <p className="text-gray-600 text-xs mt-2">
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

  // CLOB WS status logic
  const clobStatus = getClobWsStatus(state);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight">⚡ BTC 5-Min Paper Trader</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs text-gray-500">
            {fmtTime(state.updated_at)}
          </span>
          <span className={`status-dot ${error ? "red" : "green"}`} />
        </div>
      </div>

      {/* Uptime Bar */}
      <div className="uptime-bar">
        <div className="uptime-item">
          <span className="uptime-label">Total</span>
          <span className="uptime-value">{fmtUptime(state.uptime_seconds)}</span>
        </div>
        <div className="uptime-item">
          <span className="uptime-label">Active</span>
          <span className="uptime-value text-green-400">{fmtUptime(state.active_seconds)}</span>
        </div>
        <div className="uptime-item">
          <span className="uptime-label">Paused</span>
          <span className="uptime-value text-red-400">{fmtUptime(state.paused_seconds)}</span>
        </div>
      </div>

      {/* Paused Banner */}
      {state.bot_paused && (
        <div className="paused-banner flex items-center gap-2">
          <span className="text-lg">🚨</span>
          <div>
            <p className="font-semibold text-red-400 text-sm">BOT PAUSED</p>
            <p className="text-xs text-red-300/70">
              APIs down or stale. No trades until recovery.
            </p>
          </div>
        </div>
      )}

      {/* Live Prices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
      <div className="grid grid-cols-3 gap-2">
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

      {/* Market Window */}
      {mkt && (
        <div className="card">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <h2 className="text-sm sm:text-base font-semibold truncate max-w-[70%]">📊 {mkt.title}</h2>
            {mkt.slug && (
              <a
                href={`https://polymarket.com/event/${mkt.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:underline shrink-0"
              >
                Polymarket ↗
              </a>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 mb-2 text-center">
            <div>
              <div className="metric-label">Elapsed</div>
              <div className="text-sm font-mono">{mkt.seconds_elapsed.toFixed(0)}s</div>
            </div>
            <div>
              <div className="metric-label">Left</div>
              <div className="text-sm font-mono">{mkt.seconds_remaining.toFixed(0)}s</div>
            </div>
            <div>
              <div className="metric-label">YES</div>
              <div className="text-sm font-mono">{state.yes_price.toFixed(3)}</div>
            </div>
            <div>
              <div className="metric-label">NO</div>
              <div className="text-sm font-mono">{state.no_price.toFixed(3)}</div>
            </div>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${windowPct * 100}%` }} />
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-right">
            {(windowPct * 100).toFixed(0)}%
          </p>
        </div>
      )}

      {/* Account Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(MODE_CONFIG).map(([mode, cfg]) => {
          const acct = accounts[mode];
          if (!acct) return null;
          return (
            <div key={mode} className="card">
              <h3 className={`text-sm font-semibold mb-2 ${cfg.cls}`}>
                {cfg.emoji} {acct.label}
              </h3>
              <div className="space-y-1 text-xs">
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
                  <div className="mt-1 p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-[11px]">
                    🔄 <strong>{acct.pending_trade.side}</strong> @{" "}
                    {acct.pending_trade.pm_price.toFixed(4)} ({fmtUsd(acct.pending_trade.size_usdc)})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equity Chart — TradingView lightweight-charts */}
      <div className="card">
        <h2 className="text-sm sm:text-base font-semibold mb-2">📉 Equity Over Time</h2>
        <EquityChart accounts={accounts} />
      </div>

      {/* Trade Events */}
      <div className="card">
        <h2 className="text-sm sm:text-base font-semibold mb-2">📋 Trade & Signal Log</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <summary className="cursor-pointer text-sm font-semibold">📝 Raw Decision Log</summary>
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
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
                <div key={i} className="text-[10px] sm:text-xs font-mono text-gray-400" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {icon[entry.action] || "ℹ️"} [{fmtTime(entry.time)}] {entry.strategy?.padEnd(15)} | {entry.reason}{entry.slug ? ` | ${entry.slug}` : ""}
                </div>
              );
            })}
        </div>
      </details>

      {/* System Health */}
      <div className="card">
        <h2 className="text-sm sm:text-base font-semibold mb-2">🏥 System Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
            ok={!!mkt?.slug}
            status={mkt?.slug ? "Found" : "Searching..."}
            detail="Gamma API"
          />
        </div>
      </div>

      {/* API Health Log */}
      {(state.api_health_log || []).length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold">
            📡 API Health Log ({state.api_health_log!.length})
          </summary>
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {(state.api_health_log || [])
              .slice()
              .reverse()
              .map((entry, i) => {
                const icon: Record<string, string> = {
                  SYSTEM: "⚙️", CHAINLINK: "⛓️", CLOB_WS: "📡", BINANCE: "🅱️",
                };
                return (
                  <div key={i} className="text-[10px] sm:text-xs font-mono text-gray-400 truncate">
                    {icon[entry.provider] || "📡"} [{fmtTime(entry.time)}] {entry.event}: {entry.detail}
                  </div>
                );
              })}
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="text-center text-[10px] text-gray-600 py-1">
        Polling {API_URL} every {REFRESH_MS / 1000}s • {lastFetch ? new Date(lastFetch).toLocaleTimeString() : ""}
      </div>
    </div>
  );
}

// ── CLOB WS Status Helper ────────────────────────────────────────
function getClobWsStatus(state: BotState) {
  const hasMarket = !!state.current_market;
  const connected = state.clob_ws_connected;
  const secsSince = state.clob_ws_seconds_since_update;

  if (!connected) {
    return { ok: false, warning: false, status: "Disconnected", detail: "Not connected" };
  }
  if (!hasMarket) {
    return { ok: true, warning: true, status: "Idle", detail: "No active market" };
  }
  if (secsSince > 60) {
    return { ok: false, warning: false, status: "Stale", detail: `${secsSince.toFixed(0)}s ago` };
  }
  return { ok: true, warning: false, status: "Connected", detail: `${secsSince.toFixed(0)}s ago` };
}

// ── TradingView Chart Component ──────────────────────────────────
function EquityChart({ accounts }: { accounts: Record<string, AccountData> }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const initialRangeSet = useRef(false);
  const prevDataLen = useRef(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)" },
        horzLines: { color: "rgba(30, 41, 59, 0.5)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true },
      width: chartContainerRef.current.clientWidth,
      height: 280,
    });

    chartRef.current = chart;
    initialRangeSet.current = false;

    // Add series for each mode
    const newSeries = new Map<string, ISeriesApi<"Line">>();
    for (const [mode, cfg] of Object.entries(MODE_CONFIG)) {
      const acct = accounts[mode];
      if (!acct) continue;
      const series = chart.addSeries(LineSeries, {
        color: cfg.color,
        lineWidth: 2,
        title: acct.label,
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
        crosshairMarkerVisible: true,
        lastValueVisible: true,
      });
      newSeries.set(mode, series);
    }
    seriesRefs.current = newSeries;

    // Resize handler
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data when accounts change — without resetting scroll position
  useEffect(() => {
    if (!chartRef.current) return;

    let hasData = false;
    let totalLen = 0;
    for (const [mode] of Object.entries(MODE_CONFIG)) {
      const acct = accounts[mode];
      const series = seriesRefs.current.get(mode);
      if (!acct || !series) continue;

      const history = acct.equity_history || [];
      if (history.length === 0) continue;
      hasData = true;
      totalLen += history.length;

      const data = history
        .map((pt) => ({
          time: pt.ts as UTCTimestamp,
          value: pt.equity,
        }))
        .sort((a, b) => a.time - b.time);

      series.setData(data);
    }

    // Only set visible range on FIRST data load — never reset user's scroll
    if (hasData && !initialRangeSet.current && chartRef.current) {
      initialRangeSet.current = true;
      const threeHoursAgo = (Math.floor(Date.now() / 1000) - 3 * 3600) as UTCTimestamp;
      const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
      try {
        chartRef.current.timeScale().setVisibleRange({
          from: threeHoursAgo,
          to: now,
        });
      } catch {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [accounts]);

  return (
    <div ref={chartContainerRef} className="chart-container" />
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
      <div className="metric-label mb-0.5">
        {icon} {label}
      </div>
      <div className={`metric-value ${valueColor || ""}`}>{value}</div>
      {sublabel && <div className="text-[10px] text-red-400 mt-0.5">{sublabel}</div>}
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
    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/[0.02]">
      <span className={`status-dot ${dotColor}`} />
      <div className="min-w-0">
        <div className="text-[10px] sm:text-xs font-medium truncate">{label}</div>
        <div className={`text-[10px] sm:text-xs ${textColor}`}>{status}</div>
        <div className="text-[9px] text-gray-500 truncate">{detail}</div>
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
    <div className="min-w-0">
      <h3 className={`text-xs sm:text-sm font-semibold mb-1 ${config.cls}`}>
        {config.emoji} {acct.label}
      </h3>

      {/* Waiting */}
      {deferred.length > 0 && (
        <div className="mb-1">
          <div className="text-[10px] font-medium text-purple-400 mb-0.5">⏳ Waiting ({deferred.length})</div>
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
            <div className="text-gray-500 text-[10px] mt-0.5">
              BN: ${e.binance_btc_move?.toFixed(0)} | CL: ${e.chainlink_btc_move?.toFixed(0)} | T: {e.tick}s
            </div>
            <div className="text-gray-600 text-[9px]">{fmtTime(e.time)}</div>
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
            <span className="text-gray-400 text-[10px]">{e.reject_reason}</span>
            <div className="text-gray-600 text-[9px]">{fmtTime(e.time)}</div>
          </div>
        )}
      />

      {!wins.length && !losses.length && !entries.length && !nearMisses.length && !deferred.length && (
        <p className="text-gray-600 text-[10px]">No events yet...</p>
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
    <div className="mb-1.5">
      <div className="text-[10px] sm:text-xs font-medium text-gray-300 mb-0.5">
        {title} ({count})
      </div>
      {preview.map((e, i) => (
        <div key={i}>{renderEvent(e)}</div>
      ))}
      {rest.length > 0 && (
        <>
          <button
            onClick={onToggle}
            className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer mt-0.5"
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
