import { useState } from 'react';
import { jsPDF } from 'jspdf';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import { accountCategories, accounts, formatAccount } from '../data/chAccounts';

const fmt = (value: number, cur: string) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: cur }).format(value);

// ── Category classification ────────────────────────────────────────────────
const AKTIV_CATS = ['1'];
const PASSIV_CATS = ['2'];

const categoryLabel = (code: string) =>
  accountCategories.find((c) => c.code === code)?.name ?? code;

// Helper: account name contains "ertrag" → revenue (credit side)
const isErtragByName = (name: string) => name.toLowerCase().includes('ertrag');

// Bilanz sub-groups (Slide 12)
const BILANZ_GROUPS = {
  aktiv: [
    { label: 'Umlaufvermögen', min: 1000, max: 1399 },
    { label: 'Anlagevermögen', min: 1400, max: 1999 },
  ],
  passiv: [
    { label: 'Kurzfristiges Fremdkapital', min: 2000, max: 2399 },
    { label: 'Langfristiges Fremdkapital', min: 2400, max: 2699 },
    { label: 'Eigenkapital', min: 2800, max: 2999 },
  ],
};

// Approximate combined effective corporate tax rates 2024 (federal + cantonal + municipal)
// Sources: KPMG/PWC Swiss Tax Reports 2024 – provisional estimates for KMU tool
const FEDERAL_RATE = 7.83; // Direkte Bundessteuer (8.5% gross ≈ 7.83% effective)
const CANTON_RATES = [
  { code: 'AG', name: 'Aargau',                rate: 18.6 },
  { code: 'AI', name: 'App. Innerrhoden',       rate: 12.7 },
  { code: 'AR', name: 'App. Ausserrhoden',      rate: 13.0 },
  { code: 'BE', name: 'Bern',                   rate: 21.0 },
  { code: 'BL', name: 'Basel-Landschaft',       rate: 20.7 },
  { code: 'BS', name: 'Basel-Stadt',            rate: 13.0 },
  { code: 'FR', name: 'Freiburg',               rate: 19.9 },
  { code: 'GE', name: 'Genf',                   rate: 14.0 },
  { code: 'GL', name: 'Glarus',                 rate: 15.3 },
  { code: 'GR', name: 'Graubünden',             rate: 16.1 },
  { code: 'JU', name: 'Jura',                   rate: 20.7 },
  { code: 'LU', name: 'Luzern',                 rate: 12.3 },
  { code: 'NE', name: 'Neuenburg',              rate: 14.7 },
  { code: 'NW', name: 'Nidwalden',              rate: 12.0 },
  { code: 'OW', name: 'Obwalden',               rate: 12.7 },
  { code: 'SG', name: 'St. Gallen',             rate: 17.4 },
  { code: 'SH', name: 'Schaffhausen',           rate: 15.0 },
  { code: 'SO', name: 'Solothurn',              rate: 17.8 },
  { code: 'SZ', name: 'Schwyz',                 rate: 11.9 },
  { code: 'TG', name: 'Thurgau',               rate: 16.1 },
  { code: 'TI', name: 'Tessin',                 rate: 19.0 },
  { code: 'UR', name: 'Uri',                    rate: 14.9 },
  { code: 'VD', name: 'Waadt',                  rate: 14.0 },
  { code: 'VS', name: 'Wallis',                 rate: 18.0 },
  { code: 'ZG', name: 'Zug',                    rate: 11.9 },
  { code: 'ZH', name: 'Zürich',                 rate: 19.7 },
];

// ── Expandable section row ─────────────────────────────────────────────────
const Section = ({
  title, total, cur, positive, children,
}: {
  title: string; total: number; cur: string; positive?: boolean; children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <svg
            className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="min-w-0">{title}</span>
        </span>
        <span className={`tabular-nums font-semibold shrink-0 ${
          positive === undefined ? 'text-slate-900' : positive ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          {fmt(total, cur)}
        </span>
      </button>
      {open && children && (
        <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
          {children}
        </div>
      )}
    </div>
  );
};

// Netto section for mixed Ertrag/Aufwand categories (7, 8)
const NettoSection = ({
  title, netto, cur, children,
}: {
  title: string; netto: number; cur: string; children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
      >
        <span className="flex items-center gap-2">
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {title}
          <span className="text-[10px] font-normal text-slate-400">(Netto-Erfolg)</span>
        </span>
        <span className={`tabular-nums font-semibold ${netto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {fmt(netto, cur)}
        </span>
      </button>
      {open && children && (
        <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
          {children}
        </div>
      )}
    </div>
  );
};

const AccountRow = ({ label, value, cur, tag }: { label: string; value: number; cur: string; tag?: string }) => (
  <div className="flex items-center justify-between px-8 py-2 text-xs text-slate-600">
    <span className="flex items-center gap-2">
      {tag && (
        <span className={`rounded px-1 py-0.5 text-[9px] font-bold ${
          tag === 'Ert' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>{tag}</span>
      )}
      {label}
    </span>
    <span className="tabular-nums font-medium text-slate-800">{fmt(value, cur)}</span>
  </div>
);

const SubtotalRow = ({ label, value, cur, highlight = false }: {
  label: string; value: number; cur: string; highlight?: boolean;
}) => (
  <div className={`flex items-center justify-between gap-2 px-4 py-2 text-sm font-semibold border-t border-slate-200 mt-1 ${
    highlight
      ? (value >= 0 ? 'text-emerald-800' : 'text-rose-800')
      : (value >= 0 ? 'text-emerald-700' : 'text-rose-700')
  }`}>
    <span className="min-w-0 flex-1">{label}</span>
    <span className="tabular-nums shrink-0">{fmt(value, cur)}</span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────
const Bilanz = () => {
  const { bookings } = useBookkeeping();
  const [tab, setTab] = useState<'erfolg' | 'bilanz' | 'mwst' | 'steuern'>('erfolg');
  const [canton, setCanton] = useState('ZH');
  const cur = bookings[0]?.currency ?? 'CHF';

  // Soll (Debit) → Aktiven (1xxx) and Aufwand (4–8 Aufwand accounts)
  const byDebit = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.account] = (acc[b.account] ?? 0) + b.amount;
    return acc;
  }, {});

  // Haben (Credit) → Passiven (2xxx) and Ertrag (3xxx, and Ertrag in 7/8)
  const byCredit = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.contraAccount] = (acc[b.contraAccount] ?? 0) + b.amount;
    return acc;
  }, {});

  // byCat: Aktiven/Aufwand-pure (1,4,5,6) → debit; Ertrag/Passiven (2,3) → credit
  const DEBIT_CATS = new Set(['1', '4', '5', '6']);
  const byCat = accounts.reduce<Record<string, number>>((acc, acct) => {
    const code = formatAccount(acct);
    const val = DEBIT_CATS.has(acct.categoryCode)
      ? (byDebit[code] ?? 0)
      : (byCredit[code] ?? 0);
    acc[acct.categoryCode] = (acc[acct.categoryCode] ?? 0) + val;
    return acc;
  }, {});

  // Cat 7 – Betrieblicher Nebenerfolg (mixed)
  const cat7 = accounts.filter((a) => a.categoryCode === '7');
  const ertrag7 = cat7.filter((a) => isErtragByName(a.name))
    .reduce((s, a) => s + (byCredit[formatAccount(a)] ?? 0), 0);
  const aufwand7 = cat7.filter((a) => !isErtragByName(a.name))
    .reduce((s, a) => s + (byDebit[formatAccount(a)] ?? 0), 0);
  const netto7 = ertrag7 - aufwand7;
  const hasAny7 = cat7.some((a) => {
    const fk = formatAccount(a);
    return (byDebit[fk] ?? 0) + (byCredit[fk] ?? 0) > 0;
  });

  // Cat 8 – Betriebsfremder Erfolg (excl. 8900)
  const cat8noTax = accounts.filter((a) => a.categoryCode === '8' && a.code !== '8900');
  const ertrag8 = cat8noTax.filter((a) => isErtragByName(a.name))
    .reduce((s, a) => s + (byCredit[formatAccount(a)] ?? 0), 0);
  const aufwand8 = cat8noTax.filter((a) => !isErtragByName(a.name))
    .reduce((s, a) => s + (byDebit[formatAccount(a)] ?? 0), 0);
  const netto8 = ertrag8 - aufwand8;
  const hasAny8 = cat8noTax.some((a) => {
    const fk = formatAccount(a);
    return (byDebit[fk] ?? 0) + (byCredit[fk] ?? 0) > 0;
  });

  // Direkte Steuern 8900
  const konto8900 = accounts.find((a) => a.code === '8900');
  const steuern = konto8900 ? (byDebit[formatAccount(konto8900)] ?? 0) : 0;

  // Intermediate Erfolgsrechnung (Slide 14)
  // totalBetriebsertrag: type-based for robustness – handles any account assignment
  const totalBetriebsertrag = bookings.filter((b) => b.type === 'Einnahme').reduce((s, b) => s + b.amount, 0);
  const materialaufwand     = byCat['4'] ?? 0;
  const bruttogewinnI       = totalBetriebsertrag - materialaufwand;
  const personalaufwand     = byCat['5'] ?? 0;
  const bruttogewinnII      = bruttogewinnI - personalaufwand;
  const uebrBetriebsaufwand = byCat['6'] ?? 0;
  const ebit                = bruttogewinnII - uebrBetriebsaufwand;
  const ergebnisVorAusserord = ebit + netto7;
  const ergebnisVorSteuern   = ergebnisVorAusserord + netto8;
  const jahresergebnis       = ergebnisVorSteuern - steuern;

  const totalErtrag  = totalBetriebsertrag + ertrag7 + ertrag8;
  const totalAufwand = materialaufwand + personalaufwand + uebrBetriebsaufwand + aufwand7 + aufwand8 + steuern;

  // Bilanz totals
  const totalAktiv  = AKTIV_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);
  const totalPassiv = PASSIV_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);

  // Sub-group helpers
  const accountsInGroup = (min: number, max: number) =>
    accounts.filter((a) => { const c = parseInt(a.code, 10); return c >= min && c <= max; });

  const sumGroup = (min: number, max: number, side: 'debit' | 'credit') =>
    accountsInGroup(min, max).reduce((s, a) => {
      const v = side === 'debit' ? (byDebit[formatAccount(a)] ?? 0) : (byCredit[formatAccount(a)] ?? 0);
      return s + v;
    }, 0);

  // MwSt
  const mwstRows = bookings
    .filter((b) => (b.vatAmount ?? 0) > 0)
    .map((b) => ({
      date: b.date, description: b.description, account: b.account,
      rate: b.vatRate, vatAmount: b.vatAmount ?? 0, type: b.type, currency: b.currency,
    }));
  const vorsteuer       = mwstRows.filter((r) => r.type === 'Ausgabe').reduce((s, r) => s + r.vatAmount, 0);
  const geschuldeteMwst = mwstRows.filter((r) => r.type === 'Einnahme').reduce((s, r) => s + r.vatAmount, 0);
  const mwstSaldo       = geschuldeteMwst - vorsteuer;

  // ── Steuern (provisorisch) ────────────────────────────────────────────────
  const selectedCanton = CANTON_RATES.find((c) => c.code === canton) ?? CANTON_RATES[CANTON_RATES.length - 1];
  const taxBase    = Math.max(0, ergebnisVorSteuern);
  const federalTax = taxBase * FEDERAL_RATE / 100;
  const cantonRate = Math.max(0, selectedCanton.rate - FEDERAL_RATE);
  const cantonTax  = taxBase * cantonRate / 100;
  const totalTax   = taxBase * selectedCanton.rate / 100;

  // PDF Export
  const exportPdf = () => {
    const doc = new jsPDF();
    const mX = 14;
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    let y = 20;
    doc.setFontSize(18);
    doc.text('Bookitty – Jahresbericht', mX, y); y += 10;
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Jahr: ${new Date().getFullYear()} · Währung: ${cur}`, mX, y); y += 10;
    doc.setTextColor(0);

    const section = (title: string) => {
      if (y > pH - 20) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.setTextColor(30);
      doc.text(title, mX, y);
      doc.setDrawColor(220); doc.line(mX, y + 1, pW - mX, y + 1);
      doc.setTextColor(0); y += 7;
    };

    const row = (label: string, val: number, indent = 4) => {
      if (y > pH - 20) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.text(label, mX + indent, y);
      doc.text(fmt(val, cur), pW - mX - 35, y); y += 5.5;
    };

    const subtotal = (label: string, val: number) => {
      if (y > pH - 20) { doc.addPage(); y = 20; }
      doc.setFontSize(10); doc.setTextColor(val >= 0 ? 20 : 180);
      doc.text(label, mX, y);
      doc.text(fmt(val, cur), pW - mX - 35, y);
      doc.setTextColor(0); y += 6;
    };

    section('Erfolgsrechnung');
    doc.setFontSize(10); doc.text(categoryLabel('3'), mX, y); y += 5;
    accounts.filter((a) => a.categoryCode === '3' && (byCredit[formatAccount(a)] ?? 0) !== 0)
      .forEach((a) => row(formatAccount(a), byCredit[formatAccount(a)]));
    subtotal('Bruttogewinn I', bruttogewinnI);

    if (personalaufwand > 0) {
      doc.setFontSize(10); doc.text(categoryLabel('5'), mX, y); y += 5;
      accounts.filter((a) => a.categoryCode === '5' && (byDebit[formatAccount(a)] ?? 0) !== 0)
        .forEach((a) => row(formatAccount(a), byDebit[formatAccount(a)]));
      subtotal('Bruttogewinn II', bruttogewinnII);
    }

    if (uebrBetriebsaufwand > 0) {
      doc.setFontSize(10); doc.text(categoryLabel('6'), mX, y); y += 5;
      accounts.filter((a) => a.categoryCode === '6' && (byDebit[formatAccount(a)] ?? 0) !== 0)
        .forEach((a) => row(formatAccount(a), byDebit[formatAccount(a)]));
      subtotal('Betriebsergebnis (EBIT)', ebit);
    }

    subtotal('Jahresergebnis', jahresergebnis);
    y += 4;

    section('Bilanz – Aktiven');
    BILANZ_GROUPS.aktiv.forEach(({ label, min, max }) => {
      const grpAccts = accountsInGroup(min, max).filter((a) => (byDebit[formatAccount(a)] ?? 0) !== 0);
      if (grpAccts.length === 0) return;
      doc.setFontSize(10); doc.setTextColor(40); doc.text(label, mX, y); y += 5; doc.setTextColor(0);
      grpAccts.forEach((a) => row(formatAccount(a), byDebit[formatAccount(a)]));
    });
    subtotal('Total Aktiven', totalAktiv);

    section('Bilanz – Passiven');
    BILANZ_GROUPS.passiv.forEach(({ label, min, max }) => {
      const grpAccts = accountsInGroup(min, max).filter((a) => (byCredit[formatAccount(a)] ?? 0) !== 0);
      if (grpAccts.length === 0) return;
      doc.setFontSize(10); doc.setTextColor(40); doc.text(label, mX, y); y += 5; doc.setTextColor(0);
      grpAccts.forEach((a) => row(formatAccount(a), byCredit[formatAccount(a)]));
    });
    subtotal('Total Passiven', totalPassiv);

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('Bookitty · Finanzbuchhaltung', mX, pH - 10);

    // MwSt-Abrechnung
    y += 4;
    section('MwSt-Abrechnung (ESTV)');
    row('Steuerbarer Umsatz', totalBetriebsertrag);
    row('Geschuldete MwSt (Ertrag)', geschuldeteMwst);
    row('Vorsteuer (Aufwand)', vorsteuer);
    subtotal(mwstSaldo >= 0 ? 'Zahllast' : 'Guthaben', Math.abs(mwstSaldo));

    // Direkte Steuern (provisorisch)
    if (taxBase > 0) {
      y += 4;
      section(`Direkte Steuern – ${selectedCanton.code} (provisorisch)`);
      row('Steuerbarer Gewinn', taxBase);
      row(`Direkte Bundessteuer (~${FEDERAL_RATE}%)`, federalTax);
      row(`Kantons- und Gemeindesteuer (~${cantonRate.toFixed(1)}%)`, cantonTax);
      subtotal(`Geschätzte Gesamtsteuer (${selectedCanton.rate}%)`, totalTax);
      if (y > pH - 20) { doc.addPage(); y = 20; }
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text('* Provisorische Schätzung – nicht verbindlich. Bitte Steuerfachperson konsultieren.', mX, y); y += 5;
      doc.setTextColor(0);
    }

    doc.save('bookitty-jahresbericht.pdf');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Auswertungen"
        subtitle="Erfolgsrechnung und Bilanz auf Basis aller Buchungen."
        action={
          <button type="button" onClick={exportPdf}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            PDF herunterladen
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Betriebsertrag',  value: totalErtrag,     color: 'text-emerald-600' },
          { label: 'Betriebsaufwand', value: totalAufwand,    color: 'text-rose-600' },
          { label: 'Jahresergebnis',  value: jahresergebnis,  color: jahresergebnis >= 0 ? 'text-emerald-600' : 'text-rose-600' },
          { label: 'Aktiven / Passiven', value: totalAktiv,   color: 'text-slate-700', sub: fmt(totalPassiv, cur) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`mt-2 text-xl font-bold tabular-nums ${card.color}`}>{fmt(card.value, cur)}</p>
            {card.sub && <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-max">
          {([['erfolg', 'Erfolgsrechnung'], ['bilanz', 'Bilanz'], ['mwst', 'MwSt'], ['steuern', 'Steuern']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Erfolgsrechnung (Slide 14) ── */}
      {tab === 'erfolg' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Erfolgsrechnung</h3>

          {/* Betriebsertrag */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1">Betriebsertrag</p>
          {(() => {
            // Group Einnahme bookings by their revenue account (contraAccount preferred,
            // fall back to account if that looks like an Ertrag account).
            // This works regardless of whether exact chAccounts strings are used.
            const groups = bookings
              .filter((b) => b.type === 'Einnahme')
              .reduce<Record<string, number>>((acc, b) => {
                const key = b.contraAccount || b.account;
                acc[key] = (acc[key] ?? 0) + b.amount;
                return acc;
              }, {});
            const entries = Object.entries(groups).filter(([, v]) => v !== 0);
            return (
              <Section title={categoryLabel('3')} total={totalBetriebsertrag} cur={cur} positive>
                {entries.length > 0
                  ? entries.map(([label, value]) => (
                      <AccountRow key={label} label={label} value={value} cur={cur} />
                    ))
                  : <div className="px-8 py-2 text-xs text-slate-400">Keine Einnahmen vorhanden</div>
                }
              </Section>
            );
          })()}
          <SubtotalRow label="Total Betriebsertrag" value={totalBetriebsertrag} cur={cur} />

          {/* Material- und Warenaufwand (4xxx) */}
          {materialaufwand > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 pt-3">Material- und Warenaufwand</p>
              <Section title={categoryLabel('4')} total={materialaufwand} cur={cur}>
                {(() => {
                  // Account-code match first; fall back to Ausgabe bookings whose account is 4xxx
                  const matched = accounts.filter((a) => a.categoryCode === '4')
                    .map((a) => ({ label: formatAccount(a), v: byDebit[formatAccount(a)] ?? 0 }))
                    .filter((x) => x.v !== 0);
                  if (matched.length > 0) {
                    return matched.map(({ label, v }) => <AccountRow key={label} label={label} value={v} cur={cur} />);
                  }
                  // Fallback: group Ausgabe bookings with 4xxx account
                  const groups = bookings
                    .filter((b) => b.type === 'Ausgabe' && b.account.startsWith('4'))
                    .reduce<Record<string, number>>((acc, b) => { acc[b.account] = (acc[b.account] ?? 0) + b.amount; return acc; }, {});
                  return Object.entries(groups).filter(([, v]) => v !== 0)
                    .map(([label, value]) => <AccountRow key={label} label={label} value={value} cur={cur} />);
                })()}
              </Section>
            </>
          )}
          <div className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold rounded-lg border mt-1 ${
            bruttogewinnI >= 0 ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800'
          }`}>
            <span className="min-w-0 flex-1">Bruttogewinn I</span>
            <span className="tabular-nums shrink-0">{fmt(bruttogewinnI, cur)}</span>
          </div>

          {/* Personalaufwand (5xxx) */}
          {personalaufwand > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 pt-3">Personalaufwand</p>
              <Section title={categoryLabel('5')} total={personalaufwand} cur={cur}>
                {(() => {
                  const matched = accounts.filter((a) => a.categoryCode === '5')
                    .map((a) => ({ label: formatAccount(a), v: byDebit[formatAccount(a)] ?? 0 }))
                    .filter((x) => x.v !== 0);
                  if (matched.length > 0)
                    return matched.map(({ label, v }) => <AccountRow key={label} label={label} value={v} cur={cur} />);
                  const groups = bookings
                    .filter((b) => b.type === 'Ausgabe' && b.account.startsWith('5'))
                    .reduce<Record<string, number>>((acc, b) => { acc[b.account] = (acc[b.account] ?? 0) + b.amount; return acc; }, {});
                  return Object.entries(groups).filter(([, v]) => v !== 0)
                    .map(([label, value]) => <AccountRow key={label} label={label} value={value} cur={cur} />);
                })()}
              </Section>
            </>
          )}
          {personalaufwand > 0 && (
            <div className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-bold rounded-lg border mt-1 ${
              bruttogewinnII >= 0 ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-rose-100 bg-rose-50 text-rose-800'
            }`}>
              <span className="min-w-0 flex-1">Bruttogewinn II</span>
              <span className="tabular-nums shrink-0">{fmt(bruttogewinnII, cur)}</span>
            </div>
          )}

          {/* Übriger betrieblicher Aufwand (6xxx) */}
          {uebrBetriebsaufwand > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 pt-3">Übriger betrieblicher Aufwand</p>
              <Section title={categoryLabel('6')} total={uebrBetriebsaufwand} cur={cur}>
                {(() => {
                  const matched = accounts.filter((a) => a.categoryCode === '6')
                    .map((a) => ({ label: formatAccount(a), v: byDebit[formatAccount(a)] ?? 0 }))
                    .filter((x) => x.v !== 0);
                  if (matched.length > 0)
                    return matched.map(({ label, v }) => <AccountRow key={label} label={label} value={v} cur={cur} />);
                  const groups = bookings
                    .filter((b) => b.type === 'Ausgabe' && b.account.startsWith('6'))
                    .reduce<Record<string, number>>((acc, b) => { acc[b.account] = (acc[b.account] ?? 0) + b.amount; return acc; }, {});
                  return Object.entries(groups).filter(([, v]) => v !== 0)
                    .map(([label, value]) => <AccountRow key={label} label={label} value={value} cur={cur} />);
                })()}
              </Section>
            </>
          )}

          {/* EBIT */}
          <div className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 mt-2 ${
            ebit >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            <span className="min-w-0 flex-1">Betriebsergebnis (EBIT)</span>
            <span className="tabular-nums shrink-0">{fmt(ebit, cur)}</span>
          </div>

          {/* Betrieblicher Nebenerfolg (7xxx) */}
          {hasAny7 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 pt-3">Betrieblicher Nebenerfolg</p>
              <NettoSection title={categoryLabel('7')} netto={netto7} cur={cur}>
                {cat7.map((a) => {
                  const fk = formatAccount(a);
                  const isErt = isErtragByName(a.name);
                  const v = isErt ? (byCredit[fk] ?? 0) : (byDebit[fk] ?? 0);
                  return v !== 0 ? <AccountRow key={a.code} label={fk} value={v} cur={cur} tag={isErt ? 'Ert' : 'Aufw'} /> : null;
                })}
              </NettoSection>
              <SubtotalRow label="Ergebnis nach Nebenbetrieb" value={ergebnisVorAusserord} cur={cur} />
            </>
          )}

          {/* Betriebsfremder/ausserordentlicher Erfolg (8xxx excl. 8900) */}
          {hasAny8 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 pt-3">Betriebsfremder Erfolg</p>
              <NettoSection title="Betriebsfremder / ausserordentlicher Erfolg" netto={netto8} cur={cur}>
                {cat8noTax.map((a) => {
                  const fk = formatAccount(a);
                  const isErt = isErtragByName(a.name);
                  const v = isErt ? (byCredit[fk] ?? 0) : (byDebit[fk] ?? 0);
                  return v !== 0 ? <AccountRow key={a.code} label={fk} value={v} cur={cur} tag={isErt ? 'Ert' : 'Aufw'} /> : null;
                })}
              </NettoSection>
              <SubtotalRow label="Ergebnis vor Steuern" value={ergebnisVorSteuern} cur={cur} />
            </>
          )}

          {/* Direkte Steuern (8900) */}
          {steuern > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 pt-3">Direkte Steuern</p>
              <Section title="8900 Direkte Steuern" total={steuern} cur={cur} />
            </>
          )}

          {/* Jahresergebnis */}
          <div className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 mt-3 ${
            jahresergebnis >= 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            <span className="min-w-0 flex-1">Jahresergebnis</span>
            <span className="tabular-nums shrink-0">{fmt(jahresergebnis, cur)}</span>
          </div>
        </div>
      )}

      {/* ── Bilanz (Slide 12) ── */}
      {tab === 'bilanz' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Bilanz</h3>

          {/* Aktiven */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1">Aktiven</p>
          {BILANZ_GROUPS.aktiv.map(({ label, min, max }) => {
            const grpTotal = sumGroup(min, max, 'debit');
            if (grpTotal === 0) return null;
            return (
              <Section key={label} title={label} total={grpTotal} cur={cur} positive>
                {accountsInGroup(min, max).map((a) => {
                  const v = byDebit[formatAccount(a)] ?? 0;
                  return v !== 0 ? <AccountRow key={a.code} label={formatAccount(a)} value={v} cur={cur} /> : null;
                })}
              </Section>
            );
          })}
          <div className="flex items-center justify-between gap-2 px-4 py-2 text-sm font-bold text-emerald-700 border-t-2 border-emerald-200 mt-1">
            <span className="min-w-0 flex-1">Total Aktiven</span>
            <span className="tabular-nums shrink-0">{fmt(totalAktiv, cur)}</span>
          </div>

          {/* Passiven */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 mt-5">Passiven</p>
          {BILANZ_GROUPS.passiv.map(({ label, min, max }) => {
            const grpTotal = sumGroup(min, max, 'credit');
            if (grpTotal === 0) return null;
            return (
              <Section key={label} title={label} total={grpTotal} cur={cur}>
                {accountsInGroup(min, max).map((a) => {
                  const v = byCredit[formatAccount(a)] ?? 0;
                  return v !== 0 ? <AccountRow key={a.code} label={formatAccount(a)} value={v} cur={cur} /> : null;
                })}
              </Section>
            );
          })}
          <div className="flex items-center justify-between gap-2 px-4 py-2 text-sm font-bold text-slate-700 border-t-2 border-slate-200 mt-1">
            <span className="min-w-0 flex-1">Total Passiven</span>
            <span className="tabular-nums shrink-0">{fmt(totalPassiv, cur)}</span>
          </div>
        </div>
      )}

      {/* ── MwSt-Übersicht ── */}
      {tab === 'mwst' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900">MwSt-Übersicht</h3>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[
              { label: 'Geschuldete MwSt (Ertrag)', value: geschuldeteMwst, color: 'text-rose-600' },
              { label: 'Vorsteuer (Aufwand)',        value: vorsteuer,       color: 'text-emerald-600' },
              { label: 'MwSt-Saldo (schulde ich)',   value: mwstSaldo,       color: mwstSaldo >= 0 ? 'text-rose-700' : 'text-emerald-700' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${c.color}`}>{fmt(c.value, cur)}</p>
              </div>
            ))}
          </div>
          {mwstRows.length === 0 ? (
            <p className="text-sm text-slate-400">Noch keine Buchungen mit MwSt-Betrag vorhanden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Datum</th>
                    <th className="px-3 py-2">Beschreibung</th>
                    <th className="px-3 py-2">Konto</th>
                    <th className="px-3 py-2 text-right">Satz</th>
                    <th className="px-3 py-2 text-right">MwSt-Betrag</th>
                    <th className="px-3 py-2">Typ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mwstRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2 text-slate-800">{r.description}</td>
                      <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate">{r.account}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.rate}%</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">{fmt(r.vatAmount, r.currency)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.type === 'Einnahme' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>{r.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* ── Steuern (Provisorisch) ── */}
      {tab === 'steuern' && (
        <div className="space-y-5">

          {/* Disclaimer */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Provisorische Schätzung – nicht verbindlich.</strong>{' '}
              Die angezeigten Steuerbeträge basieren auf aktuellen Durchschnittssätzen (Steuerjahr {new Date().getFullYear()}).
              Massgebend sind die offiziellen Steuerveranlagungen der zuständigen Behörden.
              Bitte konsultiere eine Steuerfachperson.
            </p>
          </div>

          {/* A. MwSt-Abrechnung */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">A. MwSt-Abrechnung (ESTV)</h3>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {[
                { label: 'Steuerbarer Umsatz', value: totalBetriebsertrag, color: 'text-slate-800' },
                { label: 'Geschuldete MwSt',   value: geschuldeteMwst,     color: 'text-rose-600' },
                { label: 'Vorsteuer',           value: vorsteuer,           color: 'text-emerald-600' },
                {
                  label: mwstSaldo >= 0 ? 'Zahllast (schulde ich)' : 'Guthaben (bekomme ich)',
                  value: Math.abs(mwstSaldo),
                  color: mwstSaldo >= 0 ? 'text-rose-700' : 'text-emerald-700',
                },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">{c.label}</p>
                  <p className={`mt-1 text-lg font-bold tabular-nums ${c.color}`}>{fmt(c.value, cur)}</p>
                </div>
              ))}
            </div>
            {mwstSaldo > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Tipp: Buche die Zahllast als{' '}
                <span className="font-mono bg-slate-100 px-1 rounded">2200 Geschuldete MwSt → 1020 Bank</span>
              </p>
            )}
            {mwstRows.length === 0 && (
              <p className="mt-3 text-sm text-slate-400">Noch keine Buchungen mit MwSt-Betrag vorhanden.</p>
            )}
          </div>

          {/* B. Direkte Steuern */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-slate-900">B. Direkte Steuern (provisorisch)</h3>
              <div className="flex items-center gap-2">
                <label htmlFor="canton-select" className="text-xs text-slate-500">Kanton:</label>
                <select
                  id="canton-select"
                  value={canton}
                  onChange={(e) => setCanton(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {CANTON_RATES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} – {c.name} (~{c.rate}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {taxBase === 0 ? (
              <p className="text-sm text-slate-400">
                Kein steuerbarer Gewinn vorhanden – keine direkte Steuer geschätzt.
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                  <div className="flex justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-800">
                    <span>Steuerbarer Gewinn (vor direkten Steuern)</span>
                    <span className="tabular-nums">{fmt(taxBase, cur)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 text-sm text-slate-600">
                    <span>Direkte Bundessteuer (DBst ~{FEDERAL_RATE}%)</span>
                    <span className="tabular-nums">{fmt(federalTax, cur)}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3 text-sm text-slate-600">
                    <span>Kantons- und Gemeindesteuer {selectedCanton.code} (~{cantonRate.toFixed(1)}%)</span>
                    <span className="tabular-nums">{fmt(cantonTax, cur)}</span>
                  </div>
                </div>
                <div className="flex justify-between px-4 py-3 rounded-xl text-sm font-bold border-2 border-rose-100 bg-rose-50 text-rose-800">
                  <span>Geschätzte Gesamtsteuer ({selectedCanton.rate.toFixed(1)}%)</span>
                  <span className="tabular-nums">{fmt(totalTax, cur)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Tipp: Buche die geschätzte Steuer als{' '}
                  <span className="font-mono bg-slate-100 px-1 rounded">8900 Direkte Steuern / 2000 Kreditoren</span>.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bilanz;
