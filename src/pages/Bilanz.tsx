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
  const [tab, setTab] = useState<'erfolg' | 'bilanz' | 'mwst'>('erfolg');
  const cur = bookings[0]?.currency ?? 'CHF';

  // Soll (Debit) side → Aktiven (1) and Aufwand (4–8)
  const byDebit = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.account] = (acc[b.account] ?? 0) + b.amount;
    return acc;
  }, {});

  // Haben (Credit) side → Passiven (2) and Ertrag (3)
  const byCredit = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.contraAccount] = (acc[b.contraAccount] ?? 0) + b.amount;
    return acc;
  }, {});

  // Keep byAccount as alias for debit side (used in Aufwand/Aktiven renders)
  const byAccount = byDebit;

  // Sum by category: debit-side for Aktiven/Aufwand, credit-side for Passiven/Ertrag
  const DEBIT_CATS = new Set(['1', '4', '5', '6', '7', '8']);
  const byCat = accounts.reduce<Record<string, number>>((acc, acct) => {
    const code = formatAccount(acct);
    const val = DEBIT_CATS.has(acct.categoryCode)
      ? (byDebit[code] ?? 0)
      : (byCredit[code] ?? 0);
    acc[acct.categoryCode] = (acc[acct.categoryCode] ?? 0) + val;
    return acc;
  }, {});

  const totalErtrag = ERTRAG_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);
  const totalAufwand = AUFWAND_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);
  const jahresergebnis = totalErtrag - totalAufwand;

  const totalAktiv = AKTIV_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);
  const totalPassiv = PASSIV_CATS.reduce((s, c) => s + (byCat[c] ?? 0), 0);

  // MwSt: sum vatAmount per booking, split by type
  const mwstRows = bookings
    .filter((b) => (b.vatAmount ?? 0) > 0)
    .map((b) => ({
      date: b.date,
      description: b.description,
      account: b.account,
      rate: b.vatRate,
      vatAmount: b.vatAmount ?? 0,
      type: b.type,
      currency: b.currency,
    }));
  const vorsteuer = mwstRows.filter((r) => r.type === 'Ausgabe').reduce((s, r) => s + r.vatAmount, 0);
  const geschuldeteMwst = mwstRows.filter((r) => r.type === 'Einnahme').reduce((s, r) => s + r.vatAmount, 0);
  const mwstSaldo = geschuldeteMwst - vorsteuer;

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
      accounts.filter((a) => a.categoryCode === cat && (byCredit[formatAccount(a)] ?? 0) !== 0)
        .forEach((a) => row(formatAccount(a), byCredit[formatAccount(a)]));
    });
    AUFWAND_CATS.forEach((cat) => {
      doc.setFontSize(10); doc.setTextColor(40);
      doc.text(categoryLabel(cat), mX, y); y += 5;
      doc.setTextColor(0);
      accounts.filter((a) => a.categoryCode === cat && (byDebit[formatAccount(a)] ?? 0) !== 0)
        .forEach((a) => row(formatAccount(a), byDebit[formatAccount(a)]));
    });
    doc.setFontSize(11);
    doc.text('Jahresergebnis', mX, y);
    doc.text(fmt(jahresergebnis, cur), pW - mX - 35, y); y += 10;

    section('Bilanz – Aktiven');
    accounts.filter((a) => AKTIV_CATS.includes(a.categoryCode) && (byDebit[formatAccount(a)] ?? 0) !== 0)
      .forEach((a) => row(formatAccount(a), byDebit[formatAccount(a)]));
    section('Bilanz – Passiven');
    accounts.filter((a) => PASSIV_CATS.includes(a.categoryCode) && (byCredit[formatAccount(a)] ?? 0) !== 0)
      .forEach((a) => row(formatAccount(a), byCredit[formatAccount(a)]));

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
        {([['erfolg', 'Erfolgsrechnung'], ['bilanz', 'Bilanz'], ['mwst', 'MwSt']] as const).map(([key, label]) => (
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
                  const v = byCredit[formatAccount(a)] ?? 0;
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
                  const v = byCredit[formatAccount(a)] ?? 0;
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
      {/* ── MwSt-Übersicht ── */}
      {tab === 'mwst' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900">MwSt-Übersicht</h3>

          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[
              { label: 'Geschuldete MwSt (Ertrag)', value: geschuldeteMwst, color: 'text-rose-600' },
              { label: 'Vorsteuer (Aufwand)', value: vorsteuer, color: 'text-emerald-600' },
              { label: 'MwSt-Saldo (schulde ich)', value: mwstSaldo, color: mwstSaldo >= 0 ? 'text-rose-700' : 'text-emerald-700' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${c.color}`}>{fmt(c.value, cur)}</p>
              </div>
            ))}
          </div>

          {/* Detail table */}
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
    </div>
  );
};

export default Bilanz;
