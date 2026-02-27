import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import SectionHeader from '../components/SectionHeader';

// ── Swiss payroll rates 2025 ─────────────────────────────────────────────────
const RATES = {
  ahvIvEoAN: 5.3,  // % Arbeitnehmer (AHV 4.35% + IV 0.70% + EO 0.25%)
  ahvIvEoAG: 5.3,  // % Arbeitgeber
  alvAN:     1.1,  // % AN (auf max. 12'350/Mt.)
  alvAG:     1.1,  // % AG
  fakAG:     2.0,  // % AG – Familienzulagen (kantonaler Richtwert)
  buvAG:     0.5,  // % AG – Berufsunfall (je nach Branche)
};
const ALV_MAX_MONTHLY = 12_350; // CHF – versicherter Max.-Lohn/Mt.

type Employee = {
  id: string;
  name: string;
  role: string;
  grossSalary: number;
  ahvNr: string;
  startDate: string;
  nbuv: number;    // % AN – Nichtberufsunfallversicherung
  bvgAN: number;   // % AN – BVG/Pensionskasse
  bvgAG: number;   // % AG – BVG/Pensionskasse
  kkAbzug: number; // CHF/Mt. – KK-Prämienanteil AN
};

const STORE_KEY = 'bookitty.employees';
const loadEmployees = (): Employee[] => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'); }
  catch { return []; }
};
const saveEmployees = (list: Employee[]) =>
  localStorage.setItem(STORE_KEY, JSON.stringify(list));

const newId = () => crypto.randomUUID();

const fmt = (v: number) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(v);

const pct = (base: number, rate: number) =>
  Math.round(base * rate / 100 * 100) / 100;

const calcDeductions = (emp: Employee) => {
  const gross       = emp.grossSalary;
  const ahvIvEoAN   = pct(gross, RATES.ahvIvEoAN);
  const alvBase     = Math.min(gross, ALV_MAX_MONTHLY);
  const alvAN       = pct(alvBase, RATES.alvAN);
  const nbuv        = pct(gross, emp.nbuv);
  const bvgAN       = pct(gross, emp.bvgAN);
  const kk          = emp.kkAbzug;
  const totalAN     = ahvIvEoAN + alvAN + nbuv + bvgAN + kk;
  const net         = gross - totalAN;
  // Arbeitgeber
  const ahvIvEoAG   = pct(gross, RATES.ahvIvEoAG);
  const alvAG       = pct(alvBase, RATES.alvAG);
  const fakAG       = pct(gross, RATES.fakAG);
  const buvAG       = pct(gross, RATES.buvAG);
  const bvgAG       = pct(gross, emp.bvgAG);
  const totalAG     = ahvIvEoAG + alvAG + fakAG + buvAG + bvgAG;
  const totalCost   = gross + totalAG;
  return { gross, ahvIvEoAN, alvAN, nbuv, bvgAN, kk, totalAN, net, ahvIvEoAG, alvAG, fakAG, buvAG, bvgAG, totalAG, totalCost };
};

const emptyEmp: Omit<Employee, 'id'> = {
  name: '', role: '', grossSalary: 5000, ahvNr: '',
  startDate: new Date().toISOString().split('T')[0],
  nbuv: 0.7, bvgAN: 3.0, bvgAG: 3.0, kkAbzug: 0,
};

// Last 12 months as YYYY-MM strings
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});

const Lohn = () => {
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [tab, setTab] = useState<'mitarbeiter' | 'abrechnung' | 'lohnausweis'>('mitarbeiter');
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Partial<Employee>>({});
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');

  useEffect(() => { saveEmployees(employees); }, [employees]);

  // Keep selected employee in sync
  useEffect(() => {
    if (!selectedEmpId && employees.length > 0) setSelectedEmpId(employees[0].id);
  }, [employees, selectedEmpId]);

  const openAdd = () => { setEditEmp({ ...emptyEmp }); setModalOpen(true); };
  const openEdit = (emp: Employee) => { setEditEmp({ ...emp }); setModalOpen(true); };

  const saveEmployee = () => {
    if (!editEmp.name?.trim() || !editEmp.role?.trim()) return;
    if (editEmp.id) {
      setEmployees((prev) => prev.map((e) => e.id === editEmp.id ? (editEmp as Employee) : e));
    } else {
      const created = { ...emptyEmp, ...editEmp, id: newId() } as Employee;
      setEmployees((prev) => [...prev, created]);
      setSelectedEmpId(created.id);
    }
    setModalOpen(false);
    setEditEmp({});
  };

  const removeEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmpId === id) setSelectedEmpId('');
  };

  // Totals
  const totals = employees.reduce(
    (acc, emp) => {
      const d = calcDeductions(emp);
      return { gross: acc.gross + d.gross, net: acc.net + d.net, totalAN: acc.totalAN + d.totalAN, totalAG: acc.totalAG + d.totalAG, totalCost: acc.totalCost + d.totalCost };
    },
    { gross: 0, net: 0, totalAN: 0, totalAG: 0, totalCost: 0 },
  );

  // Employer totals per SV category
  const agTotals = employees.reduce(
    (acc, emp) => {
      const d = calcDeductions(emp);
      return { ahv: acc.ahv + d.ahvIvEoAG, alv: acc.alv + d.alvAG, fak: acc.fak + d.fakAG, buv: acc.buv + d.buvAG, bvg: acc.bvg + d.bvgAG };
    },
    { ahv: 0, alv: 0, fak: 0, buv: 0, bvg: 0 },
  );

  // PDF: Monatsabrechnung
  const exportPayrollPdf = () => {
    const doc = new jsPDF();
    const mX = 14;
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    let y = 20;
    doc.setFontSize(16); doc.text(`Bookitty – Lohnabrechnung ${selectedMonth}`, mX, y); y += 8;
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text(`Erstellt am ${new Date().toLocaleDateString('de-CH')} · Alle Beträge in CHF`, mX, y); y += 10;
    doc.setTextColor(0);

    employees.forEach((emp) => {
      if (y > 240) { doc.addPage(); y = 20; }
      const d = calcDeductions(emp);
      doc.setFontSize(11); doc.setTextColor(30);
      doc.text(`${emp.name} – ${emp.role}`, mX, y); y += 6;
      if (emp.ahvNr) { doc.setFontSize(8); doc.setTextColor(120); doc.text(`AHV-Nr.: ${emp.ahvNr}`, mX + 4, y); y += 5; }
      doc.setFontSize(8); doc.setTextColor(0);
      const rows: [string, number][] = [
        ['Bruttolohn', d.gross],
        [`AHV/IV/EO AN (${RATES.ahvIvEoAN}%)`, -d.ahvIvEoAN],
        [`ALV AN (${RATES.alvAN}%)`, -d.alvAN],
        [`NBUV AN (${emp.nbuv}%)`, -d.nbuv],
        ...(d.bvgAN > 0 ? [[`BVG/PK AN (${emp.bvgAN}%)`, -d.bvgAN] as [string, number]] : []),
        ...(d.kk > 0 ? [['KK-Prämienanteil', -d.kk] as [string, number]] : []),
      ];
      rows.forEach(([label, val]) => {
        doc.text(label, mX + 4, y);
        doc.text(fmt(val), pW - mX - 30, y, { align: 'right' }); y += 5;
      });
      doc.setFontSize(9); doc.setTextColor(20);
      doc.text('Nettolohn', mX, y); doc.text(fmt(d.net), pW - mX - 30, y, { align: 'right' }); y += 10;
      doc.setTextColor(0);
    });

    // AG costs summary
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setTextColor(60);
    doc.text('Arbeitgeberbeiträge', mX, y);
    doc.setDrawColor(200); doc.line(mX, y + 1, pW - mX, y + 1); y += 7;
    doc.setFontSize(8); doc.setTextColor(0);
    [
      [`AHV/IV/EO AG (${RATES.ahvIvEoAG}%)`, agTotals.ahv],
      [`ALV AG (${RATES.alvAG}%)`, agTotals.alv],
      [`FAK (~${RATES.fakAG}%)`, agTotals.fak],
      [`BUV (~${RATES.buvAG}%)`, agTotals.buv],
      ['BVG/PK AG', agTotals.bvg],
    ].forEach(([l, v]) => {
      doc.text(String(l), mX + 4, y); doc.text(fmt(v as number), pW - mX - 30, y, { align: 'right' }); y += 5;
    });
    doc.setFontSize(9); doc.setTextColor(20);
    doc.text('Gesamtlohnkosten AG', mX, y); doc.text(fmt(totals.totalCost), pW - mX - 30, y, { align: 'right' }); y += 8;

    doc.setFontSize(7); doc.setTextColor(160);
    doc.text('Bookitty · Lohnbuchhaltung · Provisorische Berechnung – nicht verbindlich', mX, pH - 10);
    doc.save(`lohnabrechnung-${selectedMonth}.pdf`);
  };

  const selectedEmp = employees.find((e) => e.id === selectedEmpId) ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Lohnbuchhaltung"
        subtitle="Mitarbeiter erfassen, Löhne berechnen, Lohnausweise erstellen."
        action={
          <button type="button" onClick={exportPayrollPdf} disabled={employees.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
            PDF Lohnliste
          </button>
        }
      />

      {/* ── KPI row ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Mitarbeiter', value: employees.length.toString(), sub: 'erfasst' },
          { label: 'Gesamtbruttolohn', value: employees.length ? fmt(totals.gross) : '—', sub: 'pro Monat' },
          { label: 'Gesamtnettolohn', value: employees.length ? fmt(totals.net) : '—', sub: 'pro Monat' },
          { label: 'AG-Gesamtkosten', value: employees.length ? fmt(totals.totalCost) : '—', sub: 'inkl. SV-Beiträge' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">{card.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-max">
          {([['mitarbeiter', 'Mitarbeiter'], ['abrechnung', 'Monatsabrechnung'], ['lohnausweis', 'Lohnausweis']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* ── Tab: Mitarbeiter ── */}
      {tab === 'mitarbeiter' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Mitarbeiter</h3>
            <button type="button" onClick={openAdd}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
              + Mitarbeiter
            </button>
          </div>
          {employees.length === 0 ? (
            <p className="text-sm text-slate-400">Noch keine Mitarbeiter erfasst. Klicke auf «+ Mitarbeiter», um zu beginnen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Funktion</th>
                    <th className="px-3 py-2 text-right">Brutto/Mt.</th>
                    <th className="px-3 py-2 text-right">Netto/Mt.</th>
                    <th className="px-3 py-2 text-right">AG-Kosten/Mt.</th>
                    <th className="px-3 py-2">Eintritt</th>
                    <th className="px-3 py-2">AHV-Nr.</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const d = calcDeductions(emp);
                    return (
                      <tr key={emp.id} className="group hover:bg-slate-50">
                        <td className="px-3 py-3 font-medium text-slate-900">{emp.name}</td>
                        <td className="px-3 py-3 text-slate-500">{emp.role}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmt(d.gross)}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-700">{fmt(d.net)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500">{fmt(d.totalCost)}</td>
                        <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{emp.startDate}</td>
                        <td className="px-3 py-3 text-slate-400 font-mono text-xs">{emp.ahvNr || '—'}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => openEdit(emp)}
                              className="text-xs text-slate-500 hover:text-slate-800">Bearbeiten</button>
                            <button type="button" onClick={() => removeEmployee(emp.id)}
                              className="text-xs text-rose-400 hover:text-rose-600">Entfernen</button>
                          </div>
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

      {/* ── Tab: Monatsabrechnung ── */}
      {tab === 'abrechnung' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">Monatsabrechnung</h3>
            <div className="flex items-center gap-3">
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300">
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button type="button" onClick={exportPayrollPdf} disabled={employees.length === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                PDF ↓
              </button>
            </div>
          </div>

          {employees.length === 0 ? (
            <p className="text-sm text-slate-400">Noch keine Mitarbeiter erfasst.</p>
          ) : (
            <>
              {/* Arbeitnehmer-Abzüge */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Mitarbeiter</th>
                      <th className="px-3 py-2 text-right">Brutto</th>
                      <th className="px-3 py-2 text-right">AHV/IV/EO</th>
                      <th className="px-3 py-2 text-right">ALV</th>
                      <th className="px-3 py-2 text-right">NBUV</th>
                      <th className="px-3 py-2 text-right">BVG/PK</th>
                      <th className="px-3 py-2 text-right">KK</th>
                      <th className="px-3 py-2 text-right">Total Abzüge AN</th>
                      <th className="px-3 py-2 text-right text-emerald-700 font-bold">Netto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => {
                      const d = calcDeductions(emp);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-900">{emp.name}</p>
                            <p className="text-slate-400">{emp.role}</p>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{fmt(d.gross)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-600">−{fmt(d.ahvIvEoAN)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-600">−{fmt(d.alvAN)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-600">−{fmt(d.nbuv)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-600">
                            {d.bvgAN > 0 ? `−${fmt(d.bvgAN)}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-rose-600">
                            {d.kk > 0 ? `−${fmt(d.kk)}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium text-rose-700">−{fmt(d.totalAN)}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-700">{fmt(d.net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold">
                    <tr>
                      <td className="px-3 py-3 text-slate-700">Total</td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmt(totals.gross)}</td>
                      <td colSpan={5} />
                      <td className="px-3 py-3 text-right tabular-nums text-rose-700">−{fmt(totals.totalAN)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{fmt(totals.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Arbeitgeberbeiträge */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Arbeitgeberbeiträge – {selectedMonth}
                </p>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-5 text-xs">
                  {[
                    { label: `AHV/IV/EO AG (${RATES.ahvIvEoAG}%)`, value: agTotals.ahv },
                    { label: `ALV AG (${RATES.alvAG}%)`,            value: agTotals.alv },
                    { label: `FAK (~${RATES.fakAG}%)`,              value: agTotals.fak },
                    { label: `BUV (~${RATES.buvAG}%)`,              value: agTotals.buv },
                    { label: 'BVG/PK AG',                           value: agTotals.bvg },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-white border border-slate-100 px-3 py-2">
                      <p className="text-slate-500">{item.label}</p>
                      <p className="font-semibold text-slate-800 tabular-nums">{fmt(item.value)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1 text-sm font-bold text-slate-900 border-t border-slate-200">
                  <span>Gesamtlohnkosten Arbeitgeber</span>
                  <span className="tabular-nums">{fmt(totals.totalCost)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Sätze 2025 — AHV/IV/EO: {RATES.ahvIvEoAN}% AN / {RATES.ahvIvEoAG}% AG · ALV: {RATES.alvAN}% AN / {RATES.alvAG}% AG ·
                FAK: ~{RATES.fakAG}% · BUV: ~{RATES.buvAG}%. Provisorisch — bitte Treuhandbüro bestätigen.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Lohnausweis ── */}
      {tab === 'lohnausweis' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">Lohnausweis</h3>
            <div className="flex items-center gap-3">
              <select value={selectedEmpId} onChange={(e) => setSelectedEmpId(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300">
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300">
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {!selectedEmp ? (
            <p className="text-sm text-slate-400">Bitte zuerst einen Mitarbeiter im Tab «Mitarbeiter» erfassen.</p>
          ) : (() => {
            const d = calcDeductions(selectedEmp);
            const [year, month] = selectedMonth.split('-');
            return (
              <div className="rounded-xl border border-slate-200 overflow-hidden max-w-md">
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">Lohnausweis</p>
                    <p className="text-slate-300 text-sm">{month} / {year}</p>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p className="font-semibold text-white">{selectedEmp.name}</p>
                    <p>{selectedEmp.role}</p>
                    {selectedEmp.ahvNr && (
                      <p className="font-mono text-xs mt-1 text-slate-400">{selectedEmp.ahvNr}</p>
                    )}
                  </div>
                </div>

                {/* Lines */}
                <div className="divide-y divide-slate-100">
                  <div className="flex justify-between px-6 py-3 bg-emerald-50">
                    <span className="text-sm font-semibold text-slate-700">Bruttolohn</span>
                    <span className="tabular-nums font-bold text-slate-900">{fmt(d.gross)}</span>
                  </div>
                  {([
                    [`AHV/IV/EO AN (${RATES.ahvIvEoAN}%)`, d.ahvIvEoAN],
                    [`ALV AN (${RATES.alvAN}%)`, d.alvAN],
                    [`NBUV AN (${selectedEmp.nbuv}%)`, d.nbuv],
                    ...(d.bvgAN > 0 ? [[`BVG/PK AN (${selectedEmp.bvgAN}%)`, d.bvgAN]] : []),
                    ...(d.kk > 0 ? [['KK-Prämienanteil', d.kk]] : []),
                  ] as [string, number][]).map(([label, value]) => (
                    <div key={label} className="flex justify-between px-6 py-2.5">
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className="tabular-nums text-sm text-rose-600">−{fmt(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-6 py-2.5 bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">Total Abzüge</span>
                    <span className="tabular-nums text-sm font-medium text-rose-700">−{fmt(d.totalAN)}</span>
                  </div>
                  <div className="flex justify-between px-6 py-4 bg-emerald-50">
                    <span className="text-base font-bold text-slate-900">Nettolohn</span>
                    <span className="tabular-nums text-xl font-bold text-emerald-700">{fmt(d.net)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-3 text-xs text-slate-400 flex justify-between">
                  <span>Eintritt: {selectedEmp.startDate}</span>
                  <span>Bookitty · Provisorisch</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Mitarbeiter-Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              {editEmp.id ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter hinzufügen'}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {([
                ['name',      'Name',             'text',   'z.B. Anna Muster'],
                ['role',      'Funktion / Stelle', 'text',   'z.B. Buchhalterin'],
                ['ahvNr',     'AHV-Nr.',           'text',   '756.XXXX.XXXX.XX'],
                ['startDate', 'Eintrittsdatum',    'date',   ''],
              ] as [keyof Employee, string, string, string][]).map(([key, label, type, placeholder]) => (
                <label key={key} className="text-sm text-slate-600">
                  {label}
                  <input
                    type={type}
                    value={String(editEmp[key] ?? '')}
                    onChange={(e) => setEditEmp((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
              ))}

              <label className="text-sm text-slate-600">
                Bruttolohn / Monat (CHF)
                <input type="number" min="0" step="100"
                  value={editEmp.grossSalary ?? 5000}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditEmp((prev) => ({ ...prev, grossSalary: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>

              <label className="text-sm text-slate-600">
                NBUV AN (%)
                <input type="number" min="0" step="0.01"
                  value={editEmp.nbuv ?? 0.7}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditEmp((prev) => ({ ...prev, nbuv: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>

              <label className="text-sm text-slate-600">
                BVG / PK Anteil AN (%)
                <input type="number" min="0" step="0.1"
                  value={editEmp.bvgAN ?? 3}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditEmp((prev) => ({ ...prev, bvgAN: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>

              <label className="text-sm text-slate-600">
                BVG / PK Anteil AG (%)
                <input type="number" min="0" step="0.1"
                  value={editEmp.bvgAG ?? 3}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditEmp((prev) => ({ ...prev, bvgAG: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>

              <label className="text-sm text-slate-600">
                KK-Prämienanteil AN (CHF/Mt.)
                <input type="number" min="0" step="1"
                  value={editEmp.kkAbzug ?? 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setEditEmp((prev) => ({ ...prev, kkAbzug: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
            </div>

            <p className="mt-4 text-xs text-slate-400">
              AHV/IV/EO ({RATES.ahvIvEoAN}%) und ALV ({RATES.alvAN}%) werden automatisch berechnet.
              NBUV, BVG/PK und KK-Abzug sind pro Mitarbeiter konfigurierbar.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setModalOpen(false); setEditEmp({}); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Abbrechen
              </button>
              <button type="button" onClick={saveEmployee}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                {editEmp.id ? 'Speichern' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lohn;
