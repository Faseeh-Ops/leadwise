import { useEffect, useState } from 'react';
import { leadsApi, Lead } from '../api/leads';
import { campaignsApi, Campaign } from '../api/campaigns';
import LeadCard from '../components/LeadCard';
import { Search, Filter, RefreshCw } from 'lucide-react';

const STATUS_OPTIONS = ['', 'queued', 'scraping', 'ai_processing', 'pending_review', 'approved', 'sent', 'failed'];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadsApi.list({ page, limit: 20, status: status || undefined, campaignId: campaignId || undefined, search: search || undefined });
      setLeads(res.data.data);
      setTotalPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [page, status, campaignId]);
  useEffect(() => { campaignsApi.list().then((r) => setCampaigns(r.data.data)); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchLeads(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Leads</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{total} total leads</p>
        </div>
        <button className="btn-ghost flex items-center gap-2" onClick={fetchLeads}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input className="input pl-9" placeholder="Search company or URL..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-ghost flex items-center gap-1.5">
            <Filter className="w-4 h-4" /> Search
          </button>
        </form>
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
        <select className="input w-auto" value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setPage(1); }}>
          <option value="">All campaigns</option>
          {campaigns.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Company</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-zinc-500">Loading...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-zinc-500">No leads found</td></tr>
            ) : (
              leads.map((lead, i) => <LeadCard key={lead._id} lead={lead} index={i} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-ghost py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-sm text-zinc-400">{page} / {totalPages}</span>
          <button className="btn-ghost py-1.5 text-xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
