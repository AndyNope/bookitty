import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 10.914 3H18a1 1 0 0 1 1 1Z" />
      </svg>
    ),
    title: 'Automatischer Beleg-Import',
    desc: 'PDFs und Bilder automatisch erkennen, verarbeiten und buchen – inklusive QR-Rechnung.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v15a1 1 0 0 0 1 1h15M8 16l4-6 4 3 4-7" />
      </svg>
    ),
    title: 'Doppelte Buchführung',
    desc: 'Schweizer Kontenrahmen KMU, Erfolgsrechnung und Bilanz jederzeit aktuell.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 9.4 7.55 4.24M18 14h-7m3.5-8.5A2.5 2.5 0 1 1 9 8a2.5 2.5 0 0 1 5 0Zm0 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM6 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
      </svg>
    ),
    title: 'Auto-Vorlagen',
    desc: 'Bookitty lernt aus deinen Buchungen und erkennt Lieferanten beim nächsten Mal automatisch wieder.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c7 0 8 1 8 1s1 2 1 7-1 7-9 10C4 18 3 16 3 11s1-7 1-7 1-1 8-1Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 1.5 1.5L15 9" />
      </svg>
    ),
    title: 'Sicher & Multi-Tenant',
    desc: 'Jedes Unternehmen hat seinen eigenen isolierten Workspace – gehostet in der Schweiz.',
  },
];

const steps = [
  { num: '1', title: 'Registrieren', desc: 'Konto erstellen, E-Mail bestätigen – fertig.' },
  { num: '2', title: 'Beleg hochladen', desc: 'PDF oder Foto der Rechnung hochladen.' },
  { num: '3', title: 'Prüfen & Buchen', desc: 'Vorschlag prüfen, anpassen und mit einem Klick buchen.' },
];

const stepIcons = [
  // 1 – Person/register
  <svg key="1" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
  </svg>,
  // 2 – Upload
  <svg key="2" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12" />
  </svg>,
  // 3 – Check/book
  <svg key="3" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>,
];

const Landing = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900">

    {/* ── Navigation ── */}
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Bookitty" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">Bookitty</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:block rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition"
          >
            Anmelden
          </Link>
          <Link
            to="/demo"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Demo
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            Kostenlos starten
          </Link>
        </div>
      </div>
    </header>

    {/* ── Hero ── */}
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 mb-8">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Speziell für Schweizer KMU
      </div>
      <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
        Buchhaltung,<br className="hidden sm:block" /> so einfach wie nie.
      </h1>
      <p className="max-w-2xl mx-auto text-lg text-slate-500 mb-10 leading-relaxed">
        Bookitty erkennt deine Rechnungen automatisch, bucht sie nach Schweizer
        Standard und zeigt dir Bilanz und Erfolgsrechnung sofort – ohne
        Buchhaltungskenntnisse.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/register"
          className="w-full sm:w-auto rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
        >
          Kostenlos registrieren →
        </Link>
        <Link
          to="/demo"
          className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Demo ausprobieren
        </Link>
      </div>
    </section>

    {/* ── Features ── */}
    <section className="bg-white border-y border-slate-200 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">
          Alles was dein KMU braucht
        </h2>
        <p className="text-center text-slate-500 mb-12 text-sm">
          Keine Installation, kein Einrichten – direkt loslegen.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-slate-900 p-2.5 text-white">
                {f.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── How it works ── */}
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">So funktioniert's</h2>
      <div className="grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.num} className="flex gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
              {stepIcons[i]}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* ── CTA ── */}
    <section className="bg-slate-900 py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Bereit loszulegen?</h2>
        <p className="text-slate-400 mb-8">Starte kostenlos – keine Kreditkarte, kein Risiko.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register"
            className="w-full sm:w-auto rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition"
          >
            Konto erstellen
          </Link>
          <Link
            to="/demo"
            className="w-full sm:w-auto text-sm text-slate-400 hover:text-white transition"
          >
            Lieber erst Demo schauen →
          </Link>
        </div>
      </div>
    </section>

    {/* ── Footer ── */}
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-5 w-5 opacity-40" />
          <span>© 2026 Bookitty – Finanzbuchhaltung für Schweizer KMU</span>
        </div>
        <div className="flex gap-5">
          <Link to="/demo"     className="hover:text-slate-600 transition">Demo</Link>
          <Link to="/register" className="hover:text-slate-600 transition">Registrieren</Link>
          <Link to="/login"    className="hover:text-slate-600 transition">Anmelden</Link>
        </div>
      </div>
    </footer>

  </div>
);

export default Landing;
