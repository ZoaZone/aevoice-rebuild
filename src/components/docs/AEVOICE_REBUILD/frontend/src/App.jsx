import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AppPage from '@/pages/App';
import DashboardPage from '@/pages/Dashboard';
import SettingsPage from '@/pages/Settings';

export default function App() {
  const { isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading AEVOICE...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<AppPage />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}