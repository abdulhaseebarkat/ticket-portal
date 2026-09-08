import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, MessageCircle, Home, Users, ListChecks, BarChart3, KeyRound, Tags } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ChangePasswordModal } from '../ChangePasswordModal';

const navItems = [
  { label: 'Dashboard', to: '/', icon: Home },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Complaints', to: '/complaints', icon: ListChecks },
  { label: 'WhatsApp Groups', to: '/groups', icon: Users },
  { label: 'Categories & Equipment', to: '/reference-data', icon: Tags },
  { label: 'WhatsApp Simulator', to: '/simulator', icon: MessageCircle }
];

export function Sidebar() {
  const { email, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <aside className="w-full md:w-72 xl:w-80 border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl">
      <div className="p-6 border-b border-slate-800">
        <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Plant IT Support</div>
        <div className="mt-4 text-2xl font-semibold text-white">Portal</div>
        <div className="mt-2 text-sm text-slate-400">Complaint monitoring & operations dashboard</div>
      </div>
      <nav className="p-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive ? 'bg-slate-800 text-white shadow-card' : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Signed in as</div>
        <div className="mt-3 break-all text-sm font-semibold text-white">{email}</div>
        <button
          onClick={() => setShowChangePassword(true)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 transition hover:border-sky-400 hover:bg-sky-500/10 hover:text-white"
        >
          <KeyRound className="h-4 w-4" /> Change password
        </button>
        <button
          onClick={logout}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 transition hover:border-rose-400 hover:bg-rose-500/10 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </aside>
  );
}
