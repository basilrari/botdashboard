interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  sublabel?: string;
  alert?: boolean;
  valueColor?: string;
}

export function MetricCard({
  icon,
  label,
  value,
  sublabel,
  alert,
  valueColor,
}: MetricCardProps) {
  return (
    <div className={`card ${alert ? "border-red-500/50" : ""}`}>
      <div className="metric-label mb-0.5">
        {icon} {label}
      </div>
      <div className={`metric-value ${valueColor || ""}`}>{value}</div>
      {sublabel && <div className="text-xs text-red-400 mt-1">{sublabel}</div>}
    </div>
  );
}
