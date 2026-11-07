import { Link } from 'react-router-dom';

const ContactSupport = ({ mode }: { mode: 'contact' | 'support' }) => {
  const isSupport = mode === 'support';
  const email = isSupport ? 'support@bookitty.ch' : 'contact@bookitty.ch';
  const subject = isSupport ? 'Bookitty Support' : 'Kontakt zu Bookitty';

  return (
    <main className="min-h-screen bg-[#f6f7f5] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <img src="/logo.svg" alt="" className="h-8 w-8" /> Bookitty
          </Link>
          <Link to="/demo" className="text-xs font-semibold text-slate-600 hover:text-slate-950">Demo ansehen →</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase text-emerald-800">{isSupport ? 'Hilfe' : 'Wir sind erreichbar'}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{isSupport ? 'Bookitty Support' : 'Kontakt'}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
          {isSupport
            ? 'Fragen zu deinem Konto, Rechnungen, Belegen oder KI-Guthaben? Schreib unserem Support. Bitte sende niemals Passwörter, API-Schlüssel oder vollständige Zahlungsdaten per E-Mail.'
            : 'Fragen zu Bookitty, Partnerschaften oder Zusammenarbeit? Wir freuen uns auf deine Nachricht.'}
        </p>

        <section className="mt-8 max-w-2xl border-y border-slate-300 py-6" aria-label={isSupport ? 'Support-E-Mail' : 'Kontakt-E-Mail'}>
          <p className="text-xs font-semibold uppercase text-slate-500">{isSupport ? 'Technische Hilfe' : 'Allgemeine Anfragen'}</p>
          <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} className="mt-2 inline-flex break-all text-lg font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950 sm:text-xl">
            {email}
          </a>
          <p className="mt-2 text-xs text-slate-500">Wir antworten so bald wie möglich während der Geschäftszeiten.</p>
        </section>

        {isSupport && (
          <section className="mt-10 max-w-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Damit wir schneller helfen können</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Beschreibe kurz, auf welcher Seite das Problem auftritt.</li>
              <li>Nenne den ungefähren Zeitpunkt und die Schritte bis zum Fehler.</li>
              <li>Schwärze Kundennamen, Kontonummern und Beträge in Screenshots.</li>
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-5 text-xs">
          <Link to="/kontakt" className="font-semibold text-slate-600 hover:text-slate-950">Kontakt</Link>
          <Link to="/support" className="font-semibold text-slate-600 hover:text-slate-950">Support</Link>
          <Link to="/" className="font-semibold text-slate-600 hover:text-slate-950">Startseite</Link>
        </div>
      </div>
    </main>
  );
};

export default ContactSupport;
