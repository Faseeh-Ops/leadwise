import { useEffect } from 'react';
import { Users, Megaphone, Send, AlertTriangle, Activity } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import ActivityFeed from '../components/ActivityFeed';
import QueueStats from '../components/QueueStats';
import { useAppStore } from '../store/appStore';
import { campaignsApi } from '../api/campaigns';
import { leadsApi } from '../api/leads';

export default function Dashboard() {
  const { campaigns, leads, setCampaigns, setLeads, queueMetrics } = useAppStore();

  useEffect(() => {
    campaignsApi.list().then((r) => setCampaigns(r.data.data));
    leadsApi.list({ limit: 100 }).then((r) => setLeads(r.data.data));
  }, []);

  const totalLeads = leads.length;
  const pendingReview = leads.filter((l) => l.status === 'pending_review').length;
  const sent = leads.filter((l) => l.status === 'sent').length;
  const failed = leads.filter((l) => l.status === 'failed').length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'running').length;
  const totalActive = queueMetrics.scrape.active + queueMetrics.ai.active + queueMetrics.send.active;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Overview of your outreach activity</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Leads" value={totalLeads} icon={Users} color="#3b82f6" />
        <MetricCard label="Pending Review" value={pendingReview} icon={Activity} color="#eab308"
          subtitle={pendingReview > 0 ? 'Ready to approve' : undefined} />
        <MetricCard label="Emails Sent" value={sent} icon={Send} color="#22c55e" />
        <MetricCard label="Active Workers" value={totalActive} icon={Megaphone} color="#a855f7"
          subtitle={`${activeCampaigns} campaign${activeCampaigns !== 1 ? 's' : ''} running`} />
      </div>

      {failed > 0 && (
        <div className="card px-4 py-3 flex items-center gap-3 border-l-2 border-red-500">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-medium">{failed} lead{failed !== 1 ? 's' : ''}</span> failed processing.
            Check the Leads page for details.
          </p>
        </div>
      )}

      {/* Queue stats + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QueueStats />
        <div className="h-80">
          <ActivityFeed />
        </div>
      </div>

      {/* Recent campaigns */}
      <div className="card p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Recent Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-6">No campaigns yet — create one to get started.</p>
        ) : (
          <div className="space-y-1">
            {campaigns.slice(0, 5).map((c) => (
              <div key={c._id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.stats.total} URLs · {c.stats.sent} sent</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{
                    color: c.status === 'running' ? '#22c55e' : c.status === 'completed' ? '#3b82f6' : '#71717a',
                    background: c.status === 'running' ? '#22c55e10' : '#27272a',
                  }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
