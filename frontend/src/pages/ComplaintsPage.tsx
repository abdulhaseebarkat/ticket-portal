import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllComplaints } from '../lib/api';
import { formatDuration, relativeTime } from '../lib/time';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import { ComplaintBadge, priorityAccent, priorityStyles, statusStyles } from '../components/ComplaintBadge';
import type { ComplaintSummary } from '../types/complaint';
import { Building2, CheckCircle2, Clock3, User, Wrench } from 'lucide-react';

const RESOLVED_STATUSES = new Set(['RESOLVED', 'CLOSED']);

// Statuses appear in this order when present, rather than alphabetically -
// it roughly follows a complaint's real lifecycle.
const STATUS_ORDER = ['OPEN', 'IN_PROGRESS', 'WAITING', 'REOPENED', 'RESOLVED', 'CLOSED'];

interface TabBarProps {
  tabs: string[];
  counts: Map<string, number>;
  total: number;
  active: string;
  onSelect: (value: string) => void;
  formatLabel?: (value: string) => string;
}

function TabBar({ tabs, counts, total, active, onSelect, formatLabel }: TabBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const count = tab === 'All' ? total : counts.get(tab) || 0;
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
              isActive ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {formatLabel ? formatLabel(tab) : tab} <span className="ml-1 opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ComplaintsPage() {
  const { data, isLoading } = useQuery<ComplaintSummary[]>({ queryKey: ['allComplaints'], queryFn: fetchAllComplaints });
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [activeLocation, setActiveLocation] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintSummary | null>(null);

  const complaints = data ?? [];

  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    complaints.forEach((item) => {
      const key = item.location || 'Unassigned';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [complaints]);

  const locationTabs = useMemo(
    () => ['All', ...Array.from(locationCounts.keys()).sort((a, b) => a.localeCompare(b))],
    [locationCounts]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    complaints.forEach((item) => {
      const key = item.category || 'Other';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [complaints]);

  const categoryTabs = useMemo(
    () => ['All', ...Array.from(categoryCounts.keys()).sort((a, b) => a.localeCompare(b))],
    [categoryCounts]
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    complaints.forEach((item) => {
      counts.set(item.status, (counts.get(item.status) || 0) + 1);
    });
    return counts;
  }, [complaints]);

  const statusTabs = useMemo(() => {
    const present = Array.from(statusCounts.keys());
    const ordered = STATUS_ORDER.filter((status) => present.includes(status));
    const extra = present.filter((status) => !STATUS_ORDER.includes(status)).sort((a, b) => a.localeCompare(b));
    return ['All', ...ordered, ...extra];
  }, [statusCounts]);

  const filteredComplaints = useMemo(
    () =>
      complaints.filter((item) => {
        const matchesCategory = activeCategory === 'All' || (item.category || 'Other') === activeCategory;
        const matchesStatus = activeStatus === 'All' || item.status === activeStatus;
        const matchesLocation = activeLocation === 'All' || (item.location || 'Unassigned') === activeLocation;
        return matchesCategory && matchesStatus && matchesLocation;
      }),
    [complaints, activeCategory, activeStatus, activeLocation]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-7">
        <div className="text-sm uppercase tracking-[0.28em] text-slate-500">Plant IT Operations</div>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">All complaints</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Every complaint on record, organized by the nature of the issue.</p>
      </section>

      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
        <div className="space-y-4 border-b border-slate-800 pb-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Location</p>
            <TabBar tabs={locationTabs} counts={locationCounts} total={complaints.length} active={activeLocation} onSelect={setActiveLocation} />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Category</p>
            <TabBar tabs={categoryTabs} counts={categoryCounts} total={complaints.length} active={activeCategory} onSelect={setActiveCategory} />
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
            <TabBar
              tabs={statusTabs}
              counts={statusCounts}
              total={complaints.length}
              active={activeStatus}
              onSelect={setActiveStatus}
              formatLabel={(value) => (value === 'All' ? value : value.replace('_', ' '))}
            />
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <p className="text-slate-400">Loading complaints...</p>
          ) : filteredComplaints.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
              No complaints match this filter yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredComplaints.map((item) => {
                const isResolved = RESOLVED_STATUSES.has(item.status);
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedComplaint(item)}
                    className="flex items-stretch gap-0 overflow-hidden rounded-[20px] border border-slate-800 bg-slate-900/95 text-left transition hover:border-slate-700 hover:bg-slate-900"
                  >
                    <span className={`w-1 shrink-0 ${priorityAccent[item.priority] || 'bg-slate-600'}`} aria-hidden="true" />
                    <div className="flex min-w-0 flex-1 flex-col p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{item.complaintNumber}</span>
                        <span className="shrink-0 text-xs text-slate-600">{relativeTime(item.createdAt)}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">{item.title}</h3>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <ComplaintBadge label={item.priority} styles={priorityStyles} />
                        <ComplaintBadge label={item.status} styles={statusStyles} />
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">{item.category || 'Other'}</span>
                      </div>

                      <div className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                          <span className="truncate">{item.department || 'Unassigned department'}</span>
                          <span className="text-slate-700">·</span>
                          <span className="truncate">{item.location || 'Unassigned location'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                          <span className="truncate">{item.equipment || item.equipmentReference || 'No equipment identified'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                          <span className="truncate">Raised by {item.reporter || 'unknown sender'}</span>
                        </div>
                        {isResolved && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="truncate text-slate-300">Solved by {item.resolvedBy || 'unknown'}</span>
                          </div>
                        )}
                      </div>

                      {isResolved && item.resolvedAt && (
                        <div className="mt-4 flex items-center gap-2 self-start rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                          <Clock3 className="h-3.5 w-3.5" />
                          Resolved in {formatDuration(item.createdAt, item.resolvedAt)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedComplaint && <ComplaintDetailModal complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />}
    </div>
  );
}
