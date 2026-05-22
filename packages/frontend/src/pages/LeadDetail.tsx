import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadsApi, Lead } from '../api/leads';
import EmailEditor from '../components/EmailEditor';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Globe, Mail, Building, MapPin, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingReplied, setMarkingReplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    leadsApi.get(id).then((r) => { setLead(r.data.data); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">Lead not found</p>
      </div>
    );
  }

  const handleMarkReplied = async () => {
    const snippet = window.prompt("Optional: Paste a small snippet of their reply (or leave blank):");
    if (snippet === null) return;

    setMarkingReplied(true);
    try {
      const res = await leadsApi.markReplied(lead._id, snippet);
      setLead(res.data.data);
      toast.success('Lead marked as replied!');
    } catch (err) {
      toast.error('Failed to mark replied');
    } finally {
      setMarkingReplied(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/leads')} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-100">{lead.companyName ?? 'Processing...'}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="text-zinc-500 text-sm mt-0.5">{lead.targetUrl}</p>
        </div>

        {lead.status === 'sent' && (
          <button
            className="btn-ghost flex items-center gap-2 text-pink-400 hover:text-pink-300 border-pink-500/30"
            onClick={handleMarkReplied}
            disabled={markingReplied}
          >
            <MessageSquare className="w-4 h-4" />
            {markingReplied ? 'Marking...' : 'Mark Replied'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Company info */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">Company Info</h2>
            <div className="space-y-3">
              {lead.companyName && (
                <div className="flex items-start gap-2.5">
                  <Building className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500">Company</p>
                    <p className="text-sm text-zinc-200">{lead.companyName}</p>
                  </div>
                </div>
              )}
              {lead.website && (
                <div className="flex items-start gap-2.5">
                  <Globe className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500">Website</p>
                    <a href={lead.website} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors truncate block">
                      {lead.website}
                    </a>
                  </div>
                </div>
              )}
              {lead.location && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500">Location</p>
                    <p className="text-sm text-zinc-200">{lead.location}</p>
                  </div>
                </div>
              )}
              {lead.contactEmails.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-zinc-500">Emails</p>
                    {lead.contactEmails.map((e) => (
                      <p key={e} className="text-sm text-zinc-200 font-mono">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {lead.description && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1.5">Description</p>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-6">{lead.description}</p>
              </div>
            )}

            {lead.status === 'replied' && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2 mb-2 text-pink-400 font-medium text-sm">
                  <MessageSquare className="w-4 h-4" />
                  Reply Received
                </div>
                {lead.replySnippet ? (
                  <div className="p-3 rounded-lg bg-pink-500/10 text-sm text-pink-200 italic">
                    "{lead.replySnippet}"
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Manual reply tracked.</p>
                )}
                {lead.repliedAt && (
                  <p className="text-[10px] text-zinc-500 mt-2">
                    {format(new Date(lead.repliedAt), 'MMM d, yyyy HH:mm')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Error log */}
          {lead.errorLog && lead.errorLog.length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Error Log
              </h2>
              <div className="space-y-2">
                {lead.errorLog.map((err, i) => (
                  <div key={i} className="text-xs font-mono p-2 rounded bg-red-500/10">
                    <p className="text-red-300">{err.message}</p>
                    <p className="text-zinc-600 mt-0.5">{format(new Date(err.timestamp), 'MMM d HH:mm:ss')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Email editor */}
        <div className="lg:col-span-2">
          <EmailEditor lead={lead} onUpdated={setLead} />
        </div>
      </div>
    </div>
  );
}
