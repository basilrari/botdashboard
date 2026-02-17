interface HealthCardProps {
  label: string;
  ok: boolean;
  status: string;
  detail: string;
  warning?: boolean;
}

export function HealthCard({
  label,
  ok,
  status,
  detail,
  warning,
}: HealthCardProps) {
  const dotColor = warning ? "yellow" : ok ? "green" : "red";
  const textColor = warning ? "text-yellow-400" : ok ? "text-green-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
      <span className={`status-dot ${dotColor}`} />
      <div className="min-w-0">
        <div className="text-xs sm:text-sm font-medium truncate">{label}</div>
        <div className={`text-xs sm:text-sm ${textColor}`}>{status}</div>
        <div className="text-[10px] sm:text-xs text-gray-500 truncate">{detail}</div>
      </div>
    </div>
  );
}
