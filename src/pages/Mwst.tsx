/**
 * Mwst.tsx – MwSt-Abrechnung ESTV (effektive Methode, Formular 533)
 * Berechnet Ziffern 200–510 auf Basis der gebuchten Buchungen.
 * Quartals-/Jahres-Auswahl, PDF-Export.
 */
import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { Booking } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCHF(n: number) {
  return n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function currentYear() { return new Date().getFullYear(); }
function currentQ()    { return Math.floor(new Date().getMonth() / 3) + 1; }

type Period = { label: string; from: string; to: string };

function buildPeriods(year: number): { quarters: Period[]; year: Period } {
  const quarters: Period[] = [
    { label: 'Q1 (Jan–Mär)', from: `${year}-01-01`, to: `${year}-03-31` },
    { label: 'Q2 (Apr–Jun)', from: `${year}-04-01`, to: `${year}-06-30` },
    { label: 'Q3 (Jul–Sep)', from: `${year}-07-01`, to: `${year}-09-30` },
    { label: 'Q4 (Okt–Dez)', from: `${year}-10-01`, to: `${year}-12-31` },
  ];
  return { quarters, year: { label: `Geschäftsjahr ${year}`, from: `${year}-01-01`, to: `${year}-12-31` } };
}

// Swiss VAT rates (valid from 01.01.2024)
const CH_RATES = [8.1, 3.8, 2.6, 0];

/** Filter bookings by period. */
function filterPeriod(bookings: Booking[], from: string, to: string): Booking[] {
  return bookings.filter(b => b.date >= from && b.date <= to);
}

/** Aggregate by VAT rate → net amount (excl. VAT) and VAT amount. */
type VatGroup = { rate: number; net: number; vat: number };

function groupByRate(bookings: Booking[], type: 'Einnahme' | 'Ausgabe'): VatGroup[] {
  const map: Record<number, VatGroup> = {};
  for (const b of bookings) {
    if (b.type !== type) continue;
    const rate = b.vatRate ?? 0;
    const vat  = b.vatAmount ?? 0;
    const net  = vat > 0 ? b.amount - vat : b.amount;
    if (!map[rate]) map[rate] = { rate, net: 0, vat: 0 };
    map[rate].net += net;
    map[rate].vat += vat;
  }
  return CH_RATES.map(r => map[r] ?? { rate: r, net: 0, vat: 0 }).filter(g => g.net > 0 || g.vat > 0);
}

// ─── ESTV-Ziffer-Struktur (effektive Methode, Formular 533) ──────────────────
// Ziffer 200: Gesamtertrag (alle Einnahmen inkl. MwSt)
// Ziffer 205: Nicht steuerbarer Anteil
// Ziffer 220: Steuerbarer Gesamtumsatz (= 200 – 205)
// Ziffer 302: Standard 8.1%
// Ziffer 312: Sonder 3.8%
// Ziffer 342: Sonder 2.6%
// Ziffer 382: Exporte / nicht steuerbar auf CH mit Recht auf Vorsteuerabzug
// Ziffer 400: Geschuldete Steuer (Summe der obigen)
// Ziffer 405: Bezugsteuer (for Dienstleistungen aus Ausland)
// Ziffer 410: Total geschuldete Steuer
// Ziffer 420: Vorsteuer auf Material / DL (Ausgaben mit MwSt)
// Ziffer 510: Zu zahlende Steuer (410 – 420)

// ─── Row components ───────────────────────────────────────────────────────────
const ZRow = ({ nr, label, amount, bold, indent, highlight }: {
  nr: string; label: string; amount: number;
  bold?: boolean; indent?: boolean; highlight?: 'red' | 'green' | 'yellow';
}) => {
  const bgCls =
    highlight === 'red'    ? 'bg-red-50 border-red-200' :
    highlight === 'green'  ? 'bg-emerald-50 border-emerald-200' :
    highlight === 'yellow' ? 'bg-amber-50 border-amber-200' :
    '';
  return (
    <div className={`flex items-center gap-4 border-b border-slate-100 px-4 py-2.5 ${bgCls}`}>
      <span className="w-12 shrink-0 font-mono text-xs font-semibold text-slate-400">{nr}</span>
      <span className={`flex-1 text-sm ${indent ? 'pl-4' : ''} ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>{label}</span>
      <span className={`tabular-nums text-sm font-medium ${bold ? 'font-bold text-slate-900' : 'text-slate-700'} ${highlight === 'red' ? 'text-red-700' : ''} ${highlight === 'green' ? 'text-emerald-700' : ''}`}>
        {fmtCHF(amount)}
      </span>
    </div>
  );
};

const DivRow = ({ label }: { label: string }) => (
  <div className="bg-slate-50 px-4 py-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
  </div>
);

// ─── PDF export ───────────────────────────────────────────────────────────────
function exportEstvPdf(data: {
  periodLabel: string;
  gesamtertrag: number;
  nichtSteubar: number;
  steuerbarerUmsatz: number;
  byRate: VatGroup[];
  bezugsteuer: number;
  totalGeschuld: number;
  vorsteuer: number;
  zahllast: number;
  companyName: string;
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const mX = 20;
  const pW = doc.internal.pageSize.getWidth();
  let y = 22;

  const heading = (txt: string) => {
    doc.setFontSize(14); doc.setTextColor(30);
    doc.text(txt, mX, y); y += 8;
  };
  const sub = (txt: string, col = [100, 100, 100]) => {
    doc.setFontSize(9); doc.setTextColor(col[0], col[1], col[2]);
    doc.text(txt, mX, y); y += 5;
  };
  const line = (nr: string, label: string, amount: number, bold = false) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(bold ? 20 : 60);
    doc.text(nr, mX, y);
    doc.text(label, mX + 14, y);
    const amtTxt = `CHF ${fmtCHF(amount)}`;
    const tw = doc.getTextWidth(amtTxt);
    doc.text(amtTxt, pW - mX - tw, y);
    y += bold ? 6 : 5;
  };
  const divider = (label: string) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(label.toUpperCase(), mX, y);
    doc.setDrawColor(200); doc.line(mX + doc.getTextWidth(label) + 3, y - 1, pW - mX, y - 1);
    y += 6;
  };

  // Header
  doc.setFillColor(245, 245, 245); doc.rect(0, 0, pW, 18, 'F');
  doc.setFontSize(16); doc.setTextColor(20);
  doc.text('MwSt-Abrechnung ESTV', mX, 12);
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text('Formular 533 – Effektive Methode', pW - mX - doc.getTextWidth('Formular 533 – Effektive Methode'), 12);
  y = 26;

  sub(`Unternehmen: ${data.companyName || '—'}`);
  sub(`Periode: ${data.periodLabel}`);
  sub(`Erstellt: ${new Date().toLocaleDateString('de-CH')}`);
  y += 4;

  heading('I. Umsatz');
  line('200', 'Vereinbarte / vereinnahmte Entgelte (brutto)', data.gesamtertrag);
  line('205', 'Davon nicht steuerbar / steuerbefreit', data.nichtSteubar);
  line('220', 'Steuerbarer Gesamtumsatz (200 – 205)', data.steuerbarerUmsatz, true);
  y += 3;

  divider('II. Berechnung der Steuer / Steuersätze');
  for (const g of data.byRate) {
    if (g.net <= 0 && g.vat <= 0) continue;
    const nr = g.rate === 8.1 ? '302' : g.rate === 3.8 ? '312' : g.rate === 2.6 ? '342' : '382';
    line(nr, `Umsatz zum Satz ${g.rate}% (netto ${fmtCHF(g.net)})`, g.vat);
  }
  line('405', 'Bezugsteuer (Dienstleistungsbezug Ausland)', data.bezugsteuer);
  line('410', 'Total geschuldete Steuer', data.totalGeschuld, true);
  y += 3;

  divider('III. Vorsteuerabzug');
  line('420', 'Vorsteuer auf Material / Dienstleistungen', data.vorsteuer);
  y += 3;

  divider('IV. Ergebnis');
  doc.setFillColor(data.zahllast >= 0 ? 220 : 235, data.zahllast >= 0 ? 240 : 252, data.zahllast >= 0 ? 230 : 220);
  doc.rect(mX - 2, y - 3, pW - 2 * mX + 4, 8, 'F');
  line('510', data.zahllast >= 0 ? 'Zu zahlende Steuer (Zahllast)' : 'Guthaben gegenüber ESTV', Math.abs(data.zahllast), true);
  y += 6;

  sub('Diese Berechnung basiert auf den in Bookitty erfassten Buchungen.', [150, 150, 150]);
  sub('Bitte beim zuständigen MWST-Beauftragten / Treuhänder prüfen lassen.', [150, 150, 150]);

  doc.save(`ESTV-MwSt-${data.periodLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Mwst() {
  const { bookings } = useBookkeeping();
  const [year,        setYear]        = useState(currentYear());
  const [periodType,  setPeriodType]  = useState<'quarter' | 'year'>('quarter');
  const [quarter,     setQuarter]     = useState(Math.max(1, currentQ() - 1)); // closed quarter
  const [bezugsteuer, setBezugsteuer] = useState('0');
  const [nichtSteubar, setNichtSteubar] = useState('0');
  const [method,      setMethod]      = useState<'effektiv' | 'saldo'>('effektiv');

  const { quarters, year: yearPeriod } = useMemo(() => buildPeriods(year), [year]);
  const period  = periodType === 'year' ? yearPeriod : quarters[quarter - 1];

  const filtered = useMemo(() => filterPeriod(bookings, period.from, period.to), [bookings, period]);

  // ── Revenue groups ────────────────────────────────────────────────────────
  const revenueByRate = useMemo(() => groupByRate(filtered, 'Einnahme'), [filtered]);
  const expenseByRate = useMemo(() => groupByRate(filtered, 'Ausgabe'),  [filtered]);

  const gesamtertrag   = filtered.filter(b => b.type === 'Einnahme').reduce((s, b) => s + b.amount, 0);
  const nichtSteubarN  = parseFloat(nichtSteubar.replace(',', '.')) || 0;
  const steuerbarerUmsatz = Math.max(0, gesamtertrag - nichtSteubarN);

  // Ziffern 302 / 312 / 342 etc.
  const totalGeschuldVat = revenueByRate.reduce((s, g) => s + g.vat, 0);
  const bezugsteuerN     = parseFloat(bezugsteuer.replace(',', '.')) || 0;
  const totalGeschuld    = totalGeschuldVat + bezugsteuerN;
  const vorsteuer        = expenseByRate.reduce((s, g) => s + g.vat, 0);
  const zahllast         = totalGeschuld - vorsteuer;

  const yearRange = Array.from({ length: 5 }, (_, i) => currentYear() - i);

  const inputCls = 'rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="MwSt-Abrechnung"
        subtitle="ESTV Formular 533 – Effektive Methode"
        action={
          <button
            onClick={() => exportEstvPdf({
              periodLabel: period.label,
              gesamtertrag,
              nichtSteubar: nichtSteubarN,
              steuerbarerUmsatz,
              byRate: revenueByRate,
              bezugsteuer: bezugsteuerN,
              totalGeschuld,
              vorsteuer,
              zahllast,
              companyName: '', // filled from company store on next iteration
            })}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF exportieren
          </button>
        }
      />

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Jahr */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Jahr</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className={inputCls + ' w-full'}>
              {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Periode */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Periode</label>
            <select value={periodType} onChange={e => setPeriodType(e.target.value as 'quarter' | 'year')} className={inputCls + ' w-full'}>
              <option value="quarter">Quartal</option>
              <option value="year">Geschäftsjahr</option>
            </select>
          </div>
          {/* Quartal */}
          {periodType === 'quarter' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Quartal</label>
              <select value={quarter} onChange={e => setQuarter(parseInt(e.target.value))} className={inputCls + ' w-full'}>
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
              </select>
            </div>
          )}
          {/* Methode */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Methode</label>
            <select value={method} onChange={e => setMethod(e.target.value as 'effektiv' | 'saldo')} className={inputCls + ' w-full'}>
              <option value="effektiv">Effektiv (533)</option>
              <option value="saldo">Saldosteuersatz (583)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          Periode: <strong className="ml-1">{period.label}</strong>
          <span className="ml-1 text-amber-600">({period.from} – {period.to})</span>
          {method === 'saldo' && <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 font-semibold">Saldosteuersatz: manuelle Eingabe erforderlich</span>}
        </div>
      </div>

      {/* ── Anpassungen ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Korrekturen / Ergänzungen</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Ziffer 205 – Nicht steuerbarer Anteil (CHF)
            </label>
            <input type="text" inputMode="decimal" value={nichtSteubar}
              onChange={e => setNichtSteubar(e.target.value)}
              placeholder="0.00" className={inputCls + ' w-full'} />
            <p className="mt-1 text-[10px] text-slate-400">z. B. Spenden, Subventionen, steuerbefreite Umsätze</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Ziffer 405 – Bezugsteuer Ausland (CHF)
            </label>
            <input type="text" inputMode="decimal" value={bezugsteuer}
              onChange={e => setBezugsteuer(e.target.value)}
              placeholder="0.00" className={inputCls + ' w-full'} />
            <p className="mt-1 text-[10px] text-slate-400">Steuer auf Dienstleistungen aus dem Ausland (z.B. Google Ads, Software-Abos)</p>
          </div>
        </div>
      </div>

      {/* ── Formular ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* I. Umsatz */}
        <DivRow label="I. Umsatz" />
        <ZRow nr="200" label="Vereinbarte / vereinnahmte Entgelte (brutto)" amount={gesamtertrag} />
        <ZRow nr="205" label="Davon nicht steuerbar / steuerbefreit" amount={nichtSteubarN} indent />
        <ZRow nr="220" label="Steuerbarer Gesamtumsatz (200 – 205)" amount={steuerbarerUmsatz} bold />

        {/* II. Steuerberechnung */}
        <DivRow label="II. Berechnung der Steuer" />
        {revenueByRate.length === 0 ? (
          <div className="px-4 py-4 text-sm text-slate-400 italic">
            Keine Buchungen mit MwSt in dieser Periode.
          </div>
        ) : (
          revenueByRate.map(g => {
            const nr = g.rate === 8.1 ? '302' : g.rate === 3.8 ? '312' : g.rate === 2.6 ? '342' : '382';
            return (
              <ZRow key={g.rate} nr={nr}
                label={`Umsatz ${g.rate}% (Netto CHF ${fmtCHF(g.net)})`}
                amount={g.vat} indent />
            );
          })
        )}
        <ZRow nr="405" label="Bezugsteuer (Dienstleistungsbezug Ausland)" amount={bezugsteuerN} indent />
        <ZRow nr="410" label="Total geschuldete Steuer" amount={totalGeschuld} bold />

        {/* III. Vorsteuer */}
        <DivRow label="III. Vorsteuerabzug" />
        {expenseByRate.length === 0 ? (
          <div className="px-4 py-4 text-sm text-slate-400 italic">
            Keine Vorsteuer-Buchungen in dieser Periode.
          </div>
        ) : (
          expenseByRate.map(g => (
            <ZRow key={g.rate} nr="420"
              label={`Vorsteuer ${g.rate}% (Material / DL, netto CHF ${fmtCHF(g.net)})`}
              amount={g.vat} indent />
          ))
        )}
        <ZRow nr="420" label="Total Vorsteuerabzug" amount={vorsteuer} bold />

        {/* IV. Ergebnis */}
        <DivRow label="IV. Ergebnis" />
        <ZRow
          nr="510"
          label={zahllast >= 0 ? 'Zu zahlende Steuer (Zahllast)' : 'Guthaben gegenüber ESTV'}
          amount={Math.abs(zahllast)}
          bold
          highlight={zahllast > 0 ? 'red' : zahllast < 0 ? 'green' : 'yellow'}
        />
      </div>

      {/* ── Aufschlüsselung ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Ertrag nach Satz */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Ertrag nach MwSt-Satz</h3>
          {revenueByRate.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Keine Daten</p>
          ) : (
            <div className="space-y-2">
              {revenueByRate.map(g => (
                <div key={g.rate} className="flex justify-between text-sm">
                  <span className="text-slate-600">{g.rate}%</span>
                  <div className="text-right">
                    <div className="font-medium text-slate-800">CHF {fmtCHF(g.net)}</div>
                    <div className="text-xs text-slate-400">MwSt: {fmtCHF(g.vat)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aufwand nach Satz */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Vorsteuer nach Satz</h3>
          {expenseByRate.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Keine Daten</p>
          ) : (
            <div className="space-y-2">
              {expenseByRate.map(g => (
                <div key={g.rate} className="flex justify-between text-sm">
                  <span className="text-slate-600">{g.rate}%</span>
                  <div className="text-right">
                    <div className="font-medium text-slate-800">CHF {fmtCHF(g.net)}</div>
                    <div className="text-xs text-slate-400">Vorsteuer: {fmtCHF(g.vat)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Hinweis ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong>Hinweis:</strong> Diese Berechnung dient als Arbeitshilfe und basiert auf den in Bookitty erfassten Buchungen inkl. MwSt-Beträgen.
        Die definitiven Zahlen sind mit einem Steuerberater oder MWST-Beauftragten zu überprüfen. Fristgerechte Einreichung via{' '}
        <a href="https://www.estv.admin.ch" target="_blank" rel="noreferrer" className="underline hover:text-slate-700">estv.admin.ch</a>.
      </div>
    </div>
  );
}
