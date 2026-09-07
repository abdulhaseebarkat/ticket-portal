import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllComplaints } from '../lib/api';
import { relativeTime } from '../lib/time';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import type { ComplaintSummary } from '../types/complaint';

const priorityStyles: Record<string, string> = {
  CRITICAL: 'bg-rose-500/15 text-rose-300',
  HIGH: 'bg-amber-500/15 text-amber-300',
  MEDIUM: 'bg-sky-500/15 text-sky-300',
  LOW: 'bg-slate-500/15 text-slate-300',
};

const statusStyles: Record<string, string> = {
  OPEN: 'bg-orange-500/15 text-orange-300',
  IN_PROGRESS: 'bg-sky-500/15 text-sky-300',
  WAITING: 'bg-amber-500/15 text-amber-300',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300',
  REOPENED: 'bg-rose-500/15 text-rose-300',
  CLOSED: 'bg-slate-600/15 text-slate-300',
};

function Badge({ label, styles }: { label: string; styles: Record<string, string> }) {
  const style = styles[label] || 'bg-slate-700/40 text-slate-300';
  return <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${style}`}>{label.replace('_', ' ')}</span>;
}

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
            <div className="space-y-4">
              {filteredComplaints.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-slate-800 bg-slate-900/95 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.complaintNumber}</span>
                        <Badge label={item.priority} styles={priorityStyles} />
                        <Badge label={item.status} styles={statusStyles} />
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{item.category || 'Other'}</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 break-words text-sm text-slate-400">{item.description}</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Equipment: {item.equipment || item.equipmentReference || 'Unassigned'}</span>
                        <span>Location: {item.location || 'Unassigned'}</span>
                        <span>Reporter: {item.reporter || 'Unknown'}</span>
                        <span>Group: {item.group || 'Unknown'}</span>
                        <span>{relativeTime(item.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedComplaint(item)}
                      className="shrink-0 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedComplaint && <ComplaintDetailModal complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />}
    </div>
  );
}
