import { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Building2, CheckCircle2, Clock3, MapPin, MessageCircle, Search, ShieldAlert, User, X } from 'lucide-react';
import { ComplaintBadge, priorityAccent, priorityStyles } from './ComplaintBadge';
import { formatDuration, relativeTime } from '../lib/time';
import { statusColors } from '../lib/chartColors';
import type { ComplaintSummary } from '../types/complaint';

type SortOrder = 'newest' | 'oldest';

/** Same compact "2h 14m" / "3d 5h" formatting as formatDuration, but for a raw millisecond span (an average/max) rather than two timestamps. */
function formatMs(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

/**
 * Everything currently in one status, opened from the dashboard's status
 * breakdown chart. A lighter-weight list than the full Complaints page - no
 * page navigation, just "what's actually in this bucket right now", with a
 * few aggregate stats up top and a click-through to the full detail modal.
 */
export function StatusBreakdownModal({
  status,
  complaints,
  onClose,
  onSelectComplaint,
}: {
  status: string;
  complaints: ComplaintSummary[];
  onClose: () => void;
  onSelectComplaint: (complaint: ComplaintSummary) => void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOrder>('newest');

  const stats = useMemo(() => {
    const critical = complaints.filter((item) => item.priority === 'CRITICAL').length;

    const locationCounts = complaints.reduce<Record<string, number>>((result, item) => {
      const key = item.location || 'Unassigned';
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    const resolvedDurations = complaints.filter((item) => item.resolvedAt).map((item) => new Date(item.resolvedAt!).getTime() - new Date(item.createdAt).getTime());
    const avgResolutionMs = resolvedDurations.length ? resolvedDurations.reduce((sum, value) => sum + value, 0) / resolvedDurations.length : null;

    const oldestOpenMs = complaints.length ? Math.max(...complaints.map((item) => Date.now() - new Date(item.createdAt).getTime())) : null;

    return { critical, topLocation, avgResolutionMs, oldestOpenMs };
  }, [complaints]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? complaints.filter((item) =>
          [item.complaintNumber, item.title, item.reporter, item.location, item.department, item.equipmentReference]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(term))
        )
      : complaints;
    return [...filtered].sort((a, b) => {
      const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === 'newest' ? -delta : delta;
    });
  }, [complaints, query, sort]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: statusColors[status] || '#64748b' }} aria-hidden="true" />

        <div className="border-b border-slate-800 p-5 pl-7 sm:p-6 sm:pl-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors[status] || '#64748b' }} />
                <h2 className="text-xl font-semibold text-white sm:text-2xl">{status.replace('_', ' ')}</h2>
              </div>
              <p className="mt-1 text-sm text-slate-400">{complaints.length} complaint{complaints.length === 1 ? '' : 's'} in this status</p>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-900 hover:text-slate-300" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatChip icon={ShieldAlert} label="Critical" value={String(stats.critical)} accent={stats.critical > 0} />
            <StatChip icon={MapPin} label="Top location" value={stats.topLocation} />
            {stats.avgResolutionMs !== null ? (
              <StatChip icon={CheckCircle2} label="Avg. resolution" value={formatMs(stats.avgResolutionMs)} />
            ) : stats.oldestOpenMs !== null ? (
              <StatChip icon={Clock3} label="Oldest" value={formatMs(stats.oldestOpenMs)} />
            ) : (
              <StatChip icon={Clock3} label="Oldest" value="—" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-800 p-4 pl-7 sm:pl-8">
          <div className="flex flex-1 items-center rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-slate-300">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this status..."
              className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </div>
          <button
            onClick={() => setSort((current) => (current === 'newest' ? 'oldest' : 'newest'))}
            title={sort === 'newest' ? 'Sorted newest first' : 'Sorted oldest first'}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
          >
            {sort === 'newest' ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpNarrowWide className="h-4 w-4" />}
            {sort === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pl-7 sm:p-5 sm:pl-8">
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">No complaints match your search.</p>
          ) : (
            <div className="space-y-3">
              {visible.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectComplaint(item)}
                  className="group flex w-full items-stretch overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 text-left transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <span className={`w-1 shrink-0 ${priorityAccent[item.priority] || 'bg-slate-600'}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1 p-3.5 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{item.complaintNumber}</span>
                      <ComplaintBadge label={item.priority} styles={priorityStyles} />
                    </div>
                    <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-white sm:text-base">{item.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> {item.department || 'Unassigned'}{item.location ? ` · ${item.location}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> {item.reporter || 'Unknown'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" /> {item.group || 'WhatsApp'}
                      </span>
                      {item.resolvedAt ? (
                        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {item.resolvedBy || 'Unknown'} · {formatDuration(item.createdAt, item.resolvedAt)}
                        </span>
                      ) : (
                        <span className="ml-auto inline-flex items-center gap-1.5 text-slate-600">
                          <Clock3 className="h-3.5 w-3.5" /> {relativeTime(item.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, accent }: { icon: typeof ShieldAlert; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      <div className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide ${accent ? 'text-rose-400' : 'text-slate-500'}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-0.5 truncate text-sm font-semibold ${accent ? 'text-rose-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}
