import { useState } from 'react';
import { jsPDF } from 'jspdf';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import { accountCategories, accounts, formatAccount } from '../data/chAccounts';

const fmt = (value: number, cur: string) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: cur }).format(value);

// ── Category classification ────────────────────────────────────────────────
// Bilanz:       1 = Aktiven, 2 = Passiven
// Erfolgsrechnung: 3 = Ertrag, 4/5/6/7/8 = Aufwand (Ergebnis = Ertrag − Aufwand)
const AKTIV_CATS = ['1'];
const PASSIV_CATS = ['2'];
const ERTRAG_CATS = ['3'];
const AUFWAND_CATS = ['4', '5', '6', '7', '8'];

const categoryLabel = (code: string) =>
  accountCategories.find((c) => c.code === code)?.name ?? code;

// ── Expandable section row ─────────────────────────────────────────────────
const Section = ({
  title,
  total,
  cur,
  positive,
  children,
}: {
  title: string;
  total: number;
  cur: string;
  positive?: boolean;
  children?: React.ReactNode;
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
        </span>
        <span className={`tabular-nums font-semibold ${
          positive === undefined
            ? 'text-slate-900'
            : positive
              ? 'text-emerald-600'
              : 'text-rose-600'
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

const AccountRow = ({ label, value, cur }: { label: string; value: number; cur: string }) => (
  <div className="flex items-center justify-between px-8 py-2 text-xs text-slate-600">
    <span>{label}</span>
    <span className="tabular-nums font-medium text-slate-800">{fmt(value, cur)}</span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────
const Bilanz = () => {
  const { bookings } = useBookkeeping();
  const [tab, setTab] = useState<'erfolg' | 'bilanz'>('erfolg');
  const cur = bookings[0]?.currency ?? 'CHF';

  // Sum by account code (e.g. '4400 Aufwand...' → total)
  const byAccount = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.account] = (acc[b.account] ?? 0) + b.amount;
    return acc;
  }, {});

  // Sum by category code
  const byCat = accounts.reduce<Record<string, number>>((acc, acct) => {
    acc[acct.categoryCode] = (acc[acct.categoryCode] ?? 0) + (byAccount[formatAccount(acct)] ?? 0);
    return acc;
  }, {});

  const totalErtrag = ERTRAG_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);
  const totalAufwand = AUFWAND_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);
  const jahresergebnis = totalErtrag - totalAufwand;

  const totalAktiv = AKTIV_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);
  const totalPassiv = PASSIV_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);

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

    const section = (title: string, offset = 6) => {
      if (y > pH - 20) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.setTextColor(30);
      doc.text(title, mX, y);
      doc.setDrawColor(220); doc.line(mX, y + 1, pW - mX, y + 1);
      doc.setTextColor(0); y += offset;
    };

    const row = (label: string, val: number) => {
      if (y > pH - 20) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.text(label, mX + 4, y);
      doc.text(fmt(val, cur), pW - mX - 35, y); y += 5.5;
    };

    section('Erfolgsrechnung');
    ERTRAG_CATS.forEach((cat) => {
      doc.setFontSize(10); doc.setTextColor(40);
      doc.text(categoryLabel(cat), mX, y); y += 5;
      doc.setTextColor(0);
      accounts.filter((a) => a.categoryCode === cat && (byAccount[formatAccount(a)] ?? 0) !== 0)
        .forEach((a) => row(formatAccount(a), byAccount[formatAccount(a)]));
    });
    AUFWAND_CATS.forEach((cat) => {
      doc.setFontSize(10); doc.setTextColor(40);
      doc.text(categoryLabel(cat), mX, y); y += 5;
      doc.setTextColor(0);
      accounts.filter((a) => a.categoryCode === cat && (byAccount[formatAccount(a)] ?? 0) !== 0)
        .forEach((a) => row(formatAccount(a), byAccount[formatAccount(a)]));
    });
    doc.setFontSize(11);
    doc.text('Jahresergebnis', mX, y);
    doc.text(fmt(jahresergebnis, cur), pW - mX - 35, y); y += 10;

    section('Bilanz – Aktiven');
    accounts.filter((a) => AKTIV_CATS.includes(a.categoryCode) && (byAccount[formatAccount(a)] ?? 0) !== 0)
      .forEach((a) => row(formatAccount(a), byAccount[formatAccount(a)]));
    section('Bilanz – Passiven');
    accounts.filter((a) => PASSIV_CATS.includes(a.categoryCode) && (byAccount[formatAccount(a)] ?? 0) !== 0)
      .forEach((a) => row(formatAccount(a), byAccount[formatAccount(a)]));

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('Bookitty · Finanzbuchhaltung', mX, pH - 10);
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
          { label: 'Betriebsertrag', value: totalErtrag, color: 'text-emerald-600' },
          { label: 'Betriebsaufwand', value: totalAufwand, color: 'text-rose-600' },
          { label: 'Jahresergebnis', value: jahresergebnis, color: jahresergebnis >= 0 ? 'text-emerald-600' : 'text-rose-600' },
          { label: 'Aktiven / Passiven', value: totalAktiv, color: 'text-slate-700', sub: fmt(totalPassiv, cur) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`mt-2 text-xl font-bold tabular-nums ${card.color}`}>{fmt(card.value, cur)}</p>
            {card.sub && <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {([['erfolg', 'Erfolgsrechnung'], ['bilanz', 'Bilanz']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
              tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Erfolgsrechnung ── */}
      {tab === 'erfolg' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Erfolgsrechnung</h3>

          {/* Ertrag */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1">Ertrag</p>
          {ERTRAG_CATS.map((cat) => {
            const total = byCat[cat] ?? 0;
            const accts = accounts.filter((a) => a.categoryCode === cat);
            return (
              <Section key={cat} title={categoryLabel(cat)} total={total} cur={cur} positive>
                {accts.map((a) => {
                  const v = byAccount[formatAccount(a)] ?? 0;
                  return v !== 0 ? <AccountRow key={a.code} label={formatAccount(a)} value={v} cur={cur} /> : null;
                })}
              </Section>
            );
          })}
          <div className="flex justify-between px-4 py-2 text-sm font-semibold text-emerald-700 border-t border-slate-200 mt-1">
            <span>Total Ertrag</span>
            <span className="tabular-nums">{fmt(totalErtrag, cur)}</span>
          </div>

          {/* Aufwand */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 mt-4">Aufwand</p>
          {AUFWAND_CATS.map((cat) => {
            const total = byCat[cat] ?? 0;
            if (total === 0) return null;
            const accts = accounts.filter((a) => a.categoryCode === cat);
            return (
              <Section key={cat} title={categoryLabel(cat)} total={total} cur={cur}>
                {accts.map((a) => {
                  const v = byAccount[formatAccount(a)] ?? 0;
                  return v !== 0 ? <AccountRow key={a.code} label={formatAccount(a)} value={v} cur={cur} /> : null;
                })}
              </Section>
            );
          })}
          <div className="flex justify-between px-4 py-2 text-sm font-semibold text-rose-700 border-t border-slate-200">
            <span>Total Aufwand</span>
            <span className="tabular-nums">{fmt(totalAufwand, cur)}</span>
          </div>

          {/* Jahresergebnis */}
          <div className={`flex justify-between px-4 py-3 rounded-xl text-sm font-bold border-2 mt-2 ${
            jahresergebnis >= 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            <span>Jahresergebnis</span>
            <span className="tabular-nums">{fmt(jahresergebnis, cur)}</span>
          </div>
        </div>
      )}

      {/* ── Bilanz ── */}
      {tab === 'bilanz' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-2">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Bilanz</h3>

          {/* Aktiven */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1">Aktiven</p>
          {AKTIV_CATS.map((cat) => {
            const accts = accounts.filter((a) => a.categoryCode === cat);
            return (
              <Section key={cat} title={categoryLabel(cat)} total={byCat[cat] ?? 0} cur={cur} positive>
                {accts.map((a) => {
                  const v = byAccount[formatAccount(a)] ?? 0;
                  return v !== 0 ? <AccountRow key={a.code} label={formatAccount(a)} value={v} cur={cur} /> : null;
                })}
              </Section>
            );
          })}
          <div className="flex justify-between px-4 py-2 text-sm font-semibold text-emerald-700 border-t border-slate-200">
            <span>Total Aktiven</span>
            <span className="tabular-nums">{fmt(totalAktiv, cur)}</span>
          </div>

          {/* Passiven */}
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 px-1 mt-4">Passiven</p>
          {PASSIV_CATS.map((cat) => {
            const accts = accounts.filter((a) => a.categoryCode === cat);
            return (
              <Section key={cat} title={categoryLabel(cat)} total={byCat[cat] ?? 0} cur={cur}>
                {accts.map((a) => {
                  const v = byAccount[formatAccount(a)] ?? 0;
                  return v !== 0 ? <AccountRow key={a.code} label={formatAccount(a)} value={v} cur={cur} /> : null;
                })}
              </Section>
            );
          })}
          <div className="flex justify-between px-4 py-2 text-sm font-semibold text-slate-700 border-t border-slate-200">
            <span>Total Passiven</span>
            <span className="tabular-nums">{fmt(totalPassiv, cur)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bilanz;
