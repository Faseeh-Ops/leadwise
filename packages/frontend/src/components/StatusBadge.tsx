import { Lead } from '../api/leads';

const statusMap: Record<Lead['status'], { label: string; color: string; bg: string }> = {
  queued:         { label: 'Queued',           color: '#a1a1aa', bg: '#a1a1aa15' },
  scraping:       { label: 'Scraping',         color: '#eab308', bg: '#eab30815' },
  ai_processing:  { label: 'Processing',       color: '#a855f7', bg: '#a855f715' },
  pending_review: { label: 'Pending Review',   color: '#3b82f6', bg: '#3b82f615' },
  approved:       { label: 'Approved',         color: '#22c55e', bg: '#22c55e15' },
  sent:           { label: 'Sent',             color: '#22c55e', bg: '#22c55e10' },
  replied:        { label: 'Replied',          color: '#ec4899', bg: '#ec489915' },
  failed:         { label: 'Failed',           color: '#ef4444', bg: '#ef444415' },
};

interface StatusBadgeProps {
  status: Lead['status'];
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? statusMap.queued;

  return (
    <span
      className="status-badge"
      style={{ color: config.color, background: config.bg }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${status === 'scraping' || status === 'ai_processing' ? 'animate-pulse' : ''}`}
        style={{ background: config.color }}
      />
      {config.label}
    </span>
  );
}
