import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isStartupNightActive } from '../utils/eventWindow';

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
    q: 'Kann ich eigene Konten definieren?',
    a: 'Ja. Unter **Einstellungen → Eigene Kontenbezeichnungen** kannst du Konten umbenennen oder neue Konten anlegen. Die Namen erscheinen danach in Buchungen und Auswertungen.',
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

const founders = [
  {
    name: 'Janick Gmür',
    role: 'Founder',
    image: '/team/janick.jpg',
    description: 'Treibt die Produktvision voran: Buchhaltung für Schweizer KMU verständlicher und zugänglicher machen.',
    href: 'https://bookitty-pitch.bidebliss.com/',
  },
  {
    name: 'Andy Bui',
    role: 'CTO & Co-Founder',
    image: '/team/andy.png',
    description: 'Verantwortet die technische Umsetzung. Full-Stack-Erfahrung in Frontend, Backend und Projektleitung.',
    href: 'https://andynope.com/',
  },
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

const partners = [
  {
    name: 'Startup Night',
    href: 'https://startupnight.ch',
    wordmark: <span className="text-[19px] font-black leading-none tracking-tight text-slate-950">startup<span className="ml-1 text-rose-700">night</span></span>,
  },
  {
    name: 'Stripe',
    href: 'https://stripe.com/ch',
    wordmark: <span className="text-[27px] font-black leading-none tracking-tight text-[#635bff]">stripe</span>,
  },
  {
    name: 'BideBliss',
    href: 'https://bidebliss.com',
    wordmark: <span className="text-[21px] font-bold leading-none tracking-tight text-slate-950">Bide<span className="font-normal">Bliss</span></span>,
  },
];

const Landing = () => {
  const showStartupNight = isStartupNightActive();

  return (
  <div className="min-h-screen bg-[#f6f7f5] text-slate-950">

    {/* ── Navigation ── */}
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.svg" alt="Bookitty" className="h-8 w-8 shrink-0" />
          <span className="text-base font-bold tracking-tight sm:text-lg truncate">Bookitty</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {showStartupNight && (
            <Link
              to="/startup-night"
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 transition"
            >
              Startup Night Challenge
            </Link>
          )}
          <Link
            to="/login"
            className="hidden sm:block rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition"
          >
            Anmelden
          </Link>
          <Link
            to="/demo"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition sm:px-4 sm:py-2 sm:text-sm"
          >
            Demo
          </Link>
          <a href="#ueber-uns" className="hidden lg:block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition">
            Über uns
          </a>
          <Link
            to="/register"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition sm:px-4 sm:py-2 sm:text-sm"
          >
            <span className="hidden xs:inline">Kostenlos </span>starten
          </Link>
        </div>
      </div>
    </header>

    {/* ── Hero ── */}
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.92fr] lg:gap-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 border-l-2 border-emerald-600 pl-3 text-xs font-semibold uppercase text-emerald-800">
            Schweizer Buchhaltung. Endlich verständlich.
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.05] text-slate-950 sm:text-5xl lg:text-6xl">
            Dein KMU. Deine Zahlen. <span className="text-emerald-700">Im Griff.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Belege erfassen, Buchungen prüfen und den Überblick behalten – mit Schweizer Kontenrahmen und Kitty an deiner Seite.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800">
              Kostenlos starten <span aria-hidden="true" className="ml-2">→</span>
            </Link>
            <Link to="/demo" className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Demo ansehen
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-5 text-xs text-slate-500">
            <span>Schweizer KMU-Kontenrahmen</span>
            <span>Keine Kreditkarte nötig</span>
            <span>Offline-Demo verfügbar</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]" aria-label="Bookitty Dashboard Vorschau">
          <div className="overflow-hidden border border-slate-200 bg-[#f9faf8] shadow-[0_24px_70px_-35px_rgba(15,23,42,0.4)]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="" className="h-6 w-6" />
                <span className="text-sm font-bold text-slate-900">Bookitty</span>
              </div>
              <span className="text-[10px] font-medium text-slate-500">Übersicht · Oktober</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-200">
              <div className="bg-white p-4 sm:p-5">
                <p className="text-[10px] uppercase text-slate-500">Einnahmen</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">CHF 18’420</p>
                <p className="mt-1 text-[10px] text-emerald-700">+8.4 % zum Vormonat</p>
              </div>
              <div className="bg-white p-4 sm:p-5">
                <p className="text-[10px] uppercase text-slate-500">Ausgaben</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">CHF 7’860</p>
                <p className="mt-1 text-[10px] text-slate-500">12 Belege erfasst</p>
              </div>
            </div>
            <div className="bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-[10px] uppercase text-slate-500">Ergebnis</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">CHF 10’560</p>
                </div>
                <div className="flex h-12 items-end gap-1" aria-hidden="true">
                  {[22, 32, 27, 44, 37, 58, 49, 72, 63, 86].map((height, index) => (
                    <span key={index} className="w-2 bg-emerald-600/80" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-600">Lieferantenrechnung · Bürobedarf</span><span className="font-medium text-slate-900">CHF 108.10</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-600">Kundenrechnung · Beratung</span><span className="font-medium text-slate-900">CHF 2’400.00</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-200 bg-[#f4f7f3] px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">K</span>
              <p className="text-xs text-slate-700"><strong>Kitty:</strong> Beleg erkannt und Kontierung vorbereitet.</p>
              <span className="ml-auto text-[10px] font-semibold text-emerald-800">Bereit zur Prüfung</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Partner marquee ── */}
    <section className="border-b border-slate-200 bg-[#f6f7f5]" aria-label="Partner">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-[10px] font-semibold uppercase text-slate-500">Partner & Wegbegleiter</p>
          {showStartupNight && (
            <Link to="/startup-night" className="shrink-0 text-xs font-semibold text-rose-800 hover:text-rose-950">
              Challenge spielen <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        <div className="partner-marquee" aria-label="Partner-Websites">
          <div className="partner-marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-14 pr-14 sm:gap-20 sm:pr-20" role="list" aria-hidden={copy === 1}>
                {partners.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${item.name} Website öffnen`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="flex h-10 shrink-0 items-center justify-center opacity-70 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0 focus-visible:opacity-100 focus-visible:grayscale-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                  >
                    {item.wordmark}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
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

    {/* ── About us ── */}
    <section id="ueber-uns" className="border-y border-slate-200 bg-[#f6f7f5] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase text-emerald-800">Über uns</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Zwei Gründer. Eine klare Idee.</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">Bookitty entsteht aus dem Anspruch, Schweizer KMU von unnötig komplizierter Buchhaltung zu entlasten.</p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-2">
          {founders.map((founder) => (
            <article key={founder.name} className="grid grid-cols-[96px_1fr] items-center gap-5 border border-slate-200 bg-white p-4 sm:grid-cols-[128px_1fr] sm:gap-6 sm:p-5">
              <img src={founder.image} alt={founder.name} className="aspect-square w-24 object-cover sm:w-32" loading="lazy" />
              <div>
                <p className="text-[10px] font-semibold uppercase text-emerald-800">{founder.role}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">{founder.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{founder.description}</p>
                <a href={founder.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-emerald-800">
                  Mehr über {founder.name.split(' ')[0]}
                </a>
              </div>
            </article>
          ))}
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
          <a href="#ueber-uns" className="hover:text-slate-600 transition">Über uns</a>
          <Link to="/demo"     className="hover:text-slate-600 transition">Demo</Link>
          <Link to="/register" className="hover:text-slate-600 transition">Registrieren</Link>
          <Link to="/login"    className="hover:text-slate-600 transition">Anmelden</Link>
        </div>
      </div>
    </footer>

  </div>
  );
};

export default Landing;
