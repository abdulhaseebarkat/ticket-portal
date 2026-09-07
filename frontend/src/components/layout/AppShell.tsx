import { Outlet, Route, Routes, Navigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { LiveDashboardPage } from '../../pages/LiveDashboardPage';
import WhatsAppSimulatorPage from '../../pages/WhatsAppSimulatorPage';
import GroupsPage from '../../pages/GroupsPage';
import ComplaintsPage from '../../pages/ComplaintsPage';
import AnalyticsPage from '../../pages/AnalyticsPage';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useBridgeStatus } from '../../hooks/useBridgeStatus';
import { describeBridgeStatus } from '../../lib/bridgeStatusDisplay';

export function AppShell() {
  const { data: bridgeStatus } = useBridgeStatus();
  const bridgeDisplay = describeBridgeStatus(bridgeStatus);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1 min-h-screen">
          <Topbar />
          <main className="p-6 md:p-8">
            {bridgeDisplay.isProblem && (
              <div className="mb-6 flex items-start gap-3 rounded-[24px] border border-rose-500/40 bg-rose-500/10 p-4 text-rose-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
                <div>
                  <p className="font-semibold">{bridgeDisplay.label}</p>
                  <p className="mt-1 text-sm text-rose-200/90">{bridgeDisplay.detail}</p>
                </div>
              </div>
            )}
            <Routes>
              <Route path="/" element={<LiveDashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/simulator" element={<WhatsAppSimulatorPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
