import { fmtTime } from "@/lib/format";

interface DashboardHeaderProps {
  updatedAt: string;
  hasError: boolean;
}

export function DashboardHeader({ updatedAt, hasError }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">⚡ BTC 5-Min Paper Trader</h1>
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm text-gray-500">{fmtTime(updatedAt)}</span>
        <span className={`status-dot ${hasError ? "red" : "green"}`} />
      </div>
    </div>
  );
}
