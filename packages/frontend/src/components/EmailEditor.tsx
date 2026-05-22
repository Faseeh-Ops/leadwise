import { useState, useEffect } from 'react';
import { Lead, AiGeneratedEmail, leadsApi } from '../api/leads';
import { Send, Edit3, CheckCircle, AlertCircle, Loader, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailEditorProps {
  lead: Lead;
  onUpdated: (lead: Lead) => void;
}

export default function EmailEditor({ lead, onUpdated }: EmailEditorProps) {
  const sequence = lead.emailSequence || [];
  const legacyEmail = lead.aiGeneratedEmail;
  const emails = sequence.length > 0 ? sequence : (legacyEmail ? [legacyEmail] : []);

  const [activeTab, setActiveTab] = useState(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [contactEmail, setContactEmail] = useState(lead.contactEmails?.[0] ?? '');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (emails[activeTab]) {
      setSubject(emails[activeTab].editedSubject ?? emails[activeTab].subject ?? '');
      setBody(emails[activeTab].editedBody ?? emails[activeTab].body ?? '');
      setIsDirty(false);
    }
  }, [activeTab, emails]);

  if (emails.length === 0) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-8 h-8 text-zinc-600 mb-3" />
        <p className="text-zinc-400 font-medium">No generated email yet</p>
        <p className="text-zinc-600 text-sm mt-1">Lead is still being processed.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentEmail = emails[activeTab];
      const res = await leadsApi.updateEmail(lead._id, {
        editedSubject: subject !== currentEmail.subject ? subject : undefined,
        editedBody: body !== currentEmail.body ? body : undefined,
        contactEmails: contactEmail !== lead.contactEmails?.[0] ? [contactEmail] : undefined,
        stepIndex: sequence.length > 0 ? activeTab : undefined,
      });
      onUpdated(res.data.data);
      setIsDirty(false);
      toast.success(`Draft saved for step ${activeTab + 1}`);
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (isDirty) await handleSave();
    setApproving(true);
    try {
      const res = await leadsApi.approve(lead._id);
      onUpdated(res.data.data);
      toast.success(sequence.length > 1 ? 'Sequence approved and queued!' : 'Email approved and queued!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to approve';
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const isSent = lead.status === 'sent' || lead.status === 'replied';
  const isApproved = lead.status === 'approved' || isSent;
  const activeEmail = emails[activeTab];

  const getTabLabel = (index: number) => {
    if (index === 0) return 'Email 1 (Initial)';
    if (index === 1) return 'Email 2 (Follow-up)';
    return `Email ${index + 1}`;
  };

  const getDelayLabel = (delayMs: number) => {
    if (delayMs === 0) return 'Sends immediately';
    const mins = Math.floor(delayMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d after previous`;
    if (hours > 0) return `${hours}h after previous`;
    return `${mins}m after previous`;
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-blue-400" />
          <h3 className="font-medium text-zinc-200">
            {sequence.length > 1 ? 'Email Sequence' : 'Generated Email'}
          </h3>
        </div>
        {isApproved && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            {isSent ? 'Sent' : 'Queued'}
          </span>
        )}
      </div>

      {sequence.length > 1 && (
        <div className="px-5 pt-3 pb-0 border-b border-zinc-800 flex gap-4 overflow-x-auto">
          {emails.map((e, i) => (
            <button
              key={i}
              onClick={() => {
                if (isDirty) handleSave().then(() => setActiveTab(i));
                else setActiveTab(i);
              }}
              className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === i
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {getTabLabel(i)}
              {e.sentAt && <CheckCircle className="w-3 h-3 text-green-400" />}
            </button>
          ))}
        </div>
      )}

      {activeEmail.painPoints?.length > 0 && (
        <div className="px-5 py-3 border-b border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 mb-2 flex justify-between">
            <span>Pain Points</span>
            {sequence.length > 1 && activeEmail.sendDelay > 0 && (
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {getDelayLabel(activeEmail.sendDelay)}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeEmail.painPoints.map((point, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-md text-zinc-300 bg-zinc-800">
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pt-4 pb-3">
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Send To</label>
        <input className="input" type="email" value={contactEmail}
          onChange={(e) => { setContactEmail(e.target.value); setIsDirty(true); }}
          disabled={isSent || (activeTab > 0 && isApproved)} placeholder="target@company.com" required />
      </div>

      <div className="px-5 pb-3">
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Subject</label>
        <input className="input" value={subject}
          onChange={(e) => { setSubject(e.target.value); setIsDirty(true); }}
          disabled={activeEmail.sentAt != null || (isApproved && activeTab === 0)} placeholder="Email subject..." required />
      </div>

      <div className="px-5 pb-4">
        <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Body</label>
        <textarea className="textarea" rows={8} value={body}
          onChange={(e) => { setBody(e.target.value); setIsDirty(true); }}
          disabled={activeEmail.sentAt != null || (isApproved && activeTab === 0)} placeholder="Email body..." />
      </div>

      <div className="px-5 pb-5 flex items-center gap-3 flex-wrap">
        {isDirty && !activeEmail.sentAt && (
          <button className="btn-ghost" onClick={handleSave} disabled={saving}>
            {saving ? <Loader className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        )}

        {!isApproved && (
          <button id="approve-send-btn" className="btn-primary flex items-center gap-2"
            onClick={handleApprove}
            disabled={approving || !contactEmail}>
            {approving ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {approving ? 'Approving...' : (sequence.length > 1 ? 'Approve & Start Sequence' : 'Approve & Send')}
          </button>
        )}

        {!contactEmail && !isApproved && (
          <p className="text-xs text-yellow-400">Please provide a "Send To" email</p>
        )}
      </div>
    </div>
  );
}
