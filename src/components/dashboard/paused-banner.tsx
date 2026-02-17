export function PausedBanner() {
  return (
    <div className="paused-banner flex items-center gap-2">
      <span className="text-xl">🚨</span>
      <div>
        <p className="font-semibold text-red-400 text-base">BOT PAUSED</p>
        <p className="text-sm text-red-300/70">
          APIs down or stale. No trades until recovery.
        </p>
      </div>
    </div>
  );
}
