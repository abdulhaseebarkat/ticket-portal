// Shared priority/status pill styling - single source so every view of a
// complaint (dashboard feed, complaints list, detail modal) renders the
// exact same colors for the exact same status. Previously duplicated
// per-page, which is how they'd drift apart over time.

export const priorityStyles: Record<string, string> = {
  CRITICAL: 'bg-rose-500/15 text-rose-300',
  HIGH: 'bg-amber-500/15 text-amber-300',
  MEDIUM: 'bg-sky-500/15 text-sky-300',
  LOW: 'bg-slate-500/15 text-slate-300',
};

export const statusStyles: Record<string, string> = {
  OPEN: 'bg-orange-500/15 text-orange-300',
  IN_PROGRESS: 'bg-sky-500/15 text-sky-300',
  WAITING: 'bg-amber-500/15 text-amber-300',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300',
  REOPENED: 'bg-rose-500/15 text-rose-300',
  CLOSED: 'bg-slate-600/15 text-slate-300',
};

/** The dot/accent color for a priority - used for the feed's left accent bar. */
export const priorityAccent: Record<string, string> = {
  CRITICAL: 'bg-rose-500',
  HIGH: 'bg-amber-500',
  MEDIUM: 'bg-sky-500',
  LOW: 'bg-slate-600',
};

export function ComplaintBadge({ label, styles }: { label: string; styles: Record<string, string> }) {
  const style = styles[label] || 'bg-slate-700/40 text-slate-300';
  return <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${style}`}>{label.replace('_', ' ')}</span>;
}
