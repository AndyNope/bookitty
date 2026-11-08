import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const ContactSupport = ({ mode }: { mode: 'contact' | 'support' }) => {
  const [kind, setKind] = useState<'support' | 'idea'>(mode === 'support' ? 'support' : 'idea');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const isSupport = kind === 'support';
  const recipient = isSupport ? 'support@bookitty.ch' : 'contact@bookitty.ch';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      await api.contact.submit({ kind, name, email, message, website });
      setSent(true);
      setMessage('');
    } catch (submitError) {
      setError((submitError as Error).message || 'Nachricht konnte nicht gesendet werden.');
    } finally {
      setSending(false);
    }
  };

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
        <p className="text-xs font-semibold uppercase text-emerald-800">{isSupport ? 'Hilfe' : 'Feedback'}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{isSupport ? 'Bookitty Support' : 'Kontakt & Ideen'}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
          {isSupport
            ? 'Fragen zu deinem Konto, Rechnungen, Belegen oder KI-Guthaben? Schreib unserem Support oder sende uns einen Verbesserungsvorschlag.'
            : 'Fragen, Ideen und Verbesserungsvorschläge kannst du uns direkt über dieses Formular senden.'}
        </p>

        <form onSubmit={submit} className="mt-8 max-w-2xl space-y-5 border-y border-slate-300 py-6">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase text-slate-500">Worum geht es?</legend>
            <div role="radiogroup" aria-label="Nachrichtentyp" className="grid grid-cols-2 gap-2">
              {([
                ['support', 'Support'],
                ['idea', 'Idee / Verbesserung'],
              ] as const).map(([value, label]) => (
                <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${kind === value ? 'border-emerald-700 bg-emerald-50 text-emerald-950' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => { setKind(value); setSent(false); }} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {sent ? (
            <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <p className="font-semibold">Danke, deine Nachricht wurde übermittelt.</p>
              <p className="mt-1">Sie ging an {recipient}. Eine Antwort kommt an {email}.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-3 text-sm font-semibold underline underline-offset-2">Weitere Nachricht senden</button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input required maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  E-Mail
                  <input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Nachricht
                <textarea required maxLength={1500} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
                <span className="mt-1 block text-right text-xs font-normal text-slate-500">{message.length}/1500</span>
              </label>
              <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                Webseite
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </label>
              <p className="text-xs leading-relaxed text-slate-500">
                Versand an <a href={`mailto:${recipient}`} className="font-medium text-emerald-800 underline underline-offset-2">{recipient}</a>. Bitte keine Passwörter, vollständigen Zahlungsdaten oder vertraulichen Belege mitsenden.
              </p>
              {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
              <button type="submit" disabled={sending} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-50">
                {sending ? 'Wird gesendet…' : 'Nachricht senden'}
              </button>
            </>
          )}
        </form>

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
