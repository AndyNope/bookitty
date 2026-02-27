import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import KittyChat from '../components/KittyChat';
import { useKittyHighlight } from '../hooks/useKittyHighlight';
import OnboardingTutorial, { hasTutorialBeenSeen } from '../components/OnboardingTutorial';

const buildNavItems = (base: string) => [
  {
    to: base,
    end: true,
    label: 'Dashboard',
    kittyId: 'dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: `${base}/buchungen`,
    end: false,
    label: 'Buchungen',
    kittyId: 'buchungen',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: `${base}/bilanz`,
    end: false,
    label: 'Bilanz',
    kittyId: 'bilanz',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: `${base}/dokumente`,
    end: false,
    label: 'Dokumente',
    kittyId: 'dokumente',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    to: `${base}/einstellungen`,
    end: false,
    label: 'Einstellungen',
    kittyId: 'einstellungen',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const AppLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasTutorialBeenSeen());
  const [tutorialStep, setTutorialStep] = useState(0);
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const isDemo = location.pathname.startsWith('/demo');
  const base   = isDemo ? '/demo' : '/app';
  const navItems = buildNavItems(base);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Kitty highlight state for nav items
  const hlBuchungen      = useKittyHighlight('nav-buchungen');
  const hlBilanz         = useKittyHighlight('nav-bilanz');
  const hlErfolg         = useKittyHighlight('nav-erfolgsrechnung');
  const hlDokumente      = useKittyHighlight('nav-dokumente');
  const hlDashboard      = useKittyHighlight('nav-dashboard');

  const kittyHighlightMap: Record<string, boolean> = {
    buchungen:       hlBuchungen,
    bilanz:          hlBilanz,
    erfolgsrechnung: hlErfolg,
    dokumente:       hlDokumente,
    dashboard:       hlDashboard,
  };

  const navHighlightClass = (kittyId: string, isActive: boolean) => {
    const hl = kittyHighlightMap[kittyId] ?? false;
    if (hl) return 'flex items-center gap-3 rounded-xl px-3 py-2 transition bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse';
    return `flex items-center gap-3 rounded-xl px-3 py-2 transition ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;
  };

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
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => navHighlightClass(item.kittyId, isActive)}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setTutorialStep(0); setTutorialOpen(true); }}
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
              Tutorial
            </button>
          </div>
          <div className="mt-auto rounded-2xl bg-slate-900 p-4 text-xs text-white">
            {user ? (
              <>
                <p className="font-semibold truncate">{user.name}</p>
                <p className="mt-0.5 text-slate-400 truncate">{user.email}</p>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="mt-3 w-full rounded-lg bg-white/10 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold">Demo-Modus</p>
                <p className="mt-1 text-slate-200">Daten werden nur lokal gespeichert.</p>
                <NavLink
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="mt-3 block rounded-lg bg-white/10 py-1.5 text-center text-xs font-medium text-white hover:bg-white/20 transition"
                >
                  Konto erstellen →
                </NavLink>
              </>
            )}
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
              end={item.end}
              className={({ isActive }) => navHighlightClass(item.kittyId, isActive)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => { setTutorialStep(0); setTutorialOpen(true); }}
            className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
            Tutorial
          </button>
        </nav>
        <div className="rounded-2xl bg-slate-900 p-4 text-xs text-white">
          {user ? (
            <>
              <p className="font-semibold truncate">{user.name}</p>
              <p className="mt-0.5 text-slate-400 truncate">{user.email}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 w-full rounded-lg bg-white/10 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold">Demo-Modus</p>
              <p className="mt-1 text-slate-400">Daten werden nur lokal gespeichert.</p>
              <NavLink
                to="/register"
                className="mt-3 block rounded-lg bg-white/10 py-1.5 text-center text-xs font-medium text-white hover:bg-white/20 transition"
              >
                Konto erstellen →
              </NavLink>
            </>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        <div className="hidden items-center justify-between lg:flex">
          <div>
            <p className="text-sm text-slate-500">
              {user ? `Angemeldet als ${user.email}` : 'Demo-Modus'}
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              {user ? user.name : 'Bookitty Demo'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Abmelden
              </button>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Demo – Anmelden
              </NavLink>
            )}
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
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                kittyHighlightMap[item.kittyId]
                  ? 'text-emerald-600'
                  : isActive ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              <span className={`rounded-xl p-1.5 ${
                kittyHighlightMap[item.kittyId]
                  ? 'bg-emerald-500 text-white animate-pulse ring-2 ring-emerald-300'
                  : isActive ? 'bg-slate-900 text-white' : ''
              }`}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>

    <KittyChat />
    <OnboardingTutorial
      open={tutorialOpen}
      step={tutorialStep}
      onStepChange={setTutorialStep}
      onClose={() => setTutorialOpen(false)}
    />
  </div>
  );
};

export default AppLayout;
