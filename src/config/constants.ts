import type { ModeConfig } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const REFRESH_MS = 2000;
export const THRESHOLD = 26.0;

export const MODE_CONFIG: Record<string, ModeConfig> = {
  binance_only: { emoji: "🟡", color: "#FFD700", cls: "mode-binance" },
  chainlink_only: { emoji: "🔵", color: "#42A5F5", cls: "mode-chainlink" },
  dual: { emoji: "🟢", color: "#00E676", cls: "mode-dual" },
};
