import { useState } from 'react';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { BookingDraft } from '../types';

/* ── Types ────────────────────────────────────────────────────────── */
type AbschreibungMethod = 'linear' | 'degressiv';

interface Rueckstellung {
  id: string;
  type: string;
  description: string;
  amount: string;
  debit: string;
  credit: string;
}

interface Abschreibung {
  id: string;
  asset: string;
  bookValue: string;
  method: AbschreibungMethod;
  years: string;
  rate: string;
  assetAccount: string;
}

interface Transitorisch {
  id: string;
  type: 'aktiv' | 'passiv';
  description: string;
  amount: string;
  expenseAccount: string;
}

interface Gewinnverwendung {
  type: 'vortrag' | 'reserve' | 'dividende';
  amount: string;
}

/* ── Pre-set Rückstellung templates ──────────────────────────────── */
const RUECKSTELLUNG_TEMPLATES = [
  { label: 'Delkredere (Forderungsverluste)', debit: '6940 Forderungsverluste', credit: '1109 Delkredere' },
  { label: 'Steuerrückstellung', debit: '8900 Direkte Steuern', credit: '2080 Steuerrückstellung' },
  { label: 'Garantierückstellung', debit: '4280 Garantieaufwand', credit: '2062 Garantierückstellungen' },
  { label: 'Ferienrückstellung', debit: '5000 Lohnaufwand', credit: '2050 Ferienansprüche' },
  { label: 'Prozessrückstellung', debit: '6900 Sonstiger Aufwand', credit: '2060 Sonstige Rückstellungen' },
];

/* ── Helpers ─────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const currentYear = () => new Date().getFullYear();
const fmt = (n: number) =>
  n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 });

const STEPS = ['Rückstellungen', 'Abschreibungen', 'Transitorische Posten', 'Gewinnverwendung', 'Zusammenfassung'];

/* ── Component ───────────────────────────────────────────────────── */
export default function JahresabschlussAssistent() {
  const { addBooking } = useBookkeeping();
  const [step, setStep] = useState(0);
  const [committed, setCommitted] = useState(false);

  /* Step 1 */
  const [rueckstellungen, setRueckstellungen] = useState<Rueckstellung[]>([]);
  const [rTemplate, setRTemplate] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rAmount, setRAmount] = useState('');
  const [rDebit, setRDebit] = useState('');
  const [rCredit, setRCredit] = useState('');

  /* Step 2 */
  const [abschreibungen, setAbschreibungen] = useState<Abschreibung[]>([]);
  const [aAsset, setAAsset] = useState('');
  const [aBookValue, setABookValue] = useState('');
  const [aMethod, setAMethod] = useState<AbschreibungMethod>('linear');
  const [aYears, setAYears] = useState('5');
  const [aRate, setARate] = useState('20');
  const [aAccount, setAAccount] = useState('1510 Maschinen/Geräte');

  /* Step 3 */
  const [transitorische, setTransitorische] = useState<Transitorisch[]>([]);
  const [tType, setTType] = useState<'aktiv' | 'passiv'>('aktiv');
  const [tDesc, setTDesc] = useState('');
  const [tAmount, setTAmount] = useState('');
  const [tExpense, setTExpense] = useState('6000 Raumaufwand');

  /* Step 4 */
  const [gewinn, setGewinn] = useState<Gewinnverwendung>({ type: 'vortrag', amount: '' });

  /* ── Booking generators ─────────────────────────────────────────── */
  const buildBookings = (): BookingDraft[] => {
    const year = currentYear();
    const bookings: BookingDraft[] = [];

    rueckstellungen.forEach((r) => {
      const amt = parseFloat(r.amount) || 0;
      if (amt > 0) {
        bookings.push({
          date: today(),
          description: `Rückstellung ${year}: ${r.description}`,
          account: r.debit,
          contraAccount: r.credit,
          category: 'Abschluss',
          amount: amt,
          vatRate: 0,
          currency: 'CHF',
          paymentStatus: 'Bezahlt',
          type: 'Ausgabe',
        });
      }
    });

    abschreibungen.forEach((a) => {
      const bv = parseFloat(a.bookValue) || 0;
      let amt = 0;
      if (a.method === 'linear') {
        amt = bv / (parseInt(a.years) || 1);
      } else {
        amt = bv * ((parseFloat(a.rate) || 20) / 100);
      }
      if (amt > 0) {
        bookings.push({
          date: today(),
          description: `Abschreibung ${year}: ${a.asset} (${a.method})`,
          account: '6800 Abschreibungen',
          contraAccount: a.assetAccount,
          category: 'Abschluss',
          amount: Math.round(amt * 100) / 100,
          vatRate: 0,
          currency: 'CHF',
          paymentStatus: 'Bezahlt',
          type: 'Ausgabe',
        });
      }
    });

    transitorische.forEach((t) => {
      const amt = parseFloat(t.amount) || 0;
      if (amt > 0) {
        if (t.type === 'aktiv') {
          /* Prepaid expense: debit 1300, credit expense account */
          bookings.push({
            date: today(),
            description: `Aktive Transitorische ${year}: ${t.description}`,
            account: '1300 Aktive transitorische Posten',
            contraAccount: t.expenseAccount,
            category: 'Abschluss',
            amount: amt,
            vatRate: 0,
            currency: 'CHF',
            paymentStatus: 'Bezahlt',
            type: 'Ausgabe',
          });
        } else {
          /* Accrued liability: debit expense, credit 2300 */
          bookings.push({
            date: today(),
            description: `Passive Transitorische ${year}: ${t.description}`,
            account: t.expenseAccount,
            contraAccount: '2300 Passive transitorische Posten',
            category: 'Abschluss',
            amount: amt,
            vatRate: 0,
            currency: 'CHF',
            paymentStatus: 'Bezahlt',
            type: 'Ausgabe',
          });
        }
      }
    });

    const gAmt = parseFloat(gewinn.amount) || 0;
    if (gAmt > 0) {
      const creditMap = {
        vortrag: '2900 Gewinnvortrag',
        reserve: '2970 Gesetzliche Kapitalreserven',
        dividende: '2960 Dividendenverbindlichkeiten',
      };
      bookings.push({
        date: today(),
        description: `Gewinnverwendung ${year}: ${gewinn.type === 'vortrag' ? 'Gewinnvortrag' : gewinn.type === 'reserve' ? 'Zuweisung Gesetzliche Reserve' : 'Dividendenausschüttung'}`,
        account: '2979 Jahresergebnis',
        contraAccount: creditMap[gewinn.type],
        category: 'Abschluss',
        amount: gAmt,
        vatRate: 0,
        currency: 'CHF',
        paymentStatus: 'Bezahlt',
        type: 'Ausgabe',
      });
    }

    return bookings;
  };

  const handleCommit = () => {
    const bookings = buildBookings();
    bookings.forEach((b) => addBooking(b));
    setCommitted(true);
  };

  /* ── Template picker for Rückstellungen ─────────────────────────── */
  const applyRTemplate = (label: string) => {
    const t = RUECKSTELLUNG_TEMPLATES.find((x) => x.label === label);
    if (t) {
      setRDesc(t.label);
      setRDebit(t.debit);
      setRCredit(t.credit);
    }
    setRTemplate(label);
  };

  const addRueckstellung = () => {
    const amt = parseFloat(rAmount);
    if (!rDesc || !amt || !rDebit || !rCredit) return;
    setRueckstellungen([...rueckstellungen, { id: uid(), type: rTemplate, description: rDesc, amount: rAmount, debit: rDebit, credit: rCredit }]);
    setRDesc(''); setRAmount(''); setRTemplate('');
  };

  const addAbschreibung = () => {
    if (!aAsset || !aBookValue) return;
    setAbschreibungen([...abschreibungen, { id: uid(), asset: aAsset, bookValue: aBookValue, method: aMethod, years: aYears, rate: aRate, assetAccount: aAccount }]);
    setAAsset(''); setABookValue('');
  };

  const addTransitorisch = () => {
    const amt = parseFloat(tAmount);
    if (!tDesc || !amt) return;
    setTransitorische([...transitorische, { id: uid(), type: tType, description: tDesc, amount: tAmount, expenseAccount: tExpense }]);
    setTDesc(''); setTAmount('');
  };

  const previewBookings = buildBookings();
  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300';
  const btnSm = 'rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Jahresabschluss-Assistent</h1>
        <p className="mt-1 text-sm text-slate-500">
          Geführter Assistent für Abschlussbuchungen {currentYear()} — Rückstellungen, Abschreibungen, Transitorische Posten, Gewinnverwendung.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <button
              onClick={() => !committed && setStep(i)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-slate-900 text-white'
                  : i < step
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                i === step ? 'bg-white text-slate-900' : i < step ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
              }`}>
                {i < step ? (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                ) : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-slate-200" />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* ── Step 1: Rückstellungen ─────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Schritt 1 – Rückstellungen</h2>
            <p className="text-sm text-slate-500">Bilden Sie Rückstellungen für absehbare Verpflichtungen (Steuern, Garantien, Forderungsverluste…).</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Vorlage</label>
                <select value={rTemplate} onChange={(e) => applyRTemplate(e.target.value)} className={inputCls}>
                  <option value="">— Vorlage wählen —</option>
                  {RUECKSTELLUNG_TEMPLATES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
                  <option value="custom">Eigene Rückstellung</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Betrag (CHF)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={rAmount} onChange={(e) => setRAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Beschreibung</label>
                <input type="text" placeholder="z. B. Steuerrückstellung 2025" value={rDesc} onChange={(e) => setRDesc(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Sollkonto (Aufwand)</label>
                <input type="text" placeholder="z. B. 8900 Direkte Steuern" value={rDebit} onChange={(e) => setRDebit(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Habenkonto (Rückstellung)</label>
                <input type="text" placeholder="z. B. 2080 Steuerrückstellung" value={rCredit} onChange={(e) => setRCredit(e.target.value)} className={inputCls} />
              </div>
            </div>

            <button onClick={addRueckstellung} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              + Rückstellung hinzufügen
            </button>

            {rueckstellungen.length > 0 && (
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Beschreibung</th>
                      <th className="px-4 py-2 text-left">Soll</th>
                      <th className="px-4 py-2 text-left">Haben</th>
                      <th className="px-4 py-2 text-right">Betrag</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rueckstellungen.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 text-slate-700">{r.description}</td>
                        <td className="px-4 py-2 text-slate-500">{r.debit}</td>
                        <td className="px-4 py-2 text-slate-500">{r.credit}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">{fmt(parseFloat(r.amount))}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setRueckstellungen(rueckstellungen.filter((x) => x.id !== r.id))} className="rounded p-0.5 text-rose-400 hover:text-rose-600" aria-label="Entfernen"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Abschreibungen ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Schritt 2 – Abschreibungen</h2>
            <p className="text-sm text-slate-500">Erfassen Sie Sachanlagen und wählen Sie die Abschreibungsmethode (linear oder degressiv).</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Anlage / Bezeichnung</label>
                <input type="text" placeholder="z. B. Firmenfahrzeug, Laptop" value={aAsset} onChange={(e) => setAAsset(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Buchwert (CHF)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={aBookValue} onChange={(e) => setABookValue(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Methode</label>
                <select value={aMethod} onChange={(e) => setAMethod(e.target.value as AbschreibungMethod)} className={inputCls}>
                  <option value="linear">Linear (Buchwert ÷ Nutzungsjahre)</option>
                  <option value="degressiv">Degressiv (Buchwert × Satz %)</option>
                </select>
              </div>
              {aMethod === 'linear' ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Nutzungsdauer (Jahre)</label>
                  <input type="number" min="1" step="1" value={aYears} onChange={(e) => setAYears(e.target.value)} className={inputCls} />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Abschreibungssatz (%)</label>
                  <input type="number" min="1" max="100" step="1" value={aRate} onChange={(e) => setARate(e.target.value)} className={inputCls} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Anlagekonto (Habenkonto)</label>
                <select value={aAccount} onChange={(e) => setAAccount(e.target.value)} className={inputCls}>
                  <option>1510 Maschinen/Geräte</option>
                  <option>1520 Fahrzeuge</option>
                  <option>1530 Büroeinrichtung</option>
                  <option>1540 EDV/IT</option>
                  <option>1500 Sachanlagen (generisch)</option>
                  <option>1400 Immobilien/Liegenschaften</option>
                </select>
              </div>
            </div>

            {aAsset && aBookValue && (
              <div className="rounded-lg bg-blue-50 px-4 py-2 text-xs text-blue-700">
                Jährliche Abschreibung:{' '}
                <strong>
                  {fmt(
                    aMethod === 'linear'
                      ? (parseFloat(aBookValue) || 0) / (parseInt(aYears) || 1)
                      : (parseFloat(aBookValue) || 0) * ((parseFloat(aRate) || 20) / 100)
                  )}
                </strong>
              </div>
            )}

            <button onClick={addAbschreibung} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              + Abschreibung hinzufügen
            </button>

            {abschreibungen.length > 0 && (
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Anlage</th>
                      <th className="px-4 py-2 text-left">Methode</th>
                      <th className="px-4 py-2 text-left">Konto</th>
                      <th className="px-4 py-2 text-right">Abschreibung</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {abschreibungen.map((a) => {
                      const bv = parseFloat(a.bookValue) || 0;
                      const amt = a.method === 'linear' ? bv / (parseInt(a.years) || 1) : bv * ((parseFloat(a.rate) || 20) / 100);
                      return (
                        <tr key={a.id}>
                          <td className="px-4 py-2 text-slate-700">{a.asset}</td>
                          <td className="px-4 py-2 text-slate-500">{a.method === 'linear' ? `Linear ${a.years}J` : `Degressiv ${a.rate}%`}</td>
                          <td className="px-4 py-2 text-slate-500">{a.assetAccount}</td>
                          <td className="px-4 py-2 text-right font-medium tabular-nums">{fmt(Math.round(amt * 100) / 100)}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => setAbschreibungen(abschreibungen.filter((x) => x.id !== a.id))} className="rounded p-0.5 text-rose-400 hover:text-rose-600" aria-label="Entfernen"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Transitorische Posten ─────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Schritt 3 – Transitorische Posten</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs">
                <strong className="text-blue-800">Aktive Transitorische (1300)</strong><br />
                Vorausbezahlte Aufwände für die nächste Periode (z. B. Vorauszahlung Versicherung Jan–Mar).
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs">
                <strong className="text-amber-800">Passive Transitorische (2300)</strong><br />
                Noch nicht verbuchte Aufwände der laufenden Periode (z. B. Dezember-Miete noch nicht bezahlt).
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Art</label>
                <select value={tType} onChange={(e) => setTType(e.target.value as 'aktiv' | 'passiv')} className={inputCls}>
                  <option value="aktiv">Aktiv (Vorauszahlungen)</option>
                  <option value="passiv">Passiv (Rechnungsabgrenzung)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Betrag (CHF)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={tAmount} onChange={(e) => setTAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Beschreibung</label>
                <input type="text" placeholder="z. B. Vorauszahlung Versicherung Q1 2026" value={tDesc} onChange={(e) => setTDesc(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Aufwandkonto</label>
                <select value={tExpense} onChange={(e) => setTExpense(e.target.value)} className={inputCls}>
                  <option>6000 Raumaufwand</option>
                  <option>6300 Versicherungen</option>
                  <option>6700 Werbeaufwand</option>
                  <option>6800 Abschreibungen</option>
                  <option>6900 Finanzaufwand</option>
                  <option>4000 Warenaufwand</option>
                  <option>5000 Lohnaufwand</option>
                </select>
              </div>
            </div>

            <button onClick={addTransitorisch} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              + Transitorischen Posten hinzufügen
            </button>

            {transitorische.length > 0 && (
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Art</th>
                      <th className="px-4 py-2 text-left">Beschreibung</th>
                      <th className="px-4 py-2 text-left">Konto</th>
                      <th className="px-4 py-2 text-right">Betrag</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transitorische.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.type === 'aktiv' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {t.type === 'aktiv' ? 'Aktiv' : 'Passiv'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-700">{t.description}</td>
                        <td className="px-4 py-2 text-slate-500">{t.expenseAccount}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">{fmt(parseFloat(t.amount))}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setTransitorische(transitorische.filter((x) => x.id !== t.id))} className="rounded p-0.5 text-rose-400 hover:text-rose-600" aria-label="Entfernen"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Gewinnverwendung ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Schritt 4 – Gewinnverwendung</h2>
            <p className="text-sm text-slate-500">Verwenden Sie den Jahresgewinn (Kto. 2979): Vortrag, Zuweisung zu Reserven oder Dividendenausschüttung.</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Art der Gewinnverwendung</label>
                <select value={gewinn.type} onChange={(e) => setGewinn({ ...gewinn, type: e.target.value as Gewinnverwendung['type'] })} className={inputCls}>
                  <option value="vortrag">Gewinnvortrag (Kto. 2900)</option>
                  <option value="reserve">Zuweisung Gesetzliche Reserve (Kto. 2970)</option>
                  <option value="dividende">Dividendenausschüttung (Kto. 2960)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Betrag (CHF)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={gewinn.amount} onChange={(e) => setGewinn({ ...gewinn, amount: e.target.value })} className={inputCls} />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 space-y-1">
              <p><strong className="text-slate-700">Buchungssatz:</strong></p>
              <p>Soll: <span className="font-mono">2979 Jahresergebnis</span></p>
              <p>Haben: <span className="font-mono">
                {gewinn.type === 'vortrag' ? '2900 Gewinnvortrag' : gewinn.type === 'reserve' ? '2970 Gesetzliche Kapitalreserven' : '2960 Dividendenverbindlichkeiten'}
              </span></p>
              {gewinn.amount && <p>Betrag: <strong>{fmt(parseFloat(gewinn.amount) || 0)}</strong></p>}
            </div>
          </div>
        )}

        {/* ── Step 5: Summary ───────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Zusammenfassung – Abschlussbuchungen {currentYear()}</h2>

            {committed ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-6 text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <p className="font-semibold text-emerald-800">{previewBookings.length} Buchung{previewBookings.length !== 1 ? 'en' : ''} erfolgreich erfasst</p>
                <p className="text-sm text-emerald-600">Alle Abschlussbuchungen sind nun im Buchungsjournal sichtbar.</p>
              </div>
            ) : previewBookings.length === 0 ? (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-6 text-center text-sm text-slate-400">
                Noch keine Buchungen erfasst. Gehen Sie zurück und fügen Sie Einträge hinzu.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Beschreibung</th>
                        <th className="px-4 py-2 text-left">Soll</th>
                        <th className="px-4 py-2 text-left">Haben</th>
                        <th className="px-4 py-2 text-right">Betrag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {previewBookings.map((b, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-slate-700">{b.description}</td>
                          <td className="px-4 py-2 text-slate-500 text-xs">{b.account}</td>
                          <td className="px-4 py-2 text-slate-500 text-xs">{b.contraAccount}</td>
                          <td className="px-4 py-2 text-right font-medium tabular-nums">{fmt(b.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-semibold text-sm">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-slate-700">Total Abschlussbuchungen</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmt(previewBookings.reduce((s, b) => s + b.amount, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
                  Provisorisch — lassen Sie alle Abschlussbuchungen von Ihrem Treuhänder oder Buchhalter prüfen.
                </div>

                <button onClick={handleCommit} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm">
                  Alle {previewBookings.length} Buchungen erfassen
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Navigation buttons ─────────────────────────────────────── */}
        {!committed && (
          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={`${btnSm} disabled:opacity-40`}>
              ← Zurück
            </button>
            {step < STEPS.length - 1 && (
              <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
                Weiter →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
