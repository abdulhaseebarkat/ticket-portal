import { useState } from 'react';
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

const categoryOptions = ['Scanner', 'HMI', 'Zebra Printer', 'Network', 'Computer', 'Software', 'Internet', 'Other'];

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Group[]>({ queryKey: ['whatsappGroups'], queryFn: fetchGroups });
  const [drafts, setDrafts] = useState<Record<number, Partial<Group>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [replayingId, setReplayingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const groups = data ?? [];

  const getDraft = (group: Group): Group => ({ ...group, ...drafts[group.id] });

  const updateDraft = (id: number, patch: Partial<Group>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async (group: Group) => {
    const draft = getDraft(group);
    setSavingId(group.id);
    try {
      await updateGroup(group.id, {
        name: draft.name,
        area: draft.area,
        active: draft.active,
        monitoringEnabled: draft.monitoringEnabled,
        defaultCategory: draft.defaultCategory,
      });
      setStatusMessage(`Saved "${draft.name}".`);
      await queryClient.invalidateQueries({ queryKey: ['whatsappGroups'] });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[group.id];
        return next;
      });
    } catch (error) {
      setStatusMessage(`Failed to save "${draft.name}". Please try again.`);
    } finally {
      setSavingId(null);
    }
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

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-500">WhatsApp Groups</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Department group monitoring</h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Groups discovered by the WhatsApp bridge appear below automatically, with monitoring off. Turn
              monitoring on and set an area to start turning that group&apos;s messages into complaints.
            </p>
          </div>
          {statusMessage && <div className="rounded-3xl bg-slate-900 px-4 py-3 text-sm text-slate-200">{statusMessage}</div>}
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
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const draft = getDraft(group);
              return (
                <div key={group.id} className="rounded-[24px] border border-slate-800 bg-slate-900/95 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                    <div className="flex shrink-0 gap-2">
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
