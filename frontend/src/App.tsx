import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { DetailPage } from './pages/DetailPage';
import { GalleryPage } from './pages/GalleryPage';
import { LoginPage } from './pages/LoginPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      <div className="mt-5 rounded-lg border border-slate-800 bg-panel p-5 text-slate-300">
        This workspace section will be connected in a future task.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/gallery" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="outputs/:id" element={<DetailPage />} />
          <Route path="trees" element={<PlaceholderPage title="Trees" />} />
          <Route path="projects" element={<PlaceholderPage title="Projects" />} />
          <Route path="prompts" element={<PlaceholderPage title="Prompts" />} />
          <Route path="sessions" element={<PlaceholderPage title="Sessions" />} />
          <Route path="compare" element={<PlaceholderPage title="Compare" />} />
          <Route path="analytics" element={<PlaceholderPage title="Analytics" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
