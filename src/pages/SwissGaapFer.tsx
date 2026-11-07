import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import { calculateFerPreview } from '../utils/ferPreview';
import { getCompany } from '../utils/companyStore';
import { api } from '../services/api';

/* ── FER standard definitions ────────────────────────────────────────── */
const FER_STANDARDS = [
  { id: 'FER_3', label: 'FER 3 – Darstellung und Gliederung', desc: 'Mindestgliederung für Jahresrechnung' },
  { id: 'FER_2', label: 'FER 2 – Bewertung', desc: 'Bewertung von Aktiven und Passiven' },
  { id: 'FER_6', label: 'FER 6 – Anhang', desc: 'Angaben zu Bewertungsgrundlagen und -grundsätzen' },
  { id: 'FER_16', label: 'FER 16 – Vorsorgeverpflichtungen', desc: 'Pensionskassenverpflichtungen (BVG)' },
  { id: 'FER_18', label: 'FER 18 – Sachanlagen', desc: 'Bewertung und Abschreibung Sachanlagen' },
  { id: 'FER_26', label: 'FER 26 – Vorsorgeeinrichtungen', desc: 'Rechnungslegung von Vorsorgeeinrichtungen' },
  { id: 'FER_27', label: 'FER 27 – Derivative Finanzinstrumente', desc: 'Ausweis von Derivaten und Hedging' },
  { id: 'FER_30', label: 'FER 30 – Konzernrechnung', desc: 'Konsolidierungsregeln für Unternehmensgruppen' },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
const fmtCHF = (n: number) => n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 });

const currentYear = new Date().getFullYear();

/* ── Component ───────────────────────────────────────────────────────── */
export default function SwissGaapFer() {
  const location = useLocation();
  const isDemo   = location.pathname.startsWith('/demo');
  const { bookings } = useBookkeeping();
  const [companyName, setCompanyName] = useState(() => isDemo ? getCompany().name : '');

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    api.company.get().then((company) => {
      if (active) setCompanyName(company.name ?? '');
    }).catch(() => {});
    return () => { active = false; };
  }, [isDemo]);

  const [activeTab, setActiveTab] = useState<'overview' | 'bilanz' | 'erfolg' | 'fer' | 'checklist'>('overview');
  const [selectedFer, setSelectedFer] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [year, setYear] = useState(currentYear);
  const years = [...new Set([currentYear, ...bookings.map((booking) => Number(booking.date.slice(0, 4))).filter((value) => value >= 1900 && value <= 2100)])].sort((a, b) => b - a);

  const fer = useMemo(() => calculateFerPreview(bookings, year), [bookings, year]);

  const toggleFer = (id: string) =>
    setSelectedFer(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const CHECKLIST = [
    { id: 'c1', label: 'Jahresrechnung umfasst Bilanz, Erfolgsrechnung und Anhang (FER 3)' },
    { id: 'c2', label: 'Bewertungsgrundsätze im Anhang erläutert (FER 6)' },
    { id: 'c3', label: 'Sachanlagen nach FER 18 bewertet und abgeschrieben' },
    { id: 'c4', label: 'Personalvorsorge (BVG) nach FER 16 ausgewiesen' },
    { id: 'c5', label: 'Eventualverbindlichkeiten im Anhang deklariert' },
    { id: 'c6', label: 'Latente Steuern geprüft und erfasst' },
    { id: 'c7', label: 'Angaben zu nahe stehenden Personen (Related Parties)' },
    { id: 'c8', label: 'Geldflussrechnung (FER 4) erstellt' },
    { id: 'c9', label: 'Konsolidierungspflicht geprüft (FER 30)' },
    { id: 'c10', label: 'Prüfung durch zugelassene Revisionsstelle (sofern obligatorisch)' },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const exportPdf = () => {
    if (fer.issues.length || bookings.length === 0) return;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    let ypos = 20;
    const ensure = (space: number) => { if (ypos + space > height - 18) { doc.addPage(); ypos = 20; } };
    const text = (value: string, size = 10) => {
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(value, width - 28) as string[];
      for (const line of lines) {
        ensure(5);
        doc.text(line, 14, ypos);
        ypos += 5;
      }
      ypos += 2;
    };
    const row = (label: string, value: number, bold = false) => {
      ensure(7);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.text(label, 18, ypos);
      doc.text(fmtCHF(value), width - 14, ypos, { align: 'right' });
      ypos += 7;
    };
    doc.setFont('helvetica', 'bold');
    text('Swiss GAAP FER - Arbeitsentwurf', 17);
    doc.setFont('helvetica', 'normal');
    text(`${companyName || 'Firma nicht angegeben'} | Kalenderjahr ${year} | CHF`, 10);
    text('Ungeprüfter Arbeitsentwurf. Kein vollständiger oder FER-konformer Abschluss und kein IFRS-Bericht. Bewertungsgrundlagen, Geldflussrechnung, Eigenkapitalnachweis und Anhang sind separat zu prüfen.', 9);
    doc.setFont('helvetica', 'bold'); text(`Bilanz per 31.12.${year}`, 12); doc.setFont('helvetica', 'normal');
    row('Umlaufvermögen', fer.umlauf, true);
    row('   Flüssige Mittel', fer.fluessig); row('   Forderungen', fer.forderungen);
    row('   Vorräte', fer.vorraete); row('   Aktive Abgrenzungen', fer.abgrenzungen);
    row('Anlagevermögen', fer.anlagen, true);
    row('   Sachanlagen', fer.sachanlagen); row('   Finanzanlagen', fer.finanzanlagen);
    row('   Übrige Anlagen', fer.sonstigeAnlagen); row('Total Aktiven', fer.total_a, true);
    row('Fremdkapital', fer.fk, true); row('   Kurzfristiges FK', fer.kurzfristig); row('   Langfristiges FK', fer.langfristig);
    row('Eigenkapital', fer.ek, true); row('   Kapital und Privatkonten', fer.kapital); row('   Reserven und Vortrag', fer.reserven);
    row('Total Passiven', fer.total_p, true);
    if (Math.abs(fer.total_a - fer.total_p) > 0.01) text(`Differenz Aktiven / Passiven: ${fmtCHF(fer.total_a - fer.total_p)}. Abschlussbuchungen und Eröffnungsbestände prüfen.`, 9);
    doc.setFont('helvetica', 'bold'); text(`Erfolgsrechnung ${year}`, 12); doc.setFont('helvetica', 'normal');
    row('Betriebsertrag', fer.ertrag); row('Betriebsaufwand', -fer.aufwand);
    row('Zwischenergebnis (Kontenklassen 3-6)', fer.zwischenergebnis, true);
    row('Übriger Erfolg (Kontenklassen 7-8)', fer.uebrigerErfolg); row('Direkte Steuern', -fer.steuern);
    row('Jahresergebnis', fer.reingewinn, true);
    text('Bilanz: alle erfassten Buchungen bis zum Stichtag. Erfolgsrechnung: Buchungen des Kalenderjahres ohne Abschlussbuchungen auf Kontenklasse 9. Vollständigkeit und Zuordnung der Konten sind nicht geprüft.', 9);
    doc.save(`bookitty-fer-arbeitsentwurf-${year}.pdf`);
  };

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Swiss GAAP FER"
        subtitle="Arbeitsentwurf auf Basis der erfassten Buchungen. Kein geprüfter Abschluss."
        action={<button type="button" onClick={exportPdf} disabled={fer.issues.length > 0 || bookings.length === 0}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">PDF herunterladen</button>}
      />

      <label className="flex items-center gap-3 text-sm text-slate-700">Kalenderjahr
        <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Ungeprüfter Arbeitsentwurf, kein vollständiger Swiss-GAAP-FER- oder IFRS-Abschluss. Bewertungsgrundlagen, Anhang und weitere Abschlussbestandteile müssen fachlich geprüft und ergänzt werden.
      </div>
      {fer.issues.length > 0 && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{fer.issues.map((issue) => <p key={issue}>{issue}</p>)}</div>}

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
              { title: 'Anwendungsbereich', text: 'Die Anwendbarkeit hängt von Unternehmen, Rechtsform und regulatorischen Vorgaben ab.' },
              { title: 'Kernanforderungen', text: 'Bilanz, Erfolgsrechnung, Geldflussrechnung, Eigenkapitalnachweis, Anhang (inkl. Bewertungsgrundsätze)' },
              { title: 'Prüfungspflicht', text: 'Revisionspflicht und anwendbare Standards sind für das Unternehmen fachlich zu prüfen.' },
            ].map(c => (
              <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{c.title}</p>
                <p className="text-sm text-slate-700">{c.text}</p>
              </div>
            ))}
          </div>
          {fer.issues.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800 mb-3">Schnellkennzahlen {year}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { l: 'Bilanzsumme',    v: fmtCHF(fer.total_a) },
                { l: 'Umsatz',         v: fmtCHF(fer.ertrag) },
                { l: 'Zwischenergebnis', v: fmtCHF(fer.zwischenergebnis) },
                { l: 'Reingewinn',     v: fmtCHF(fer.reingewinn) },
              ].map(s => (
                <div key={s.l}>
                  <p className="text-xs text-slate-400">{s.l}</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900">{s.v}</p>
                </div>
              ))}
            </div>
          </div>}
        </div>
      )}

      {/* ── FER Bilanz ────────────────────────────────────────────────────── */}
      {activeTab === 'bilanz' && fer.issues.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Bilanz-Entwurf per 31.12.{year}</p>
            <p className="text-xs text-slate-400">Salden aus allen erfassten Buchungen bis zum Stichtag</p>
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {/* Aktiva */}
            <div className="p-5 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Aktiven</p>
              {[
                { label: 'Umlaufvermögen', value: fer.umlauf, sub: true },
                { label: '  Flüssige Mittel', value: fer.fluessig, sub: false },
                { label: '  Forderungen', value: fer.forderungen, sub: false },
                { label: '  Vorräte', value: fer.vorraete, sub: false },
                { label: '  Aktive Abgrenzungen', value: fer.abgrenzungen, sub: false },
                { label: 'Anlagevermögen', value: fer.anlagen, sub: true },
                { label: '  Sachanlagen', value: fer.sachanlagen, sub: false },
                { label: '  Finanzanlagen', value: fer.finanzanlagen, sub: false },
                { label: '  Übrige Anlagen', value: fer.sonstigeAnlagen, sub: false },
              ].map(r => (
                <div key={r.label} className={`flex justify-between gap-2 ${r.sub ? 'font-semibold text-slate-800 border-t border-slate-100 pt-1' : 'text-slate-500 pl-2'}`}>
                  <span>{r.label}</span>
                  <span className="shrink-0 tabular-nums">{fmtCHF(r.value)}</span>
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
                { label: '  Kurzfristiges FK', value: fer.kurzfristig, sub: false },
                { label: '  Langfristiges FK', value: fer.langfristig, sub: false },
                { label: 'Eigenkapital', value: fer.ek, sub: true },
                { label: '  Kapital und Privatkonten', value: fer.kapital, sub: false },
                { label: '  Reserven und Vortrag', value: fer.reserven, sub: false },
              ].map(r => (
                <div key={r.label} className={`flex justify-between gap-2 ${r.sub ? 'font-semibold text-slate-800 border-t border-slate-100 pt-1' : 'text-slate-500 pl-2'}`}>
                  <span>{r.label}</span>
                  <span className="shrink-0 tabular-nums">{fmtCHF(r.value)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-800 pt-2 mt-3">
                <span>Total Passiven</span>
                <span className="tabular-nums">{fmtCHF(fer.total_p)}</span>
              </div>
            </div>
          </div>
          {Math.abs(fer.total_a - fer.total_p) > 0.01 && (
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
      {activeTab === 'erfolg' && fer.issues.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Erfolgsrechnung-Entwurf {year}</p>
          </div>
          <div className="p-5 space-y-2 text-sm">
            {[
              { label: 'Betriebsertrag',   value: fer.ertrag,    bold: false },
              { label: 'Betriebsaufwand',  value: -fer.aufwand,  bold: false },
              { label: 'Zwischenergebnis (Kontenklassen 3–6)', value: fer.zwischenergebnis, bold: true },
              { label: 'Übriger Erfolg (Kontenklassen 7–8)', value: fer.uebrigerErfolg, bold: false },
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
            Ohne Abschlussbuchungen auf Kontenklasse 9. Bewertungs- und Abschlussbuchungen sind fachlich zu prüfen.
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
                Alle Punkte markiert
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
