import { Search, Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Topbar() {
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl sticky top-0 z-30">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Plant IT Operations</div>
          <div className="text-xl font-semibold text-white">Real-time monitoring & analytics</div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="relative hidden md:flex items-center rounded-2xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-slate-300 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search complaints, equipment, groups..."
              className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            />
          </div>
          <button aria-label="Show notifications" onClick={() => setShowNotifications((visible) => !visible)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-300 transition hover:bg-slate-800">
            <Bell className="h-5 w-5" />
            {showNotifications && <span className="absolute right-0 top-12 z-40 flex w-56 items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 p-3 text-left text-xs text-slate-300 shadow-xl">No new notifications <X className="h-3 w-3" /></span>}
          </button>
          <div className="hidden h-11 items-center rounded-2xl bg-slate-900 px-4 text-right text-xs text-slate-300 sm:flex">
            <span className="mr-2 h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span><strong className="block text-sm font-medium text-slate-200">Online</strong>{now.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
