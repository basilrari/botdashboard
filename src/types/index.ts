export interface BotState {
  updated_at: string;
  uptime_seconds: number;
  active_seconds: number;
  paused_seconds: number;
  total_rtds_down_seconds?: number;
  bot_paused: boolean;
  btc_price: number | null;
  chainlink_btc_price: number | null;
  rtds_connected: boolean;
  rtds_stale: boolean;
  rtds_seconds_since_update: number | null;
  clob_ws_connected: boolean;
  clob_ws_seconds_since_update: number | null;
  yes_price: number;
  no_price: number;
  btc_move: number;
  chainlink_btc_move: number;
  delta_pct: number;
  current_market: MarketInfo | null;
  accounts: Record<string, AccountData>;
  decision_log: DecisionEntry[];
  deferred_resolutions: DeferredResolution[];
  resolution_timeout_notifications?: ResolutionTimeoutNotification[];
  api_health_log?: ApiHealthEntry[];
}

export interface ResolutionTimeoutNotification {
  slug: string;
  mode: string;
  at: string;
  message: string;
  side?: string;
  size_usdc?: number;
}

export interface MarketInfo {
  title: string;
  slug: string;
  seconds_elapsed: number;
  seconds_remaining: number;
  tick_in_window: number;
  btc_start_price: number;
  btc_current_move: number;
}

export interface AccountData {
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

export interface PendingTrade {
  side: string;
  pm_price: number;
  size_usdc: number;
}

export interface TradeEvent {
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

export interface DecisionEntry {
  time: string;
  action: string;
  reason: string;
  strategy: string;
  slug?: string;
}

export interface DeferredResolution {
  slug: string;
  mode: string;
  strategy: string;
  side: string;
  entry_price: number;
  size_usdc: number;
  queued_at: number;
  check_after: number;
}

export interface ApiHealthEntry {
  time: string;
  provider: string;
  event: string;
  detail: string;
}

export interface ModeConfig {
  emoji: string;
  color: string;
  cls: string;
}
