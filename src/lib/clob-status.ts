import type { BotState } from "@/types";

/** Backend may send 999 or similar as "no update yet" — don't display as literal seconds */
const SUSPICIOUS_SECS = 999;
const MAX_REASONABLE_SECS = 600; // 10 min

function formatSecsAgo(secs: number): string {
  if (typeof secs !== "number" || !Number.isFinite(secs) || secs >= MAX_REASONABLE_SECS || secs >= SUSPICIOUS_SECS) {
    return "No recent update";
  }
  return `${Math.round(secs)}s ago`;
}

export function getClobWsStatus(state: BotState) {
  const hasMarket = !!state.current_market;
  const connected = state.clob_ws_connected;
  const secsSince = state.clob_ws_seconds_since_update ?? 0;

  if (!connected) {
    return { ok: false, warning: false, status: "Disconnected", detail: "Not connected" };
  }
  if (!hasMarket) {
    return { ok: true, warning: true, status: "Idle", detail: "No active market" };
  }
  const detail = formatSecsAgo(secsSince);
  if (secsSince > 60 || secsSince >= SUSPICIOUS_SECS || !Number.isFinite(secsSince)) {
    return { ok: false, warning: false, status: "Stale", detail };
  }
  return { ok: true, warning: false, status: "Connected", detail };
}
