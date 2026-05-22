import { useEffect, useState } from 'react';
import { credentialsApi, Credential, CreateCredentialInput } from '../api/credentials';
import Modal from '../components/Modal';
import { Plus, Trash2, Shield, Server, Loader, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_FORM: CreateCredentialInput = {
  label: '', smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '',
  smtpSecure: true, fromName: '', fromEmail: '', groqApiKey: '',
};

export default function Settings() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateCredentialInput>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    credentialsApi.list().then((r) => setCredentials(r.data.data));
  }, []);

  const set = (k: keyof CreateCredentialInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await credentialsApi.create(form);
      setCredentials((prev) => [res.data.data, ...prev]);
      setModalOpen(false);
      setForm(DEFAULT_FORM);
      toast.success('Credential saved — encrypted at rest');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    await credentialsApi.delete(id);
    setCredentials((prev) => prev.filter((c) => c._id !== id));
    toast.success('Credential deleted');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
          <p className="text-zinc-500 text-sm mt-0.5">SMTP & API credentials — encrypted at rest</p>
        </div>
        <button id="new-credential-btn" className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" /> Add Credential
        </button>
      </div>

      {/* Security notice */}
      <div className="card p-4 flex items-start gap-3 border-l-2 border-blue-500">
        <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-zinc-200">End-to-End Encryption</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            All SMTP passwords and API keys are encrypted using AES-256-GCM before storage.
            The encryption key lives only in your environment variables — never in the database.
          </p>
        </div>
      </div>

      {/* Credential list */}
      <div className="space-y-3">
        {credentials.length === 0 ? (
          <div className="card p-10 flex flex-col items-center text-center">
            <Key className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-zinc-400 font-medium">No credentials yet</p>
            <p className="text-zinc-600 text-sm mt-1">Add SMTP settings to enable email sending in campaigns.</p>
          </div>
        ) : (
          credentials.map((c) => (
            <div key={c._id} className="card p-5 flex items-center justify-between gap-4 card-hover transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Server className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-200">{c.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {c.smtpUser} · {c.smtpHost}:{c.smtpPort} · From: {c.fromEmail}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-md text-green-400 bg-green-500/10">
                  Encrypted
                </span>
                <button className="btn-ghost p-2 text-red-400 hover:text-red-300"
                  onClick={() => handleDelete(c._id, c.label)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setForm(DEFAULT_FORM); }} title="Add SMTP Credential" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Label *</label>
            <input id="cred-label" className="input" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="My Gmail Account" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">SMTP Host *</label>
              <input className="input" value={form.smtpHost} onChange={(e) => set('smtpHost', e.target.value)} placeholder="smtp.gmail.com" required />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Port *</label>
              <input className="input" type="number" value={form.smtpPort} onChange={(e) => set('smtpPort', Number(e.target.value))} placeholder="587" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">SMTP Username *</label>
            <input className="input" type="email" value={form.smtpUser} onChange={(e) => set('smtpUser', e.target.value)} placeholder="you@gmail.com" required />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">SMTP Password / App Password *</label>
            <input id="cred-password" className="input" type="password" value={form.smtpPassword} onChange={(e) => set('smtpPassword', e.target.value)} placeholder="••••••••••••••••" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">From Name *</label>
              <input className="input" value={form.fromName} onChange={(e) => set('fromName', e.target.value)} placeholder="John Smith" required />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">From Email *</label>
              <input className="input" type="email" value={form.fromEmail} onChange={(e) => set('fromEmail', e.target.value)} placeholder="john@company.com" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Groq API Key *</label>
            <input id="cred-groq" className="input" type="password" value={form.groqApiKey} onChange={(e) => set('groqApiKey', e.target.value)} placeholder="gsk_..." required />
            <p className="text-xs text-zinc-600 mt-1">Get free at console.groq.com</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="smtpSecure" checked={form.smtpSecure} onChange={(e) => set('smtpSecure', e.target.checked)} className="accent-blue-500" />
            <label htmlFor="smtpSecure" className="text-sm text-zinc-400">Use TLS/SSL (recommended)</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => { setModalOpen(false); setForm(DEFAULT_FORM); }}>Cancel</button>
            <button id="save-credential-btn" type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save Encrypted'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
