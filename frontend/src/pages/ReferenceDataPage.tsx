import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCategory, createEquipment, fetchCategoryRecords, fetchEquipmentRecords, updateCategory, updateEquipment } from '../lib/api';
import type { CategoryRecord, EquipmentRecord } from '../types/complaint';

type Tab = 'categories' | 'equipment';

export default function ReferenceDataPage() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        <div className="text-sm uppercase tracking-[0.28em] text-slate-500">Reference Data</div>
        <h1 className="mt-3 text-3xl font-semibold text-white">Categories & Equipment</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Add a category or a named piece of equipment here once, and it's recognized in every future WhatsApp
          message that mentions it - not just correctable one complaint at a time from the Complaints page.
        </p>
        <div className="mt-5 flex gap-2">
          {(['categories', 'equipment'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-2xl px-4 py-2 text-sm font-medium capitalize transition ${
                tab === t ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {tab === 'categories' ? <CategoriesTab /> : <EquipmentTab />}
    </div>
  );
}

function CategoriesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<CategoryRecord[]>({ queryKey: ['categoryRecords'], queryFn: fetchCategoryRecords });
  const [drafts, setDrafts] = useState<Record<number, Partial<CategoryRecord>>>({});
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const categories = data ?? [];

  const createMutation = useMutation({
    mutationFn: () => createCategory({ name: newName.trim(), description: newDescription.trim() || null, active: true }),
    onSuccess: () => {
      setStatusMessage(`Added category "${newName.trim()}".`);
      setNewName('');
      setNewDescription('');
      queryClient.invalidateQueries({ queryKey: ['categoryRecords'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => setStatusMessage('Failed to add that category. Try again.'),
  });

  const updateMutation = useMutation({
    mutationFn: (category: CategoryRecord) =>
      updateCategory(category.id, { name: category.name, description: category.description ?? null, active: category.active }),
    onSuccess: (_, category) => {
      setStatusMessage(`Saved "${category.name}".`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['categoryRecords'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => setStatusMessage('Failed to save that change. Try again.'),
  });

  const getDraft = (category: CategoryRecord): CategoryRecord => ({ ...category, ...drafts[category.id] });
  const updateDraft = (id: number, patch: Partial<CategoryRecord>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        <h2 className="text-lg font-semibold text-white">Add a category</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. MES System"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newName.trim() || createMutation.isPending}
            className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        {statusMessage && <p className="mb-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-200">{statusMessage}</p>}
        {isLoading ? (
          <p className="text-slate-400">Loading categories...</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const draft = getDraft(category);
              const dirty = Boolean(drafts[category.id]);
              return (
                <div key={category.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(category.id, { name: e.target.value })}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={draft.description ?? ''}
                    onChange={(e) => updateDraft(category.id, { description: e.target.value })}
                    placeholder="Description"
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                  />
                  <label className="flex items-center gap-2 self-center text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => updateDraft(category.id, { active: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500"
                    />
                    Active
                  </label>
                  <button
                    onClick={() => updateMutation.mutate(draft)}
                    disabled={!dirty || updateMutation.isPending}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EquipmentTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<EquipmentRecord[]>({ queryKey: ['equipmentRecords'], queryFn: fetchEquipmentRecords });
  const [drafts, setDrafts] = useState<Record<number, Partial<EquipmentRecord>>>({});
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const equipment = data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      createEquipment({
        equipmentCode: newCode.trim(),
        name: newName.trim(),
        type: newType.trim() || null,
        manufacturer: null,
        model: null,
        locationId: null,
        department: null,
        active: true,
      }),
    onSuccess: () => {
      setStatusMessage(`Added equipment "${newName.trim()}".`);
      setNewCode('');
      setNewName('');
      setNewType('');
      queryClient.invalidateQueries({ queryKey: ['equipmentRecords'] });
      queryClient.invalidateQueries({ queryKey: ['equipmentOptions'] });
    },
    onError: () => setStatusMessage('Failed to add that equipment - the code may already be in use.'),
  });

  const updateMutation = useMutation({
    mutationFn: (item: EquipmentRecord) =>
      updateEquipment(item.id, {
        equipmentCode: item.equipmentCode,
        name: item.name,
        type: item.type ?? null,
        manufacturer: null,
        model: null,
        locationId: null,
        department: null,
        active: item.active,
      }),
    onSuccess: (_, item) => {
      setStatusMessage(`Saved "${item.name}".`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['equipmentRecords'] });
      queryClient.invalidateQueries({ queryKey: ['equipmentOptions'] });
    },
    onError: () => setStatusMessage('Failed to save that change. Try again.'),
  });

  const getDraft = (item: EquipmentRecord): EquipmentRecord => ({ ...item, ...drafts[item.id] });
  const updateDraft = (id: number, patch: Partial<EquipmentRecord>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        <h2 className="text-lg font-semibold text-white">Add equipment</h2>
        <p className="mt-1 text-sm text-slate-400">
          A named system (not just a coded machine) works fine here too - e.g. code <code>MES-BOOKING</code>, name
          &quot;Booking MES System&quot;. Once added, future messages that mention its name are recognized automatically.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Code, e.g. MES-BOOKING"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name, e.g. Booking MES System"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <input
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="Type (optional)"
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!newCode.trim() || !newName.trim() || createMutation.isPending}
            className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-800 bg-slate-950/95 p-7 shadow-card">
        {statusMessage && <p className="mb-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm text-slate-200">{statusMessage}</p>}
        {isLoading ? (
          <p className="text-slate-400">Loading equipment...</p>
        ) : equipment.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-400">
            No equipment in the catalog yet - add one above.
          </p>
        ) : (
          <div className="space-y-3">
            {equipment.map((item) => {
              const draft = getDraft(item);
              const dirty = Boolean(drafts[item.id]);
              return (
                <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 sm:grid-cols-[1fr_1.4fr_1fr_auto_auto]">
                  <input
                    value={draft.equipmentCode}
                    onChange={(e) => updateDraft(item.id, { equipmentCode: e.target.value })}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(item.id, { name: e.target.value })}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={draft.type ?? ''}
                    onChange={(e) => updateDraft(item.id, { type: e.target.value })}
                    placeholder="Type"
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                  />
                  <label className="flex items-center gap-2 self-center text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => updateDraft(item.id, { active: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500"
                    />
                    Active
                  </label>
                  <button
                    onClick={() => updateMutation.mutate(draft)}
                    disabled={!dirty || updateMutation.isPending}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
