import { Outlet, Route, Routes, Navigate } from 'react-router-dom';
import { LiveDashboardPage } from '../../pages/LiveDashboardPage';
import WhatsAppSimulatorPage from '../../pages/WhatsAppSimulatorPage';
import GroupsPage from '../../pages/GroupsPage';
import ComplaintsPage from '../../pages/ComplaintsPage';
import AnalyticsPage from '../../pages/AnalyticsPage';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1 min-h-screen">
          <Topbar />
          <main className="p-6 md:p-8">
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
