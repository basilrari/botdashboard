import { fmtUptime } from "@/lib/format";

interface UptimeBarProps {
  uptimeSeconds: number;
  activeSeconds: number;
  pausedSeconds: number;
  rtdsDownSeconds?: number;
}

export function UptimeBar({ uptimeSeconds, activeSeconds, pausedSeconds, rtdsDownSeconds = 0 }: UptimeBarProps) {
  return (
    <div className="uptime-bar">
      <div className="uptime-item">
        <span className="uptime-label">Total</span>
        <span className="uptime-value">{fmtUptime(uptimeSeconds)}</span>
      </div>
      <div className="uptime-item">
        <span className="uptime-label">Active</span>
        <span className="uptime-value text-green-400">{fmtUptime(activeSeconds)}</span>
      </div>
      <div className="uptime-item">
        <span className="uptime-label">Paused</span>
        <span className="uptime-value text-red-400">{fmtUptime(pausedSeconds)}</span>
      </div>
      <div className="uptime-item">
        <span className="uptime-label">RTDS down</span>
        <span className="uptime-value text-amber-400">{fmtUptime(rtdsDownSeconds)}</span>
      </div>
    </div>
  );
}
