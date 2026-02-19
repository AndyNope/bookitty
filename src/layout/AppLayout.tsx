import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/buchungen',
    label: 'Buchungen',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: '/bilanz',
    label: 'Bilanz',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/dokumente',
    label: 'Dokumente',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
];

const AppLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
  <div className="min-h-screen bg-slate-50 text-slate-900">

    {/* ── Mobile top bar ── */}
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="Bookitty" className="h-8 w-8" />
        <span className="font-bold text-slate-900">Bookitty</span>
      </div>
      <button
        type="button"
        aria-label="Menü öffnen"
        onClick={() => setMenuOpen((o) => !o)}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        {menuOpen ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
    </header>

    {/* ── Mobile slide-in drawer ── */}
    {menuOpen && (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
        <nav className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 bg-white p-6 shadow-xl lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Bookitty" className="h-10 w-10" />
              <div>
                <p className="font-bold text-slate-900">Bookitty</p>
                <p className="text-xs text-slate-500">Finanzbuchhaltung</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-auto rounded-2xl bg-slate-900 p-4 text-xs text-white">
            <p className="font-semibold">Automatisierter Beleg-Import</p>
            <p className="mt-1 text-slate-200">PDF und Bilder erkennen, prüfen und buchen.</p>
          </div>
        </nav>
      </>
    )}

    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden w-60 flex-shrink-0 flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Bookitty" className="h-12 w-12 flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-slate-900">Bookitty</p>
            <p className="text-xs text-slate-500">Finanzbuchhaltung</p>
          </div>
        </div>
        <nav className="flex flex-col gap-2 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.icon}
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

      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        <div className="hidden items-center justify-between lg:flex">
          <div>
            <p className="text-sm text-slate-500">Willkommen zurück</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Bookitty Workspace
            </h2>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Status: Synchronisiert
          </div>
        </div>
        <div className="lg:mt-6">
          <Outlet />
        </div>
      </main>
    </div>

    {/* ── Mobile bottom tab bar ── */}
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white lg:hidden">
      <div className="flex">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                isActive ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <span className={`rounded-xl p-1.5 ${isActive ? 'bg-slate-900 text-white' : ''}`}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>

  </div>
  );
};

export default AppLayout;
