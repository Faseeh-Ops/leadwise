import { Lead } from '../api/leads';
import StatusBadge from './StatusBadge';
import { ExternalLink, Mail, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  index?: number;
}

export default function LeadCard({ lead, index = 0 }: LeadCardProps) {
  const navigate = useNavigate();

  return (
    <tr
      className="border-b border-zinc-800 cursor-pointer transition-colors hover:bg-zinc-800/50 group"
      onClick={() => navigate(`/leads/${lead._id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
            <Building className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
              {lead.companyName ?? 'Processing...'}
            </p>
            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{lead.targetUrl}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <StatusBadge status={lead.status} />
      </td>

      <td className="px-4 py-3">
        {lead.contactEmails.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">{lead.contactEmails[0]}</span>
            {lead.contactEmails.length > 1 && (
              <span className="text-xs text-zinc-600">+{lead.contactEmails.length - 1}</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-zinc-600">No emails found</span>
        )}
      </td>

      <td className="px-4 py-3">
        <span className="text-xs text-zinc-500">
          {format(new Date(lead.createdAt), 'MMM d, HH:mm')}
        </span>
      </td>

      <td className="px-4 py-3">
        <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
      </td>
    </tr>
  );
}
