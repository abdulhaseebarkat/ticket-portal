import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGroups, updateGroup, replayGroupMessages } from '../lib/api';

interface Group {
  id: number;
  externalGroupId: string;
  name: string;
  area: string | null;
  active: boolean;
  monitoringEnabled: boolean;
  defaultCategory: string | null;
}

type View = 'monitored' | 'all' | 'archived';

const categoryOptions = ['Scanner', 'HMI', 'Zebra Printer', 'Network', 'Computer', 'Software', 'Internet', 'Other'];

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Group[]>({ queryKey: ['whatsappGroups'], queryFn: fetchGroups });
  const [drafts, setDrafts] = useState<Record<number, Partial<Group>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [replayingId, setReplayingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [view, setView] = useState<View>('monitored');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);

  const groups = data ?? [];

  const changeView = (next: View) => {
    setView(next);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // active = not archived. A group discovered by the bridge starts active
  // but unmonitored; archiving (active=false) is a separate, permanent
  // "this isn't a real plant group" decision - the periodic bridge sync
  // never resets it, so archiving something sticks even across reconnects.
  const monitoredGroups = useMemo(() => groups.filter((g) => g.active && g.monitoringEnabled), [groups]);
  const allActiveGroups = useMemo(() => groups.filter((g) => g.active), [groups]);
  const archivedGroups = useMemo(() => groups.filter((g) => !g.active), [groups]);

  const visibleGroups = view === 'monitored' ? monitoredGroups : view === 'all' ? allActiveGroups : archivedGroups;

  const getDraft = (group: Group): Group => ({ ...group, ...drafts[group.id] });

  const updateDraft = (id: number, patch: Partial<Group>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const clearDraft = (id: number) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const persist = async (group: Group, patch: Partial<Group>, successMessage: string, failureMessage: string) => {
    const next = { ...getDraft(group), ...patch };
    setSavingId(group.id);
    try {
      await updateGroup(group.id, {
        name: next.name,
        area: next.area,
        active: next.active,
        monitoringEnabled: next.monitoringEnabled,
        defaultCategory: next.defaultCategory,
      });
      setStatusMessage(successMessage);
      await queryClient.invalidateQueries({ queryKey: ['whatsappGroups'] });
      clearDraft(group.id);
    } catch (error) {
      setStatusMessage(failureMessage);
    } finally {
      setSavingId(null);
    }
  };

  const handleSave = (group: Group) => {
    const draft = getDraft(group);
    persist(group, {}, `Saved "${draft.name}".`, `Failed to save "${draft.name}". Please try again.`);
  };

  // Archiving also turns monitoring off - an archived-but-still-monitored
  // group would be a confusing, contradictory state to leave behind.
  const handleArchive = (group: Group) => {
    if (!window.confirm(`Archive "${group.name}"? It'll disappear from every view here except "Archived" - you can restore it later if needed.`)) {
      return;
    }
    persist(group, { active: false, monitoringEnabled: false }, `Archived "${group.name}".`, `Failed to archive "${group.name}". Please try again.`);
  };

  const handleBulkArchive = async () => {
    const targets = visibleGroups.filter((g) => selectedIds.has(g.id));
    if (targets.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Archive ${targets.length} group(s)? They'll disappear from every view here except "Archived" - you can restore any of them later if needed.`
      )
    ) {
      return;
    }
    setIsBulkArchiving(true);
    try {
      const results = await Promise.allSettled(
        targets.map((group) =>
          updateGroup(group.id, {
            name: group.name,
            area: group.area,
            active: false,
            monitoringEnabled: false,
            defaultCategory: group.defaultCategory,
          })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      setStatusMessage(
        failed === 0
          ? `Archived ${targets.length} group(s).`
          : `Archived ${targets.length - failed} of ${targets.length} group(s) - ${failed} failed, try again for those.`
      );
      await queryClient.invalidateQueries({ queryKey: ['whatsappGroups'] });
      setSelectedIds(new Set());
    } finally {
      setIsBulkArchiving(false);
    }
  };

  const handleRestore = (group: Group) => {
    persist(group, { active: true }, `Restored "${group.name}".`, `Failed to restore "${group.name}". Please try again.`);
  };

  const handleReplay = async (group: Group) => {
    if (
      !window.confirm(
        `Rebuild "${group.name}"'s complaints from its stored message history using the current rules? This clears and recreates them - any manual edits would be lost.`
      )
    ) {
      return;
    }
    setReplayingId(group.id);
    try {
      const result = await replayGroupMessages(group.id);
      setStatusMessage(`Replayed ${result.messagesReplayed} message(s) for "${group.name}".`);
      await queryClient.invalidateQueries({ queryKey: ['allComplaints'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    } catch (error) {
      setStatusMessage(`Failed to replay "${group.name}". Please try again.`);
    } finally {
      setReplayingId(null);
    }
  };

  const tabs: { key: View; label: string; count: number }[] = [
    { key: 'monitored', label: 'Monitored', count: monitoredGroups.length },
    { key: 'all', label: 'All active', count: allActiveGroups.length },
    { key: 'archived', label: 'Archived', count: archivedGroups.length },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-500">WhatsApp Groups</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Department group monitoring</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Groups discovered by the WhatsApp bridge appear under &quot;All active&quot; automatically, with monitoring
              off. Turn monitoring on and set an area to start turning that group&apos;s messages into complaints - or
              archive anything that isn&apos;t a real plant group so it stops cluttering this list.
            </p>
          </div>
          {statusMessage && <div className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-200">{statusMessage}</div>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => changeView(tab.key)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                view === tab.key ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </section>

      <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        {isLoading ? (
          <p className="text-slate-400">Loading groups...</p>
        ) : groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
            No WhatsApp groups discovered yet. Link the bridge to a WhatsApp number that&apos;s a member of your
            department groups - they&apos;ll appear here automatically once it connects.
          </p>
        ) : visibleGroups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
            {view === 'monitored'
              ? "No groups are being monitored yet - switch to \"All active\" to turn one on."
              : view === 'archived'
                ? 'Nothing archived.'
                : 'No active groups.'}
          </p>
        ) : view === 'archived' ? (
          <div className="space-y-3">
            {archivedGroups.map((group) => (
              <div key={group.id} className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-800 bg-slate-900/95 p-5">
                <div className="min-w-0">
                  <div className="text-base font-medium text-slate-300">{group.name}</div>
                  <div className="mt-1 truncate text-xs uppercase tracking-[0.2em] text-slate-500" title={group.externalGroupId}>
                    {group.externalGroupId}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(group)}
                  disabled={savingId === group.id}
                  className="shrink-0 rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {savingId === group.id ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={visibleGroups.length > 0 && selectedIds.size === visibleGroups.length}
                  onChange={(e) => setSelectedIds(e.target.checked ? new Set(visibleGroups.map((g) => g.id)) : new Set())}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500"
                />
                Select all ({visibleGroups.length})
              </label>
              <span className="text-sm text-slate-500">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkArchive}
                disabled={selectedIds.size === 0 || isBulkArchiving}
                className="ml-auto rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBulkArchiving ? 'Archiving...' : `Archive selected (${selectedIds.size})`}
              </button>
            </div>
            {visibleGroups.map((group) => {
              const draft = getDraft(group);
              return (
                <div key={group.id} className="flex items-stretch gap-4 rounded-[24px] border border-slate-800 bg-slate-900/95 p-5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(group.id)}
                    onChange={() => toggleSelected(group.id)}
                    className="mt-1 h-4 w-4 shrink-0 self-start rounded border-slate-700 bg-slate-900 text-sky-500"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 lg:w-56 lg:shrink-0">
                      <div className="text-lg font-semibold text-white">{group.name}</div>
                      <div className="mt-1 truncate text-xs uppercase tracking-[0.2em] text-slate-500" title={group.externalGroupId}>
                        {group.externalGroupId}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            draft.monitoringEnabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {draft.monitoringEnabled ? 'Monitoring on' : 'Not monitored yet'}
                        </span>
                      </div>
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-3">
                      <label className="text-sm text-slate-300">
                        Area
                        <input
                          value={draft.area ?? ''}
                          onChange={(e) => updateDraft(group.id, { area: e.target.value })}
                          placeholder="e.g. Curing"
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        Default category
                        <select
                          value={draft.defaultCategory ?? ''}
                          onChange={(e) => updateDraft(group.id, { defaultCategory: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none"
                        >
                          <option value="">None</option>
                          {categoryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={draft.monitoringEnabled}
                          onChange={(e) => updateDraft(group.id, { monitoringEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500"
                        />
                        Monitoring enabled
                      </label>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        onClick={() => handleArchive(group)}
                        disabled={savingId === group.id}
                        title="Not a real plant group - hide it from this list permanently"
                        className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => handleReplay(group)}
                        disabled={replayingId === group.id}
                        title="Rebuild this group's complaints from its stored message history using the current rules"
                        className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                      >
                        {replayingId === group.id ? 'Replaying...' : 'Replay messages'}
                      </button>
                      <button
                        onClick={() => handleSave(group)}
                        disabled={savingId === group.id}
                        className="rounded-2xl bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
                      >
                        {savingId === group.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
