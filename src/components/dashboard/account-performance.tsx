import type { AccountData } from "@/types";
import { MODE_CONFIG } from "@/config/constants";
import { fmtUsd } from "@/lib/format";

interface AccountPerformanceProps {
  accounts: Record<string, AccountData>;
}

export function AccountPerformance({ accounts }: AccountPerformanceProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Object.entries(MODE_CONFIG).map(([mode, cfg]) => {
        const acct = accounts[mode];
        if (!acct) return null;
        return (
          <div key={mode} className="card">
            <h3 className={`text-base font-semibold mb-3 ${cfg.cls}`}>
              {cfg.emoji} {acct.label}
            </h3>
            <div className="space-y-1.5 text-sm">
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
                <div className="mt-1.5 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-xs">
                  🔄 <strong>{acct.pending_trade.side}</strong> @{" "}
                  {acct.pending_trade.pm_price.toFixed(4)} ({fmtUsd(acct.pending_trade.size_usdc)})
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
