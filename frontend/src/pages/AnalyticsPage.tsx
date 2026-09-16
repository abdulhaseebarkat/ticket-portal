import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllComplaints, fetchLocations } from '../lib/api';
import { RankedBarChart } from '../components/charts/RankedBarChart';
import { Heatmap } from '../components/charts/Heatmap';
import type { ComplaintSummary } from '../types/complaint';
import { Activity, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { categorical, sequentialPrimary, sequentialSecondary, priorityColors, PRIORITY_ORDER, trendNew, trendResolved, chartTooltipStyle, axisColor, gridColor } from '../lib/chartColors';

const RANGE_PRESETS = ['Today', 'Last 7 Days', 'Last 30 Days', 'All Time', 'Custom'] as const;
type RangePreset = (typeof RANGE_PRESETS)[number];

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

function rangeBounds(preset: RangePreset, customStart: string, customEnd: string): { start: Date; end: Date } | null {
  const now = new Date();
  if (preset === 'Today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (preset === 'Last 7 Days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (preset === 'Last 30 Days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (preset === 'Custom' && customStart) {
    const start = new Date(`${customStart}T00:00:00`);
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : now;
    return { start, end };
  }
  return null; // 'All Time'
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<ComplaintSummary[]>({ queryKey: ['allComplaints'], queryFn: fetchAllComplaints });
  const complaints = data ?? [];
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

  const [department, setDepartment] = useState('All Departments');
  const [rangePreset, setRangePreset] = useState<RangePreset>('Last 30 Days');
  const [customStart, setCustomStart] = useState(toDateInputValue(new Date(Date.now() - 29 * 86400000)));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(new Date()));

  const departmentOptions = useMemo(
    () => ['All Departments', ...Array.from(new Set(complaints.map((item) => item.location || 'Unassigned'))).sort((a, b) => a.localeCompare(b))],
    [complaints]
  );

  const bounds = useMemo(() => rangeBounds(rangePreset, customStart, customEnd), [rangePreset, customStart, customEnd]);

  const filteredComplaints = useMemo(
    () =>
      complaints.filter((item) => {
        const matchesDepartment = department === 'All Departments' || (item.location || 'Unassigned') === department;
        if (!matchesDepartment) return false;
        if (!bounds) return true;
        const createdAt = new Date(item.createdAt);
        return createdAt >= bounds.start && createdAt <= bounds.end;
      }),
    [complaints, department, bounds]
  );

  const recap = useMemo(() => {
    const total = filteredComplaints.length;
    const resolved = filteredComplaints.filter((item) => item.status === 'RESOLVED').length;
    // "Open" means still needs attention - total minus both terminal
    // states. CLOSED is just as done as RESOLVED, so it must be excluded
    // here too, not just RESOLVED - otherwise a closed complaint keeps
    // counting as open forever.
    const closed = filteredComplaints.filter((item) => item.status === 'CLOSED').length;
    const open = total - resolved - closed;
    const resolutionMinutes = filteredComplaints
      .filter((item) => item.resolvedAt)
      .map((item) => (new Date(item.resolvedAt as string).getTime() - new Date(item.createdAt).getTime()) / 60000)
      .filter((minutes) => minutes >= 0);
    const avgResolution = resolutionMinutes.length
      ? formatDuration(resolutionMinutes.reduce((sum, minutes) => sum + minutes, 0) / resolutionMinutes.length)
      : 'No data yet';
    return { total, open, resolved, avgResolution };
  }, [filteredComplaints]);

  // "New" buckets by the day a complaint was actually created; "Resolved"
  // buckets by the day it was actually resolved (resolvedAt) - not by
  // today's status, which would put a resolution on whatever day the
  // complaint happened to be *created* and keep silently rewriting old
  // bars as old tickets eventually close.
  const trendData = useMemo(() => {
    if (filteredComplaints.length === 0) return [];
    let start: Date;
    let end: Date;
    if (bounds) {
      start = bounds.start;
      end = bounds.end;
    } else {
      // "All Time" has no fixed end - stretch it to cover the latest
      // resolution too, not just the latest creation, so a complaint
      // resolved after every other complaint's creation date still gets a
      // bar to land on.
      const timestamps = filteredComplaints.flatMap((item) => [new Date(item.createdAt).getTime(), ...(item.resolvedAt ? [new Date(item.resolvedAt).getTime()] : [])]);
      start = new Date(Math.min(...timestamps));
      end = new Date(Math.max(...timestamps));
    }
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    const days: { key: string; label: string; new: number; resolved: number }[] = [];
    let safety = 0;
    while (cursor <= endDay && safety < 120) {
      days.push({ key: cursor.toDateString(), label: cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), new: 0, resolved: 0 });
      cursor.setDate(cursor.getDate() + 1);
      safety += 1;
    }
    filteredComplaints.forEach((item) => {
      const createdDay = days.find((entry) => entry.key === new Date(item.createdAt).toDateString());
      if (createdDay) createdDay.new += 1;
      if (item.resolvedAt) {
        const resolvedDay = days.find((entry) => entry.key === new Date(item.resolvedAt as string).toDateString());
        if (resolvedDay) resolvedDay.resolved += 1;
      }
    });
    return days;
  }, [filteredComplaints, bounds]);

  // The real unresolved backlog as of each day on the trend above, broken
  // out per location - a running total (created so far minus resolved so
  // far) per location, deliberately NOT limited to complaints created
  // within the date range, so each line starts at the backlog that
  // actually existed on day one rather than a misleading 0. Its own
  // chart, never combined onto the New/Resolved axis above - a running
  // total and a daily count are different measures and don't belong on
  // one y-axis.

  // Stable color per location, assigned from the FULL known-location list
  // (not whichever subset happens to be charted right now) - so a line's
  // color never shifts just because the department filter narrows what's
  // visible. "Unassigned" always takes the next slot after every real
  // location, for the same reason.
  const locationColorMap = useMemo(() => {
    const names = (locations ?? []).filter((location) => location.active).map((location) => location.name).sort((a, b) => a.localeCompare(b));
    const map: Record<string, string> = {};
    names.forEach((name, index) => {
      map[name] = categorical[index % categorical.length];
    });
    map.Unassigned = categorical[names.length % categorical.length];
    return map;
  }, [locations]);

  // Only chart locations that actually have at least one complaint on
  // record (all-time, regardless of the date range) - a location with
  // zero complaints ever contributes a flat line at 0 forever, which is
  // just clutter, not information. Respects the department filter: pick
  // one location there and this naturally narrows to just that line.
  const backlogLocations = useMemo(() => {
    if (department !== 'All Departments') return [department];
    return Array.from(new Set(complaints.map((item) => item.location || 'Unassigned'))).sort((a, b) => a.localeCompare(b));
  }, [department, complaints]);

  const backlogByLocationData = useMemo(() => {
    return trendData.map((day) => {
      const dayEnd = new Date(day.key);
      dayEnd.setHours(23, 59, 59, 999);
      const row: Record<string, number | string> = { label: day.label };
      backlogLocations.forEach((location) => {
        const atLocation = complaints.filter((item) => (item.location || 'Unassigned') === location);
        const createdSoFar = atLocation.filter((item) => new Date(item.createdAt) <= dayEnd).length;
        const resolvedSoFar = atLocation.filter((item) => item.resolvedAt && new Date(item.resolvedAt) <= dayEnd).length;
        row[location] = createdSoFar - resolvedSoFar;
      });
      return row;
    });
  }, [trendData, backlogLocations, complaints]);

  // One-line overall takeaway (summed across every charted location) below
  // the per-location detail - a plain start-vs-end comparison misses a
  // range that spiked and came back down, so call out the peak whenever
  // it's above both endpoints instead of calling that "steady".
  const backlogSummary = useMemo(() => {
    if (backlogByLocationData.length === 0) return 'No data yet.';
    const totals = backlogByLocationData.map((day) => backlogLocations.reduce((sum, location) => sum + (Number(day[location]) || 0), 0));
    const start = totals[0];
    const end = totals[totals.length - 1];
    const peak = Math.max(...totals);
    if (peak > Math.max(start, end)) {
      return `Peaked at ${peak} unresolved total during this range, back to ${end} now.`;
    }
    if (end > start) return 'Unresolved backlog is growing over this range.';
    if (end < start) return 'Unresolved backlog is shrinking over this range.';
    return 'Unresolved backlog is holding steady over this range.';
  }, [backlogByLocationData, backlogLocations]);

  const categoryData = useMemo(() => {
    const counts = filteredComplaints.reduce<Record<string, number>>((result, item) => {
      const key = item.category || 'Other';
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredComplaints]);

  const departmentData = useMemo(() => {
    const counts = filteredComplaints.reduce<Record<string, number>>((result, item) => {
      const key = item.location || 'Unassigned';
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredComplaints]);

  const priorityData = useMemo(() => {
    const counts = filteredComplaints.reduce<Record<string, number>>((result, item) => {
      result[item.priority] = (result[item.priority] || 0) + 1;
      return result;
    }, {});
    return PRIORITY_ORDER.filter((priority) => counts[priority]).map((priority) => ({
      name: priority.charAt(0) + priority.slice(1).toLowerCase(),
      value: counts[priority],
      color: priorityColors[priority],
    }));
  }, [filteredComplaints]);

  const resolutionByDepartment = useMemo(() => {
    const buckets: Record<string, number[]> = {};
    filteredComplaints.forEach((item) => {
      if (!item.resolvedAt) return;
      const minutes = (new Date(item.resolvedAt).getTime() - new Date(item.createdAt).getTime()) / 60000;
      if (minutes < 0) return;
      const key = item.location || 'Unassigned';
      buckets[key] ??= [];
      buckets[key].push(minutes);
    });
    return Object.entries(buckets)
      .map(([name, values]) => ({ name, value: values.reduce((sum, minutes) => sum + minutes, 0) / values.length }))
      .sort((a, b) => b.value - a.value);
  }, [filteredComplaints]);

  const heatmapRows = departmentData.map((item) => item.name);
  const heatmapColumns = categoryData.map((item) => item.name);
  const heatmapValue = (row: string, column: string) =>
    filteredComplaints.filter((item) => (item.location || 'Unassigned') === row && (item.category || 'Other') === column).length;

  const recapTiles = [
    { label: 'Total in range', value: recap.total, icon: ShieldAlert },
    { label: 'Unresolved', value: recap.open, icon: Activity },
    { label: 'Resolved', value: recap.resolved, icon: CheckCircle2 },
    { label: 'Avg. Resolution', value: recap.avgResolution, icon: Clock3 },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-7">
        <div className="text-sm uppercase tracking-[0.28em] text-slate-500">Plant IT Operations</div>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Analytics</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Complete tracking and analysis of complaints - by department, by nature, and over time.</p>
      </section>

      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="text-sm text-slate-300">
            Department
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="mt-2 block w-full min-w-[200px] rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-slate-200 outline-none lg:w-auto"
            >
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-2">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setRangePreset(preset)}
                className={`rounded-2xl px-4 py-2 text-sm transition ${
                  rangePreset === preset ? 'bg-sky-500 font-semibold text-slate-950' : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {preset}
              </button>
            ))}
            {rangePreset === 'Custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {isLoading ? (
        <p className="text-slate-400">Loading analytics...</p>
      ) : filteredComplaints.length === 0 ? (
        <p className="rounded-[28px] border border-dashed border-slate-700 bg-slate-950/95 p-10 text-center text-slate-400">
          No complaints match this filter.
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recapTiles.map((tile) => (
              <div key={tile.label} className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{tile.label}</p>
                    <div className="mt-3 text-2xl font-semibold text-white">{tile.value}</div>
                  </div>
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sky-300">
                    <tile.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">New vs Resolved</h2>
                <p className="text-sm text-slate-400">Daily activity across the selected range</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendData} barGap={4} barCategoryGap="24%">
                  <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                  <XAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 12 }} />
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

            <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">Unresolved backlog by location</h2>
                <p className="text-sm text-slate-400">Not-yet-done tickets (open, in progress, or waiting), per location</p>
              </div>
              {backlogLocations.length === 0 ? (
                <p className="pt-16 text-center text-slate-400">No data yet.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={backlogByLocationData}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                      <XAxis dataKey="label" stroke={axisColor} tick={{ fontSize: 12 }} />
                      <YAxis stroke={axisColor} allowDecimals={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      {backlogLocations.map((location) => (
                        <Line
                          key={location}
                          type="monotone"
                          dataKey={location}
                          name={location}
                          stroke={locationColorMap[location] || '#64748b'}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-300">
                    {backlogLocations.map((location) => (
                      <span key={location} className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: locationColorMap[location] || '#64748b' }} />
                        {location}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <p className="mt-3 text-sm text-slate-400">{backlogSummary}</p>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">Complaints by category</h2>
                <p className="text-sm text-slate-400">Nature of the issue</p>
              </div>
              <RankedBarChart data={categoryData} color={sequentialPrimary} />
            </div>
            <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">Complaints by department</h2>
                <p className="text-sm text-slate-400">Where issues are coming from</p>
              </div>
              <RankedBarChart data={departmentData} color={sequentialPrimary} />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white">Department × Category</h2>
              <p className="text-sm text-slate-400">Where each kind of issue is happening, at a glance</p>
            </div>
            {heatmapRows.length === 0 || heatmapColumns.length === 0 ? (
              <p className="text-slate-400">Not enough data yet.</p>
            ) : (
              <Heatmap rows={heatmapRows} columns={heatmapColumns} value={heatmapValue} />
            )}
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">Complaints by priority</h2>
                <p className="text-sm text-slate-400">Severity mix for this filter</p>
              </div>
              <RankedBarChart data={priorityData} height={180} />
            </div>
            <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-5 shadow-card sm:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white">Avg. resolution time by department</h2>
                <p className="text-sm text-slate-400">How fast issues get closed, per zone</p>
              </div>
              {resolutionByDepartment.length === 0 ? (
                <p className="pt-16 text-center text-slate-400">No resolved complaints in this filter yet.</p>
              ) : (
                <RankedBarChart data={resolutionByDepartment} color={sequentialSecondary} valueFormatter={formatDuration} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
