import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  ClipboardEdit,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  PlusCircle,
  RefreshCcw,
  User,
  Wrench,
  X,
} from 'lucide-react';
import {
  fetchCategories,
  fetchComplaintDetail,
  fetchEquipmentOptions,
  fetchLocations,
  updateComplaint,
} from '../lib/api';
import { PRIORITY_ORDER, STATUS_ORDER, statusColors } from '../lib/chartColors';
import { ComplaintBadge, priorityAccent, priorityStyles, statusStyles } from './ComplaintBadge';
import { descriptionRemainder } from '../lib/complaintText';
import type { ComplaintDetail, ComplaintSummary, ComplaintUpdatePayload } from '../types/complaint';

const RESOLVED_STATUSES = new Set(['RESOLVED', 'CLOSED']);

const eventMeta: Record<string, { label: string; icon: typeof PlusCircle; dot: string }> = {
  CREATED: { label: 'Reported', icon: PlusCircle, dot: 'bg-sky-400' },
  STATUS_CHANGE: { label: 'Status changed', icon: RefreshCcw, dot: 'bg-amber-400' },
  COMMENT: { label: 'Reply', icon: MessageSquare, dot: 'bg-slate-500' },
  CORRECTED: { label: 'Manually corrected', icon: ClipboardEdit, dot: 'bg-violet-400' },
};

interface ComplaintDetailModalProps {
  complaint: ComplaintSummary;
  onClose: () => void;
}

/** Turns "" into null so an emptied dropdown means "unassign", not an invalid id. */
const toNullableId = (value: string) => (value === '' ? null : Number(value));

export function ComplaintDetailModal({ complaint, onClose }: ComplaintDetailModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ComplaintUpdatePayload | null>(null);

  const { data: detail } = useQuery<ComplaintDetail>({
    queryKey: ['complaintDetail', complaint.id],
    queryFn: () => fetchComplaintDetail(complaint.id),
  });

  // Reference lists only matter once editing starts - no need to fetch them
  // just to view a complaint.
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, enabled: isEditing });
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: fetchLocations, enabled: isEditing });
  const { data: equipmentOptions } = useQuery({ queryKey: ['equipmentOptions'], queryFn: fetchEquipmentOptions, enabled: isEditing });

  const saveMutation = useMutation({
    mutationFn: (payload: ComplaintUpdatePayload) => updateComplaint(complaint.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaintDetail', complaint.id] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setIsEditing(false);
      setForm(null);
    },
  });

  const startEditing = () => {
    if (!detail) return;
    setForm({
      title: detail.title,
      categoryId: detail.categoryId ?? null,
      equipmentId: detail.equipmentId ?? null,
      equipmentReference: detail.equipmentReference ?? '',
      locationId: detail.locationId ?? null,
      priority: detail.priority,
      status: detail.status,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setForm(null);
  };

  const isResolved = RESOLVED_STATUSES.has(complaint.status);
  const department = detail?.department || complaint.department;
  const resolvedBy = detail?.resolvedBy || complaint.resolvedBy;
  const equipment = complaint.equipment || detail?.equipmentReference || complaint.equipmentReference;
  const remainder = descriptionRemainder(complaint.title, complaint.description);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-700 bg-slate-900 shadow-2xl">
        <span className={`w-1.5 shrink-0 ${priorityAccent[complaint.priority] || 'bg-slate-600'}`} aria-hidden="true" />
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{complaint.complaintNumber}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{complaint.title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!isEditing && detail && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
              <button aria-label="Close complaint" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <ComplaintBadge label={complaint.priority} styles={priorityStyles} />
            <ComplaintBadge label={complaint.status} styles={statusStyles} />
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">{complaint.category || 'Other'}</span>
          </div>

          {remainder && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{remainder}</p>
            </div>
          )}

          {isEditing && form ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Correct what the system got wrong - saved changes show up on the timeline below.
              </p>

              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <select
                    value={form.categoryId ?? ''}
                    onChange={(e) => setForm({ ...form, categoryId: toNullableId(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Location">
                  <select
                    value={form.locationId ?? ''}
                    onChange={(e) => setForm({ ...form, locationId: toNullableId(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned</option>
                    {locations?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Equipment">
                  <select
                    value={form.equipmentId ?? ''}
                    onChange={(e) => setForm({ ...form, equipmentId: toNullableId(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned</option>
                    {equipmentOptions?.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.equipmentCode} - {eq.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Equipment reference (free text)">
                  <input
                    value={form.equipmentReference ?? ''}
                    onChange={(e) => setForm({ ...form, equipmentReference: e.target.value })}
                    placeholder="e.g. TB-045, not yet in the equipment list"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                  />
                </Field>

                <Field label="Priority">
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    {PRIORITY_ORDER.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-red-400">Couldn&apos;t save that change. Try again.</p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEditing}
                  disabled={saveMutation.isPending}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.title.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-800">
              <Fact icon={Building2} label="Department" value={department} secondary={complaint.location} />
              <Fact icon={Wrench} label="Equipment" value={equipment} />
              <Fact icon={User} label="Raised by" value={complaint.reporter} fallback="Unknown" />
              {isResolved && <Fact icon={CheckCircle2} label="Solved by" value={resolvedBy} fallback="Unknown" accent />}
              <Fact icon={MessageCircle} label="Source" value={complaint.group} secondary={complaint.source} />
            </div>
          )}

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
                {detail.events.map((event, index) => {
                  const meta = eventMeta[event.eventType] || { label: event.eventType, icon: MessageSquare, dot: 'bg-slate-500' };
                  const Icon = meta.icon;
                  const statusColor = event.eventType === 'STATUS_CHANGE' && event.newValue ? statusColors[event.newValue] : undefined;
                  return (
                    <div key={index} className="flex gap-3">
                      <div className="flex shrink-0 flex-col items-center">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${statusColor ?? '#334155'}25` }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: statusColor ?? '#94a3b8' }} />
                        </span>
                        {index < detail.events!.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-800" />}
                      </div>
                      <div className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 pb-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {meta.label}
                            {event.eventType === 'STATUS_CHANGE' && event.newValue ? ` → ${event.newValue.replace('_', ' ')}` : ''}
                          </span>
                          <span>{new Date(event.createdAt).toLocaleString()}</span>
                        </div>
                        {event.description && <p className="mt-2 text-sm text-slate-300">{event.description}</p>}
                        <p className="mt-1 text-xs text-slate-500">By {event.performedBy || 'Unknown'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  secondary,
  accent,
  fallback = 'Unassigned',
}: {
  icon: typeof Building2;
  label: string;
  value?: string | null;
  secondary?: string | null;
  accent?: boolean;
  fallback?: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/60 px-4 py-3">
      <Icon className={`h-4 w-4 shrink-0 ${accent ? 'text-emerald-400' : 'text-slate-500'}`} />
      <span className="w-24 shrink-0 text-xs uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className={`min-w-0 flex-1 truncate text-sm ${accent ? 'text-emerald-300' : 'text-slate-200'}`}>
        {value || fallback}
        {secondary && <span className="text-slate-500"> · {secondary}</span>}
      </span>
    </div>
  );
}
