import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import RepoSetup from '@/pages/RepoSetup';
import Branches from '@/pages/Branches';
import SettingsPage from '@/pages/SettingsPage';
import { useAppStore } from '@/stores/app-store';

export default function App() {
  const checkBackend = useAppStore((s) => s.checkBackend);
  const fetchSettings = useAppStore((s) => s.fetchSettings);

  useEffect(() => {
    checkBackend();
    fetchSettings();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, [checkBackend, fetchSettings]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="repo-setup" element={<RepoSetup />} />
          <Route path="branches" element={<Branches />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
