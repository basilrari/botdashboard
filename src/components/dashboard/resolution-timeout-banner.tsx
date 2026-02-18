import type { ResolutionTimeoutNotification } from "@/types";

interface ResolutionTimeoutBannerProps {
  notifications: ResolutionTimeoutNotification[];
}

export function ResolutionTimeoutBanner({ notifications }: ResolutionTimeoutBannerProps) {
  if (!notifications?.length) return null;

  return (
    <div className="resolution-timeout-banner">
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div className="min-w-0">
          <p className="font-semibold text-amber-400 text-sm sm:text-base">
            Resolution timeout (no result after 2 hours)
          </p>
          <ul className="mt-1 text-xs sm:text-sm text-amber-200/80 space-y-0.5">
            {notifications.slice(-10).reverse().map((n, i) => (
              <li key={`${n.slug}-${n.mode}-${n.at}-${i}`}>
                {n.message}
                {n.size_usdc != null && ` ($${n.size_usdc})`}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
