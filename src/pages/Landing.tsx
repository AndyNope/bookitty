import { useState } from 'react';
import { Link } from 'react-router-dom';

const faqs = [
  {
    q: 'Benötige ich Buchhaltungskenntnisse?',
    a: 'Nein. Bookitty erkennt deine Rechnungen automatisch und schlägt Konten vor. Kitty, unser KI-Assistent, erklärt dir jeden Schritt und beantwortet Fragen zu Buchhaltung und MwSt.',
  },
  {
    q: 'Ist Bookitty für Schweizer KMU geeignet?',
    a: 'Ja, Bookitty wurde speziell für den Schweizer Kontenrahmen KMU entwickelt. MwSt-Sätze (8.1 %, 3.8 %, 2.6 %), QR-Rechnungen und Schweizer Bilanz-Anforderungen sind integriert.',
  },
  {
    q: 'Was kostet Bookitty?',
    a: 'Bookitty ist aktuell kostenlos nutzbar. Keine Kreditkarte, kein Risiko. Premium-Funktionen (Lohnbuchhaltung, automatische Mahnungen, Steuerexport) folgen schrittweise.',
  },
  {
    q: 'Wie funktioniert der Demo-Modus?',
    a: 'Klicke auf "Demo ausprobieren" – du kannst alle Funktionen sofort testen, ohne dich zu registrieren. Die Daten werden nur lokal gespeichert und nicht übermittelt.',
  },
  {
    q: 'Wie sicher sind meine Daten?',
    a: 'Jedes Unternehmen hat einen isolierten Workspace. Daten werden verschlüsselt übertragen und in der Schweiz gehostet. Ohne Konto verlassen keine Daten deinen Browser.',
  },
  {
    q: 'Was kann Kitty, der KI-Assistent?',
    a: 'Kitty beantwortet Fragen zu Buchungen, Kontenrahmen, MwSt und Bookitty-Funktionen – auch offline. Bei komplexeren Fragen greift Kitty auf ein Netzwerk von KI-Modellen zurück.',
  },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-slate-800 hover:text-slate-900 transition gap-4"
      >
        <span>{q}</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="pb-4 text-sm text-slate-500 leading-relaxed">{a}</p>
      )}
    </div>
  );
};

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

    {/* ── Kitty Showcase ── */}
    <section className="bg-gradient-to-b from-white to-slate-50 border-t border-slate-100 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div>
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 mb-4 uppercase tracking-wide">
              KI-Assistent
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mb-4 leading-snug">
              Kitty beantwortet deine Fragen – sofort und auf Schweizerdeutsch
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Ob Buchungsvorschlag, MwSt-Satz oder Navigation: Kitty kennt Bookitty in- und auswendig und führt dich direkt zur richtigen Stelle.
            </p>
            <ul className="space-y-3 text-sm text-slate-700 mb-8">
              {[
                'Buchungsvorschläge mit einem Klick erfassen',
                'Menüpunkte direkt hervorheben',
                'Schweizer Buchhaltungsfragen beantworten',
                'Funktioniert offline – ohne Wartezeit',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              Kitty im Demo testen
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Right: chat mockup */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-4 space-y-3 max-w-sm mx-auto w-full">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-white" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M6 4 L2 12 L6 11 Q8 18 16 18 Q24 18 26 11 L30 12 L26 4 L22 8 Q19 6 16 6 Q13 6 10 8 Z" />
                  <circle cx="11" cy="13" r="1.5" fill="#0f172a" />
                  <circle cx="21" cy="13" r="1.5" fill="#0f172a" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900">Kitty</span>
              <span className="ml-auto text-[10px] font-medium text-emerald-600">Online</span>
            </div>
            {[
              { role: 'user', text: 'Wie buche ich Büromaterial?' },
              { role: 'kitty', text: 'Büromaterial kommt auf 6500 Verwaltungsaufwand. Ich erstelle dir direkt einen Buchungsvorschlag.' },
            ].map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs">
              <p className="font-semibold text-emerald-800 mb-1.5">Buchungsvorschlag</p>
              <div className="text-slate-600 space-y-0.5">
                <div className="flex justify-between"><span>Soll</span><span className="font-medium">6500 Verwaltungsaufwand</span></div>
                <div className="flex justify-between"><span>Haben</span><span className="font-medium">1020 Bankguthaben</span></div>
              </div>
              <button className="mt-2 w-full rounded-lg bg-emerald-600 py-1.5 text-[11px] font-semibold text-white">
                Jetzt erfassen →
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>

    {/* ── FAQ ── */}
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">Häufige Fragen</h2>
        <p className="text-center text-slate-500 text-sm mb-12">Noch Fragen? Kitty hilft dir auch direkt in der App.</p>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6">
          {faqs.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
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
