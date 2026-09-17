import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../lib/api';
import { formatDuration, relativeTime } from '../lib/time';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import { StatusBreakdownModal } from '../components/StatusBreakdownModal';
import { ComplaintBadge, priorityAccent, priorityStyles, statusStyles } from '../components/ComplaintBadge';
import { stripMentionTokens } from '../lib/complaintText';
import type { ComplaintSummary } from '../types/complaint';
import { Activity, AlertTriangle, Building2, CheckCircle2, Clock3, FileText, MessageCircle, PieChart as PieChartIcon, RefreshCw, ShieldAlert, TrendingUp, User, Users, Wrench } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { statusColors, STATUS_ORDER, trendNew, trendResolved, kpiAccents, categorical, chartTooltipStyle, axisColor, gridColor } from '../lib/chartColors';

type Complaint = ComplaintSummary;
interface DashboardSummary {
  whatsappComplaints: number; openComplaints: number; inProgressComplaints: number; resolvedToday: number; criticalIssues: number;
  averageResolutionTime: string; complaints: Complaint[];
}

export function LiveDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('This Month');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { data, isLoading, isFetching, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboardSummary'], queryFn: fetchDashboardSummary, refetchInterval: 5000, refetchOnWindowFocus: true,
  });
  const complaints = data?.complaints ?? [];
  const kpis = [
    { label: 'WhatsApp Complaints', value: data?.whatsappComplaints ?? '—', delta: 'From live database', icon: MessageCircle, color: kpiAccents.whatsapp },
    { label: 'Open Complaints', value: data?.openComplaints ?? '—', delta: 'Current open tickets', icon: ShieldAlert, color: kpiAccents.open },
    { label: 'In Progress', value: data?.inProgressComplaints ?? '—', delta: 'Current work queue', icon: Activity, color: kpiAccents.inProgress },
    { label: 'Resolved Today', value: data?.resolvedToday ?? '—', delta: 'Resolved since midnight', icon: CheckCircle2, color: kpiAccents.resolved },
    { label: 'Critical Issues', value: data?.criticalIssues ?? '—', delta: 'Unresolved critical tickets', icon: TrendingUp, color: kpiAccents.critical },
    { label: 'Avg. Resolution', value: data?.averageResolutionTime ?? '—', delta: 'Report to resolved, all-time', icon: Clock3, color: kpiAccents.avgResolution },
  ];

  // "New" buckets by the day a complaint was actually created; "Resolved"
  // buckets by the day it was actually resolved (resolvedAt) - not by
  // today's status, which would put a complaint's resolution on whatever
  // day it happened to be *created* and keep silently rewriting old bars
  // as old tickets eventually close.
  const trendData = useMemo(() => {
    const days = [...Array(7)].map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return { date, label: date.toLocaleDateString(undefined, { weekday: 'short' }), new: 0, resolved: 0 };
    });
    complaints.forEach((item) => {
      const createdDay = days.find((entry) => entry.date.toDateString() === new Date(item.createdAt).toDateString());
      if (createdDay) createdDay.new += 1;
      if (item.resolvedAt) {
        const resolvedDay = days.find((entry) => entry.date.toDateString() === new Date(item.resolvedAt as string).toDateString());
        if (resolvedDay) resolvedDay.resolved += 1;
      }
    });
    return days.map((day) => ({ date: day.label, new: day.new, resolved: day.resolved }));
  }, [complaints]);
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

  // Category mix, all-time - same "everything on record" scope as Status
  // breakdown above, not the period selector (which only scopes the
  // Recent Complaints feed and the top KPI tiles).
  const categoryDistribution = useMemo(() => {
    const counts = complaints.reduce<Record<string, number>>((result, item) => {
      const key = item.category || 'Other';
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts)
      .map(([name, value], index) => ({ name, value, color: categorical[index % categorical.length] }))
      .sort((a, b) => b.value - a.value);
  }, [complaints]);
  const categoryTotal = categoryDistribution.reduce((sum, entry) => sum + entry.value, 0);

  // Critical AND still needing attention - a critical complaint that's
  // already RESOLVED/CLOSED doesn't belong in an "attention" list anymore.
  const criticalComplaints = useMemo(
    () => complaints.filter((item) => item.priority === 'CRITICAL' && item.status !== 'RESOLVED' && item.status !== 'CLOSED'),
    [complaints]
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((metric) => (
          <div key={metric.label} className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                <div className="mt-4 text-3xl font-semibold text-white">{metric.value}</div>
              </div>
              <div
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl"
                style={{ backgroundColor: `${metric.color}22`, color: metric.color }}
              >
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
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                  <FileText className="h-4 w-4" />
                </span>
                <h2 className="text-xl font-semibold text-white">Recent Complaints</h2>
              </div>
              <p className="mt-1 text-sm text-slate-400">{isFetching ? 'Syncing with backend...' : `${filteredComplaints.length} live records`}</p>
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
            <div className="space-y-3">
              {filteredComplaints.map((item) => {
                const isResolved = item.status === 'RESOLVED' || item.status === 'CLOSED';
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedComplaint(item)}
                    className="flex w-full items-stretch gap-0 overflow-hidden rounded-[20px] border border-slate-800 bg-slate-900/95 text-left transition hover:border-slate-700 hover:bg-slate-900"
                  >
                    <span className={`w-1 shrink-0 ${priorityAccent[item.priority] || 'bg-slate-600'}`} aria-hidden="true" />
                    <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{item.complaintNumber}</span>
                        <span className="shrink-0 text-xs text-slate-600">{relativeTime(item.createdAt)}</span>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">{stripMentionTokens(item.title)}</h3>
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

        <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Users className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-semibold text-white">Status breakdown</h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">Every complaint on record, at a glance - click a status for details</p>
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
                    <Bar
                      key={status}
                      dataKey={status}
                      stackId="a"
                      fill={statusColors[status] || '#64748b'}
                      barSize={28}
                      onClick={() => setStatusFilter(status)}
                      cursor="pointer"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-5 flex flex-wrap gap-x-2 gap-y-2 text-sm text-slate-300">
                {statusCounts.map(({ status, count }) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 transition hover:bg-slate-800"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[status] || '#64748b' }} />
                    {status.replace('_', ' ')} · {count}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-semibold text-white">New vs Resolved</h2>
            <p className="mb-4 text-sm text-slate-400">Daily activity, last seven days</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barGap={4} barCategoryGap="24%">
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke={axisColor} />
                <YAxis stroke={axisColor} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                <Bar dataKey="new" name="New" fill={trendNew} radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill={trendResolved} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-5 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: trendNew }} /> New</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: trendResolved }} /> Resolved</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
              <PieChartIcon className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-semibold text-white">Complaint Distribution</h2>
          </div>
          {categoryDistribution.length === 0 ? (
            <p className="text-slate-400">No data yet.</p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                      {categoryDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-white">{categoryTotal}</span>
                  <span className="text-xs uppercase tracking-wide text-slate-500">Total</span>
                </div>
              </div>
              <div className="w-full flex-1 space-y-2">
                {categoryDistribution.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-300">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name}
                    </span>
                    <span className="font-semibold text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-rose-900/40 bg-slate-950/95 p-5 shadow-card sm:p-6">
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-semibold text-white">Critical Attention</h2>
          </div>
          {criticalComplaints.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">No critical tickets right now.</p>
          ) : (
            <div className="space-y-3">
              {criticalComplaints.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedComplaint(item)}
                  className="flex w-full items-stretch gap-0 overflow-hidden rounded-[20px] border border-rose-900/40 bg-rose-500/5 text-left transition hover:border-rose-700 hover:bg-rose-500/10"
                >
                  <span className="w-1 shrink-0 bg-rose-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{item.complaintNumber}</span>
                      <span className="shrink-0 text-xs text-slate-600">{relativeTime(item.createdAt)}</span>
                    </div>
                    <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-white">{stripMentionTokens(item.title)}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <ComplaintBadge label={item.priority} styles={priorityStyles} />
                      <ComplaintBadge label={item.status} styles={statusStyles} />
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">{item.category || 'Other'}</span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                        <span className="truncate">{item.equipment || item.equipmentReference || 'No equipment identified'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                        <span className="truncate">{item.department || 'Unassigned department'}</span>
                        <span className="text-slate-700">·</span>
                        <span className="truncate">{item.location || 'Unassigned location'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {statusFilter && (
        <StatusBreakdownModal
          status={statusFilter}
          complaints={complaints.filter((item) => item.status === statusFilter)}
          onClose={() => setStatusFilter(null)}
          onSelectComplaint={(item) => {
            setStatusFilter(null);
            setSelectedComplaint(item);
          }}
        />
      )}
      {selectedComplaint && <ComplaintDetailModal complaint={selectedComplaint} onClose={() => setSelectedComplaint(null)} />}
    </div>
  );
}
