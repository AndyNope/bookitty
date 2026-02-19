import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/buchungen', label: 'Buchungen' },
  { to: '/bilanz', label: 'Bilanz' },
  { to: '/dokumente', label: 'Dokumenten-Import' },
];

const AppLayout = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
      <aside className="hidden w-60 flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex">
        <div>
          <p className="text-sm font-medium text-slate-500">Bookitty</p>
          <h1 className="text-xl font-semibold text-slate-900">
            Finanzbuchhaltung
          </h1>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl bg-slate-900 p-4 text-xs text-white">
          <p className="font-semibold">Automatisierter Beleg-Import</p>
          <p className="mt-1 text-slate-200">
            PDF- und Bildbelege erkennen, prüfen und direkt buchen.
          </p>
        </div>
      </aside>

      <main className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Willkommen zurück</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Bookitty Workspace
            </h2>
          </div>
          <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Status: Synchronisiert
          </div>
        </div>
        <div className="mt-6">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);

export default AppLayout;
