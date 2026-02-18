import type { ModeConfig } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const REFRESH_MS = 2000;
/** Min BTC move ($) to enter — matches strategy btc_move_threshold */
export const THRESHOLD = 17.0;
/** BTC move ($) above which we use full 5% size — matches strategy scaling_threshold */
export const THRESHOLD_FULL = 44.0;

export const MODE_CONFIG: Record<string, ModeConfig> = {
  binance_only: { emoji: "🟡", color: "#FFD700", cls: "mode-binance" },
  chainlink_only: { emoji: "🔵", color: "#42A5F5", cls: "mode-chainlink" },
  dual: { emoji: "🟢", color: "#00E676", cls: "mode-dual" },
};
