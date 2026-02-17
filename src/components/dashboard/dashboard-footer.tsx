import { API_URL, REFRESH_MS } from "@/config/constants";

interface DashboardFooterProps {
  lastFetch: number;
}

export function DashboardFooter({ lastFetch }: DashboardFooterProps) {
  return (
    <div className="text-center text-xs text-gray-600 py-2">
      Polling {API_URL} every {REFRESH_MS / 1000}s • {lastFetch ? new Date(lastFetch).toLocaleTimeString() : ""}
    </div>
  );
}
