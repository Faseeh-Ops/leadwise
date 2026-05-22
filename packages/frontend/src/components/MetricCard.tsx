import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
}

export default function MetricCard({
  label, value, icon: Icon, color = '#3b82f6', subtitle,
}: MetricCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-zinc-100 mb-0.5">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {subtitle && <p className="text-xs text-zinc-600 mt-1">{subtitle}</p>}
    </div>
  );
}
