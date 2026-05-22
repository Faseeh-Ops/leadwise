import { useAppStore, ActivityEntry } from '../store/appStore';
import { CheckCircle, XCircle, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const typeConfig = {
  success: { icon: CheckCircle, color: 'text-green-400', class: 'success' },
  error: { icon: XCircle, color: 'text-red-400', class: 'error' },
  info: { icon: Info, color: 'text-blue-400', class: 'info' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', class: 'warning' },
};

function LogEntry({ entry }: { entry: ActivityEntry }) {
  const { icon: Icon, color, class: cls } = typeConfig[entry.type];
  return (
    <div className={`log-entry ${cls}`}>
      <Icon className={`w-3 h-3 shrink-0 mt-0.5 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-zinc-300 truncate leading-relaxed">{entry.message}</p>
        {entry.queue && (
          <span className="text-zinc-600 text-[10px]">{entry.queue}</span>
        )}
      </div>
      <time className="text-zinc-600 text-[10px] shrink-0">
        {format(entry.timestamp, 'HH:mm:ss')}
      </time>
    </div>
  );
}

export default function ActivityFeed() {
  const { activityLog, clearActivity } = useAppStore();

  return (
    <div className="card flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-medium text-zinc-300">Activity</h3>
          <span className="text-xs text-zinc-600">({activityLog.length})</span>
        </div>
        {activityLog.length > 0 && (
          <button onClick={clearActivity} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {activityLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
            <Info className="w-5 h-5 mb-2" />
            <p className="text-xs">No activity yet</p>
          </div>
        ) : (
          activityLog.map((entry) => (
            <LogEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
