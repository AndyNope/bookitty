import { Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Buchungen from './pages/Buchungen';
import Bilanz from './pages/Bilanz';
import Dokumente from './pages/Dokumente';
import Einstellungen from './pages/Einstellungen';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

const App = () => (
  <Routes>
    {/* Public auth pages – full-page layout */}
    <Route path="login"    element={<Login />} />
    <Route path="register" element={<Register />} />

    {/* App shell – works in both demo and authenticated mode */}
    <Route element={<AppLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="buchungen"    element={<Buchungen />} />
      <Route path="bilanz"       element={<Bilanz />} />
      <Route path="dokumente"    element={<Dokumente />} />
      <Route path="einstellungen" element={<Einstellungen />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
