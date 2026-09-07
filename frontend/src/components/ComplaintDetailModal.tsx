import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { fetchComplaintDetail } from '../lib/api';
import type { ComplaintDetail, ComplaintSummary } from '../types/complaint';

const eventLabels: Record<string, string> = {
  CREATED: 'Reported',
  STATUS_CHANGE: 'Status changed',
  COMMENT: 'Reply',
};

interface ComplaintDetailModalProps {
  complaint: ComplaintSummary;
  onClose: () => void;
}

export function ComplaintDetailModal({ complaint, onClose }: ComplaintDetailModalProps) {
  const { data: detail } = useQuery<ComplaintDetail>({
    queryKey: ['complaintDetail', complaint.id],
    queryFn: () => fetchComplaintDetail(complaint.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{complaint.complaintNumber}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{complaint.title}</h2>
          </div>
          <button aria-label="Close complaint" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-5 whitespace-pre-wrap text-slate-300">{complaint.description}</p>

        <div className="mt-6 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <span>Source: {complaint.source}</span>
          <span>Status: {complaint.status}</span>
          <span>Priority: {complaint.priority}</span>
          <span>Category: {complaint.category || 'Other'}</span>
          <span>Equipment: {complaint.equipment || detail?.equipmentReference || complaint.equipmentReference || 'Unassigned'}</span>
          <span>Location: {complaint.location || 'Unassigned'}</span>
          <span>Reporter: {complaint.reporter || 'Unknown'}</span>
          <span>Group: {complaint.group || 'Unknown'}</span>
        </div>

        {detail?.imageUrls && detail.imageUrls.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Attached photos</p>
            <div className="flex flex-wrap gap-3">
              {detail.imageUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="Complaint attachment" className="h-24 w-24 rounded-2xl border border-slate-700 object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Timeline</p>
          {!detail ? (
            <p className="text-sm text-slate-500">Loading history...</p>
          ) : !detail.events || detail.events.length === 0 ? (
            <p className="text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {detail.events.map((event, index) => (
                <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {eventLabels[event.eventType] || event.eventType}
                      {event.eventType === 'STATUS_CHANGE' && event.newValue ? ` → ${event.newValue}` : ''}
                    </span>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  {event.description && <p className="mt-2 text-sm text-slate-300">{event.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">By {event.performedBy || 'Unknown'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
