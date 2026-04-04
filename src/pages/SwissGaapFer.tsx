import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { Booking } from '../types';

/* ── FER standard definitions ────────────────────────────────────────── */
const FER_STANDARDS = [
  { id: 'FER_3', label: 'FER 3 – Darstellung und Gliederung', desc: 'Mindestgliederung für Jahresrechnung' },
  { id: 'FER_6', label: 'FER 6 – Bewertung', desc: 'Bewertungsgrundsätze für Aktiven und Passiven' },
  { id: 'FER_8', label: 'FER 8 – Latente Steuern', desc: 'Abgrenzung temporärer Steuerdifferenzen' },
  { id: 'FER_12', label: 'FER 12 – Zwischenberichterstattung', desc: 'Halbjahres- und Quartalsberichte' },
  { id: 'FER_16', label: 'FER 16 – Vorsorgeverpflichtungen', desc: 'Pensionskassenverpflichtungen (BVG)' },
  { id: 'FER_18', label: 'FER 18 – Sachanlagen', desc: 'Bewertung und Abschreibung Sachanlagen' },
  { id: 'FER_26', label: 'FER 26 – Leistungsorientierte Vorsorgeeinrichtungen', desc: 'Reporting für Vorsorgepläne' },
  { id: 'FER_27', label: 'FER 27 – Derivative Finanzinstrumente', desc: 'Ausweis von Derivaten und Hedging' },
  { id: 'FER_30', label: 'FER 30 – Konzernrechnung', desc: 'Konsolidierungsregeln für Unternehmensgruppen' },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
const fmtCHF = (n: number) => n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0 });

const sumByPrefix = (bookings: Booking[], ...prefixes: string[]) =>
  bookings.filter(b => prefixes.some(p => b.account.startsWith(p))).reduce((s, b) => s + b.amount, 0);

const currentYear = new Date().getFullYear();

/* ── Component ───────────────────────────────────────────────────────── */
export default function SwissGaapFer() {
  const location = useLocation();
  const isDemo   = location.pathname.startsWith('/demo');
  const { bookings } = useBookkeeping();

  const [activeTab, setActiveTab] = useState<'overview' | 'bilanz' | 'erfolg' | 'fer' | 'checklist'>('overview');
  const [selectedFer, setSelectedFer] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  /* FER-compliant Bilanz groupings (Swiss GAAP FER 3) */
  const fer = useMemo(() => {
    const umlauf    = sumByPrefix(bookings, '1'); // current assets
    const anlagen   = sumByPrefix(bookings, '15', '16', '17', '18'); // fixed assets
    const total_a   = umlauf + anlagen;
    const fk        = sumByPrefix(bookings, '2'); // debt capital
    const ek        = sumByPrefix(bookings, '28', '29');
    const total_p   = fk + ek;
    const ertrag    = sumByPrefix(bookings, '3');
    const aufwand   = sumByPrefix(bookings, '4', '5', '6');
    const ebit      = ertrag - aufwand;
    const steuern   = sumByPrefix(bookings, '89', '8900');
    const reingewinn = ebit - steuern;
    return { umlauf, anlagen, total_a, fk, ek, total_p, ertrag, aufwand, ebit, steuern, reingewinn };
  }, [bookings]);

  const toggleFer = (id: string) =>
    setSelectedFer(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const CHECKLIST = [
    { id: 'c1', label: 'Jahresrechnung umfasst Bilanz, Erfolgsrechnung und Anhang (FER 3)' },
    { id: 'c2', label: 'Bewertungsgrundsätze im Anhang erläutert (FER 6)' },
    { id: 'c3', label: 'Sachanlagen nach FER 18 bewertet und abgeschrieben' },
    { id: 'c4', label: 'Personalvorsorge (BVG) nach FER 16 ausgewiesen' },
    { id: 'c5', label: 'Eventualverbindlichkeiten im Anhang deklariert' },
    { id: 'c6', label: 'Latente Steuern nach FER 8 berechnet und erfasst' },
    { id: 'c7', label: 'Angaben zu nahe stehenden Personen (Related Parties)' },
    { id: 'c8', label: 'Geldflussrechnung (FER 4) erstellt' },
    { id: 'c9', label: 'Konsolidierungspflicht geprüft (FER 30)' },
    { id: 'c10', label: 'Prüfung durch zugelassene Revisionsstelle (sofern obligatorisch)' },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Swiss GAAP FER"
        subtitle="Fachempfehlungen zur Rechnungslegung – konformes Reporting für mittlere und grosse Unternehmen."
      />

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Übersicht' },
          { id: 'bilanz',   label: 'FER-Bilanz' },
          { id: 'erfolg',   label: 'Erfolgsrechnung' },
          { id: 'fer',      label: 'FER-Standards' },
          { id: 'checklist', label: 'Checkliste' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={tabCls(id)}>{label}</button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Was ist Swiss GAAP FER?</p>
            <p>Swiss GAAP FER (Fachempfehlungen zur Rechnungslegung) ist der anerkannte Schweizer Rechnungslegungsstandard für mittlere und grosse Unternehmen, Non-Profit-Organisationen und kotierte Gesellschaften. Er ergänzt die Mindestanforderungen des OR und gewährleistet ein «true and fair view» der Vermögens-, Finanz- und Ertragslage.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { title: 'Anwendungsbereich', text: 'Nicht-kotierte KMU (freiwillig), NPO, gemeinnützige Stiftungen, kotierte Gesellschaften (obligatorisch)' },
              { title: 'Kernanforderungen', text: 'Bilanz, Erfolgsrechnung, Geldflussrechnung, Eigenkapitalnachweis, Anhang (inkl. Bewertungsgrundsätze)' },
              { title: 'Prüfungspflicht', text: 'Eingeschränkte Revision ab CHF 10 Mio. Umsatz oder 50 Mitarbeitende; ordentliche Revision ab CHF 40 Mio. oder 250 MA' },
            ].map(c => (
              <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{c.title}</p>
                <p className="text-sm text-slate-700">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800 mb-3">Schnellkennzahlen {currentYear}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { l: 'Bilanzsumme',    v: fmtCHF(fer.total_a) },
                { l: 'Umsatz',         v: fmtCHF(fer.ertrag) },
                { l: 'EBIT',           v: fmtCHF(fer.ebit) },
                { l: 'Reingewinn',     v: fmtCHF(fer.reingewinn) },
              ].map(s => (
                <div key={s.l}>
                  <p className="text-xs text-slate-400">{s.l}</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FER Bilanz ────────────────────────────────────────────────────── */}
      {activeTab === 'bilanz' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Swiss GAAP FER 3 – Bilanz {currentYear}</p>
            <p className="text-xs text-slate-400">Mindestgliederung gemäss FER 3.01</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Aktiva */}
            <div className="p-5 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Aktiven</p>
              {[
                { label: 'Umlaufvermögen', value: fer.umlauf, sub: true },
                { label: '  Flüssige Mittel', value: sumByPrefix(bookings, '10'), sub: false },
                { label: '  Forderungen', value: sumByPrefix(bookings, '11'), sub: false },
                { label: '  Vorräte', value: sumByPrefix(bookings, '12', '13'), sub: false },
                { label: 'Anlagevermögen', value: fer.anlagen, sub: true },
                { label: '  Sachanlagen', value: sumByPrefix(bookings, '15', '16'), sub: false },
                { label: '  Finanzanlagen', value: sumByPrefix(bookings, '17', '18'), sub: false },
              ].map(r => (
                <div key={r.label} className={`flex justify-between ${r.sub ? 'font-semibold text-slate-800 border-t border-slate-100 pt-1' : 'text-slate-500 pl-2'}`}>
                  <span>{r.label}</span>
                  <span className="tabular-nums">{fmtCHF(r.value)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-800 pt-2 mt-3">
                <span>Total Aktiven</span>
                <span className="tabular-nums">{fmtCHF(fer.total_a)}</span>
              </div>
            </div>
            {/* Passiva */}
            <div className="p-5 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Passiven</p>
              {[
                { label: 'Fremdkapital', value: fer.fk, sub: true },
                { label: '  Kurzfristiges FK', value: sumByPrefix(bookings, '20', '21'), sub: false },
                { label: '  Langfristiges FK', value: sumByPrefix(bookings, '24', '25', '26'), sub: false },
                { label: 'Eigenkapital', value: fer.ek, sub: true },
                { label: '  Aktienkapital', value: sumByPrefix(bookings, '28'), sub: false },
                { label: '  Gewinnreserven', value: sumByPrefix(bookings, '29'), sub: false },
              ].map(r => (
                <div key={r.label} className={`flex justify-between ${r.sub ? 'font-semibold text-slate-800 border-t border-slate-100 pt-1' : 'text-slate-500 pl-2'}`}>
                  <span>{r.label}</span>
                  <span className="tabular-nums">{fmtCHF(r.value)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-800 pt-2 mt-3">
                <span>Total Passiven</span>
                <span className="tabular-nums">{fmtCHF(fer.total_p)}</span>
              </div>
            </div>
          </div>
          {Math.abs(fer.total_a - fer.total_p) > 1 && (
            <div className="border-t border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-700">
              <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>
                  Differenz Aktiven/Passiven: {fmtCHF(Math.abs(fer.total_a - fer.total_p))} – Buchungen prüfen
                </div>
            </div>
          )}
        </div>
      )}

      {/* ── Erfolgsrechnung ───────────────────────────────────────────────── */}
      {activeTab === 'erfolg' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Swiss GAAP FER 3 – Erfolgsrechnung {currentYear}</p>
          </div>
          <div className="p-5 space-y-2 text-sm">
            {[
              { label: 'Betriebsertrag',   value: fer.ertrag,    bold: false },
              { label: 'Betriebsaufwand',  value: -fer.aufwand,  bold: false },
              { label: 'EBIT',             value: fer.ebit,       bold: true },
              { label: 'Steuern',          value: -fer.steuern,  bold: false },
              { label: 'Jahresgewinn/-verlust', value: fer.reingewinn, bold: true, border: true },
            ].map(r => (
              <div key={r.label} className={`flex justify-between ${r.bold ? 'font-semibold text-slate-900' : 'text-slate-600'} ${r.border ? 'border-t-2 border-slate-800 pt-2 mt-2' : ''}`}>
                <span>{r.label}</span>
                <span className={`tabular-nums ${r.value >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmtCHF(r.value)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 text-xs text-slate-500">
            Gemäss Swiss GAAP FER 3 Mindestgliederung. Für vollständige Geldflussrechnung (FER 4) zusätzliche Erfassung erforderlich.
          </div>
        </div>
      )}

      {/* ── FER Standards ─────────────────────────────────────────────────── */}
      {activeTab === 'fer' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Wähle die für dein Unternehmen relevanten Fachempfehlungen:</p>
          <div className="space-y-2">
            {(showAll ? FER_STANDARDS : FER_STANDARDS.slice(0, 5)).map(std => (
              <label key={std.id} className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-colors ${selectedFer.includes(std.id) ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input type="checkbox" checked={selectedFer.includes(std.id)} onChange={() => toggleFer(std.id)} className="mt-0.5 rounded border-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{std.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{std.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {!showAll && FER_STANDARDS.length > 5 && (
            <button onClick={() => setShowAll(true)} className="text-sm text-indigo-600 hover:underline">Alle {FER_STANDARDS.length} Standards anzeigen</button>
          )}
          {selectedFer.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {selectedFer.length} Standard{selectedFer.length !== 1 ? 's' : ''} ausgewählt: {selectedFer.join(', ')}
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Offizielle FER-Publikationen: <a href="https://www.fer.ch/de" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">www.fer.ch</a>
          </div>
        </div>
      )}

      {/* ── Checkliste ────────────────────────────────────────────────────── */}
      {activeTab === 'checklist' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Jahresabschluss-Checkliste gemäss Swiss GAAP FER:</p>
          {CHECKLIST.map(item => (
            <label key={item.id} className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-colors ${checked[item.id] ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <input type="checkbox" checked={!!checked[item.id]} onChange={e => setChecked(prev => ({ ...prev, [item.id]: e.target.checked }))} className="mt-0.5 rounded border-slate-300" />
              <span className={`text-sm ${checked[item.id] ? 'line-through text-emerald-600' : 'text-slate-700'}`}>{item.label}</span>
            </label>
          ))}
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold">{Object.values(checked).filter(Boolean).length}/{CHECKLIST.length}</span> Punkte erledigt
            {Object.values(checked).filter(Boolean).length === CHECKLIST.length && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white font-medium">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                FER-konform
              </span>
            )}
          </div>
        </div>
      )}

      {isDemo && (
        <p className="text-center text-xs text-slate-400">Demo-Modus: Zahlen basieren auf Ihren lokalen Buchungen.</p>
      )}
    </div>
  );
}
