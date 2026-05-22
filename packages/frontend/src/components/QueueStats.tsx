import { useAppStore } from '../store/appStore';
import { Cpu, Brain, Send } from 'lucide-react';

interface QueueRow {
  label: string;
  icon: React.ElementType;
  key: 'scrape' | 'ai' | 'send';
  color: string;
}

const QUEUES: QueueRow[] = [
  { label: 'Scrape Queue', icon: Cpu, key: 'scrape', color: '#eab308' },
  { label: 'AI Queue', icon: Brain, key: 'ai', color: '#a855f7' },
  { label: 'Send Queue', icon: Send, key: 'send', color: '#22c55e' },
];

export default function QueueStats() {
  const { queueMetrics } = useAppStore();

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-zinc-300 mb-4">Queue Status</h3>
      <div className="space-y-4">
        {QUEUES.map(({ label, icon: Icon, key, color }) => {
          const q = queueMetrics[key];
          const total = q.waiting + q.active;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-xs font-medium text-zinc-400">{label}</span>
                </div>
                <div className="flex gap-3 text-xs text-zinc-500">
                  <span>{q.waiting} waiting</span>
                  <span style={{ color }}>{q.active} active</span>
                  {q.failed > 0 && <span className="text-red-400">{q.failed} failed</span>}
                </div>
              </div>
              <div className="h-1 rounded-full bg-zinc-800">
                {q.active > 0 && (
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: total > 0 ? `${(q.active / Math.max(total, 1)) * 100}%` : '8%', background: color }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
