import { Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Buchungen from './pages/Buchungen';
import Bilanz from './pages/Bilanz';
import Dokumente from './pages/Dokumente';
import NotFound from './pages/NotFound';

const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="buchungen" element={<Buchungen />} />
      <Route path="bilanz" element={<Bilanz />} />
      <Route path="dokumente" element={<Dokumente />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;
