import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/AuthContext';
import { BookkeepingProvider } from './store/BookkeepingContext';
import AppLayout from './layout/AppLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Buchungen from './pages/Buchungen';
import Bilanz from './pages/Bilanz';
import Dokumente from './pages/Dokumente';
import Einstellungen from './pages/Einstellungen';
import Lohn from './pages/Lohn';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-400 text-sm">Lädt …</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <Routes>
    {/* ── Landing page ─────────────────────────────────────────────────── */}
    <Route path="/" element={<Landing />} />

    {/* ── Auth pages ───────────────────────────────────────────────────── */}
    <Route path="login"    element={<Login />} />
    <Route path="register" element={<Register />} />

    {/* ── Demo mode – localStorage, no login required ──────────────────── */}
    <Route
      path="demo"
      element={
        <BookkeepingProvider isDemo>
          <AppLayout />
        </BookkeepingProvider>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="buchungen"     element={<Buchungen />} />
      <Route path="bilanz"        element={<Bilanz />} />
      <Route path="dokumente"     element={<Dokumente />} />
      <Route path="lohn"          element={<Lohn />} />
      <Route path="einstellungen" element={<Einstellungen />} />
    </Route>

    {/* ── App mode – API, requires authentication ───────────────────────── */}
    <Route
      path="app"
      element={
        <RequireAuth>
          <BookkeepingProvider>
            <AppLayout />
          </BookkeepingProvider>
        </RequireAuth>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="buchungen"     element={<Buchungen />} />
      <Route path="bilanz"        element={<Bilanz />} />
      <Route path="dokumente"     element={<Dokumente />} />
      <Route path="lohn"          element={<Lohn />} />
      <Route path="einstellungen" element={<Einstellungen />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
