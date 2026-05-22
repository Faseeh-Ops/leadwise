import { useEffect, useState } from 'react';
import { Plus, Play, Pause, Trash2, Loader, Link, Upload } from 'lucide-react';
import { campaignsApi, Campaign, CampaignTone } from '../api/campaigns';
import { credentialsApi, Credential } from '../api/credentials';
import { useAppStore } from '../store/appStore';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

export default function Campaigns() {
  const { campaigns, setCampaigns, addCampaign, updateCampaign, removeCampaign } = useAppStore();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [urlsRaw, setUrlsRaw] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [tone, setTone] = useState<CampaignTone>('professional');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    campaignsApi.list().then((r) => setCampaigns(r.data.data));
    credentialsApi.list().then((r) => setCredentials(r.data.data));
  }, []);

  const resetForm = () => { setName(''); setDescription(''); setUrlsRaw(''); setCredentialId(''); setTone('professional'); setCsvFile(null); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      const urls = urlsRaw.split('\n').map((u) => u.trim()).filter(Boolean);
      if (urls.length === 0) { toast.error('Add at least one URL or upload a CSV'); return; }
    }

    setLoading(true);
    try {
      const urls = csvFile ? ['https://placeholder.com'] : urlsRaw.split('\n').map((u) => u.trim()).filter(Boolean);
      const res = await campaignsApi.create({ name, description, targetUrls: urls, credentialId: credentialId || undefined, tone });
      addCampaign(res.data.data);

      if (csvFile) {
        const uploadRes = await campaignsApi.uploadCsv(res.data.data._id, csvFile);
        toast.success(`${uploadRes.data.urlsImported} URLs imported from CSV`);
      } else {
        toast.success('Campaign created!');
      }

      setModalOpen(false);
      resetForm();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error creating campaign';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    setStartingId(id);
    try {
      const res = await campaignsApi.start(id);
      updateCampaign(id, { status: 'running' });
      toast.success(`${res.data.jobsEnqueued} jobs enqueued!`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to start';
      toast.error(msg);
    } finally {
      setStartingId(null);
    }
  };

  const handlePause = async (id: string) => {
    await campaignsApi.pause(id);
    updateCampaign(id, { status: 'paused' });
    toast.success('Campaign paused');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove all associated leads.`)) return;
    await campaignsApi.delete(id);
    removeCampaign(id);
    toast.success('Campaign deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Campaigns</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="new-campaign-btn" className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="space-y-3">
        {campaigns.length === 0 && (
          <div className="card p-12 flex flex-col items-center text-center">
            <Link className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-zinc-400 font-medium">No campaigns yet</p>
            <p className="text-zinc-600 text-sm mt-1">Create a campaign and paste target URLs to start.</p>
          </div>
        )}
        {campaigns.map((c) => (
          <div key={c._id} className="card p-5 card-hover transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-zinc-200 truncate">{c.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium shrink-0"
                    style={{
                      color: c.status === 'running' ? '#22c55e' : c.status === 'completed' ? '#3b82f6' : '#71717a',
                      background: c.status === 'running' ? '#22c55e10' : '#27272a',
                    }}>{c.status}</span>
                </div>
                {c.description && <p className="text-sm text-zinc-500 mb-2 truncate">{c.description}</p>}
                <div className="flex gap-4 text-xs text-zinc-500">
                  <span>{c.stats.total} URLs</span>
                  <span className="text-yellow-400">{c.stats.scraped} scraped</span>
                  <span className="text-purple-400">{c.stats.processed} processed</span>
                  <span className="text-green-400">{c.stats.sent} sent</span>
                  {c.stats.failed > 0 && <span className="text-red-400">{c.stats.failed} failed</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.status !== 'running' && c.status !== 'completed' && (
                  <button className="btn-primary flex items-center gap-1.5 py-1.5 text-xs"
                    onClick={() => handleStart(c._id)}
                    disabled={startingId === c._id}>
                    {startingId === c._id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Start
                  </button>
                )}
                {c.status === 'running' && (
                  <button className="btn-ghost flex items-center gap-1.5 py-1.5 text-xs"
                    onClick={() => handlePause(c._id)}>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}
                <button className="btn-ghost p-2 text-red-400 hover:text-red-300"
                  onClick={() => handleDelete(c._id, c.name)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title="New Campaign">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Campaign Name *</label>
            <input id="campaign-name" className="input" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Q3 SaaS Outreach" required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Description</label>
            <input className="input" value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes..." />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              Target URLs * <span className="text-zinc-600">(one per line OR upload CSV)</span>
            </label>
            {!csvFile ? (
              <>
                <textarea id="campaign-urls" className="textarea" rows={5} value={urlsRaw}
                  onChange={(e) => setUrlsRaw(e.target.value)}
                  placeholder={"https://stripe.com\nhttps://notion.so\nhttps://linear.app"} required />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-zinc-600">{urlsRaw.split('\n').filter(Boolean).length} URLs</p>
                  <label className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Upload CSV
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-zinc-200">{csvFile.name}</span>
                </div>
                <button type="button" onClick={() => setCsvFile(null)} className="text-xs text-zinc-400 hover:text-zinc-300">Remove</button>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Tone of Voice</label>
            <select className="input" value={tone} onChange={(e) => setTone(e.target.value as CampaignTone)}>
              <option value="professional">Professional (Formal, data-driven)</option>
              <option value="conversational">Conversational (Friendly, human)</option>
              <option value="urgent">Urgent (Direct, high-FOMO)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              SMTP Credential <span className="text-zinc-600">(required to send emails)</span>
            </label>
            <select className="input" value={credentialId} onChange={(e) => setCredentialId(e.target.value)}>
              <option value="">— Select credential —</option>
              {credentials.map((c) => (
                <option key={c._id} value={c._id}>{c.label} ({c.fromEmail})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</button>
            <button id="create-campaign-submit" type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
