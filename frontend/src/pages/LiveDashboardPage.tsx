import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../lib/api';
import { relativeTime } from '../lib/time';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import type { ComplaintSummary } from '../types/complaint';
import { Activity, CheckCircle2, Clock3, MessageCircle, RefreshCw, ShieldAlert, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { statusColors, STATUS_ORDER, trendOpen, trendResolved, chartTooltipStyle, axisColor, gridColor } from '../lib/chartColors';

type Complaint = ComplaintSummary;
interface DashboardSummary {
  whatsappComplaints: number; openComplaints: number; inProgressComplaints: number; resolvedToday: number; criticalIssues: number;
  averageResolutionTime: string; complaints: Complaint[];
}

export function LiveDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('This Month');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const { data, isLoading, isFetching, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboardSummary'], queryFn: fetchDashboardSummary, refetchInterval: 5000, refetchOnWindowFocus: true,
  });
  const complaints = data?.complaints ?? [];
  const kpis = [
    { label: 'WhatsApp Complaints', value: data?.whatsappComplaints ?? '—', delta: 'From live database', icon: MessageCircle },
    { label: 'Open Complaints', value: data?.openComplaints ?? '—', delta: 'Current open tickets', icon: ShieldAlert },
    { label: 'In Progress', value: data?.inProgressComplaints ?? '—', delta: 'Current work queue', icon: Activity },
    { label: 'Resolved Today', value: data?.resolvedToday ?? '—', delta: 'Resolved since midnight', icon: CheckCircle2 },
    { label: 'Critical Issues', value: data?.criticalIssues ?? '—', delta: 'Unresolved critical tickets', icon: TrendingUp },
    { label: 'Avg. Resolution', value: data?.averageResolutionTime ?? '—', delta: 'Report to resolved, all-time', icon: Clock3 },
  ];

  const trendData = useMemo(() => { const days = [...Array(7)].map((_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return { date, label: date.toLocaleDateString(undefined, { weekday: 'short' }), open: 0, resolved: 0 }; }); complaints.forEach(item => { const day = days.find(entry => entry.date.toDateString() === new Date(item.createdAt).toDateString()); if (day) item.status === 'RESOLVED' ? day.resolved++ : day.open++; }); return days.map(day => ({ date: day.label, open: day.open, resolved: day.resolved })); }, [complaints]);
  const filteredComplaints = complaints.filter(item => period === 'This Month' || Date.now() - new Date(item.createdAt).getTime() <= (period === 'Today' ? 86400000 : 7 * 86400000));

  // Status breakdown as one horizontal stacked bar - a full picture in a single strip.
  const statusCounts = useMemo(() => {
    const counts = complaints.reduce<Record<string, number>>((result, item) => {
      result[item.status] = (result[item.status] || 0) + 1;
      return result;
    }, {});
    return STATUS_ORDER.filter((status) => counts[status]).map((status) => ({ status, count: counts[status] }));
  }, [complaints]);
  const statusRow = useMemo(
    () => [Object.fromEntries(statusCounts.map(({ status, count }) => [status, count]))],
    [statusCounts]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-500">Plant IT Operations</div>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Real-time overview of IT complaints</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Live records from PostgreSQL, refreshed every 5 seconds.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Today', 'This Week', 'This Month'].map((item) => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`rounded-2xl px-4 py-2 text-sm transition ${period === item ? 'bg-sky-500 font-semibold text-slate-950' : 'bg-slate-900 text-slate-200 hover:bg-slate-800'}`}
              >
                {item}
              </button>
            ))}
            <button title="Refresh dashboard" onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((metric) => (
          <div key={metric.label} className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                <div className="mt-4 text-3xl font-semibold text-white">{metric.value}</div>
              </div>
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-slate-900 text-sky-300">
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400">{metric.delta}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">New WhatsApp Complaints</h2>
              <p className="text-sm text-slate-400">{isFetching ? 'Syncing with backend...' : `${filteredComplaints.length} live records`}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Live</span>
              <button onClick={() => navigate('/complaints')} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">View all</button>
            </div>
          </div>
          {isLoading ? (
            <p className="text-slate-400">Loading complaints...</p>
          ) : filteredComplaints.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">No complaints for this period.</p>
          ) : (
            <div className="space-y-4">
              {filteredComplaints.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-slate-800 bg-slate-900/95 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{relativeTime(item.createdAt)}</div>
                      <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 break-words text-sm text-slate-400">{item.description}</p>
                    </div>
                    <div className="grid shrink-0 gap-1 text-sm text-slate-300 sm:text-right">
                      <span>{item.group || 'WhatsApp'}</span>
                      <span>{item.reporter || 'Unknown sender'}</span>
                      <span>{item.location || 'Unassigned'}</span>
                      <span>Priority: {item.priority}</span>
                      <span>Status: {item.status}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedComplaint(item)} className="mt-4 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">View complaint</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white">Status breakdown</h2>
            <p className="text-sm text-slate-400">Every complaint on record, at a glance</p>
          </div>
          {statusCounts.length === 0 ? (
            <p className="text-slate-400">No status data yet.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={64}>
                <BarChart data={statusRow} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey={() => 'status'} hide />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                  {statusCounts.map(({ status }) => (
                    <Bar key={status} dataKey={status} stackId="a" fill={statusColors[status] || '#64748b'} barSize={28} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                {statusCounts.map(({ status, count }) => (
                  <span key={status} className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[status] || '#64748b' }} />
                    {status.replace('_', ' ')} · {count}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-semibold text-white">Open vs Resolved</h2>
            <p className="mb-4 text-sm text-slate-400">Last seven days from live records</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke={axisColor} />
                <YAxis stroke={axisColor} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="open" name="Open" stroke={trendOpen} fill={`${trendOpen}25`} strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke={trendResolved} fill={`${trendResolved}25`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-5 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: trendOpen }} /> Open</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: trendResolved }} /> Resolved</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Want the deeper breakdown?</h2>
            <p className="text-sm text-slate-400">Category, department, priority, resolution speed, and a filterable trend explorer.</p>
          </div>
          <button onClick={() => navigate('/analytics')} className="shrink-0 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
            Open Analytics
          </button>
        </div>
      </section>

      {selectedComplaint && <ComplaintDetailModal complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />}
    </div>
  );
}
