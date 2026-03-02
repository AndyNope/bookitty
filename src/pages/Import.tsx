import { useState, useRef, useMemo, useEffect } from 'react';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import { useAccounts } from '../hooks/useAccounts';
import { formatAccount } from '../data/chAccounts';
import {
  detectSeparatorAndHeader,
  detectColumns,
  parseWithColMap,
  parseTextToRows,
  type ParsedRow,
  type ColMap,
} from '../utils/importParser';
import {
  getLearnedMapping,
  saveLearnedMapping,
  learnAccounts,
  getLearnerStats,
  clearLearned,
} from '../utils/importLearner';
import type { BookingDraft } from '../types';
import { extractTextFromFile } from '../utils/documentProcessing';
import * as XLSX from 'xlsx';

const CONTRA = '9200 Jahresgewinn oder -verlust';

const fmt = (v: number) =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(v);

/** Map a parsed row to a BookingDraft that lands in the right Bilanz/Erfolgsrechnung bucket */
const rowToDraft = (code: string, name: string, amount: number, date: string): BookingDraft => {
  const cat = code[0];
  const label = `${code} ${name}`.trim();
  const isAktiv   = cat === '1';
  const isPassiv  = cat === '2';
  const isErtrag  = cat === '3';
  // 4-8: Aufwand

  if (isAktiv) {
    // Debit-side: account = Aktiven konto  →  byDebit picks it up for Bilanz
    return { date, description: `Eröffnungssaldo ${label}`, account: label, contraAccount: CONTRA, amount, type: 'Ausgabe', paymentStatus: 'Bezahlt', currency: 'CHF', vatRate: 0, category: 'Aktiven' };
  }
  if (isPassiv) {
    // Credit-side: contraAccount = Passiven konto  →  byCredit picks it up for Bilanz
    return { date, description: `Eröffnungssaldo ${label}`, account: CONTRA, contraAccount: label, amount, type: 'Einnahme', paymentStatus: 'Bezahlt', currency: 'CHF', vatRate: 0, category: 'Passiven' };
  }
  if (isErtrag) {
    // Einnahme where contraAccount = Ertragskonto  →  grouped correctly in Erfolgsrechnung
    return { date, description: `Eröffnungssaldo ${label}`, account: CONTRA, contraAccount: label, amount, type: 'Einnahme', paymentStatus: 'Bezahlt', currency: 'CHF', vatRate: 0, category: 'Ertrag' };
  }
  // Aufwand (4-8)
  return { date, description: `Eröffnungssaldo ${label}`, account: label, contraAccount: CONTRA, amount, type: 'Ausgabe', paymentStatus: 'Bezahlt', currency: 'CHF', vatRate: 0, category: 'Aufwand' };
};

// ── Manual opening balances tab ────────────────────────────────────────────
const ManualTab = ({ date, onImport }: { date: string; onImport: (drafts: BookingDraft[]) => void }) => {
  const { accounts: mergedAccounts } = useAccounts();
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const CATS = [
    { code: 'all', label: 'Alle' },
    { code: '1', label: '1 – Aktiven' },
    { code: '2', label: '2 – Passiven' },
    { code: '3', label: '3 – Ertrag' },
    { code: '4', label: '4 – Materialaufwand' },
    { code: '5', label: '5 – Personalaufwand' },
    { code: '6', label: '6 – Übriger Aufwand' },
  ];

  const visible = mergedAccounts.filter((a) => {
    if (catFilter !== 'all' && a.categoryCode !== catFilter) return false;
    if (!['1', '2', '3', '4', '5', '6'].includes(a.categoryCode)) return false;
    if (filter && !formatAccount(a).toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const set = (code: string, val: string) =>
    setBalances((p) => ({ ...p, [code]: val }));

  const filled = Object.entries(balances).filter(([, v]) => parseFloat(v.replace(',', '.')) > 0);

  const handleImport = () => {
    const drafts = filled.map(([code, val]) => {
      const acct = mergedAccounts.find((a) => a.code === code);
      const name = acct?.name ?? code;
      const amount = parseFloat(val.replace(',', '.'));
      return rowToDraft(code, name, amount, date);
    });
    onImport(drafts);
    setBalances({});
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Konto suchen…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[160px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
        />
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {CATS.map((c) => (
              <button key={c.code} type="button" onClick={() => setCatFilter(c.code)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
                  catFilter === c.code ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >{c.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Account table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Konto</th>
              <th className="px-4 py-2 text-right w-40">Eröffnungssaldo (CHF)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.slice(0, 80).map((a) => {
              const key = a.code;
              const val = balances[key] ?? '';
              return (
                <tr key={key} className={`${val ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-2 text-slate-700">
                    <span className="font-mono text-slate-400 text-xs mr-2">{a.code}</span>
                    {a.name}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={val}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder="0.00"
                      className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm tabular-nums focus:border-slate-400 focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-400">Keine Konten gefunden.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary + import */}
      {filled.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            {filled.length} Konto{filled.length !== 1 ? 'en' : ''} bereit zum Import
          </p>
          <button
            type="button"
            onClick={handleImport}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {filled.length} Eröffnungsbuchung{filled.length !== 1 ? 'en' : ''} erstellen
          </button>
        </div>
      )}
    </div>
  );
};

// ── CSV import tab ─────────────────────────────────────────────────────────

type FileInfo = {
  sep: string;
  lines: string[];
  headers: string[]; // original case, for display in dropdowns
  hasHeader: boolean;
  learnedSource: { useCount: number } | null;
};

const COL_ROLES: { key: keyof ColMap; label: string }[] = [
  { key: 'codeIdx',    label: 'Konto-Nr.' },
  { key: 'nameIdx',    label: 'Bezeichnung' },
  { key: 'debitIdx',   label: 'Soll' },
  { key: 'creditIdx',  label: 'Haben' },
  { key: 'balanceIdx', label: 'Saldo' },
];

const CsvTab = ({ date, onImport }: { date: string; onImport: (drafts: BookingDraft[], newLearned?: number) => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [colMap, setColMap] = useState<ColMap>({ codeIdx: 0, nameIdx: -1, debitIdx: -1, creditIdx: -1, balanceIdx: -1 });
  const [showColMapping, setShowColMapping] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  // Derive parsed rows reactively whenever fileInfo or colMap changes
  const rows = useMemo(() => {
    if (!fileInfo) return [] as ParsedRow[];
    return parseWithColMap(fileInfo.lines, fileInfo.sep, colMap, fileInfo.hasHeader);
  }, [fileInfo, colMap]);

  // Keep selection in sync with rows (auto-select all on new file/colMap change)
  useEffect(() => {
    setSelected(new Set(rows.map((r) => r.code)));
  }, [rows]);

  // Warn if parsing yields no results after a file is loaded
  useEffect(() => {
    if (fileInfo && rows.length === 0) {
      setError('Keine gültigen Kontozeilen erkannt. Bitte Spalten-Zuordnung prüfen (Konto-Nr. + Soll/Haben oder Saldo benötigt).');
    } else {
      setError('');
    }
  }, [fileInfo, rows.length]);

  const handleFile = async (file: File) => {
    setError('');
    try {
      const ext = file.name.toLowerCase();

      if (/(\.xlsx|\.xls)$/i.test(ext)) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const csvText = XLSX.utils.sheet_to_csv(sheet, { FS: ';' });
        const { sep, lines, headers, hasHeader } = detectSeparatorAndHeader(csvText);
        const learned = getLearnedMapping(headers);
        const detected = learned ? learned.colMap : detectColumns(headers);
        setFileInfo({
          sep, lines, headers, hasHeader,
          learnedSource: learned ? { useCount: learned.useCount } : null,
        });
        setColMap(detected);
        setShowColMapping(!learned);
        return;
      }

      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const { text } = await extractTextFromFile(file);
        const parsed = parseTextToRows(text);
        if (!parsed.length) {
          setError('Keine Konten im Dokument erkannt. Bitte CSV/Excel verwenden oder Textqualität prüfen.');
          return;
        }
        const headers = ['Konto', 'Bezeichnung', 'Saldo'];
        const sep = ';';
        const lines = [headers.join(sep), ...parsed.map((r) => `${r.code}${sep}${r.name}${sep}${r.balance}`)];
        setFileInfo({
          sep,
          lines,
          headers,
          hasHeader: true,
          learnedSource: null,
        });
        setColMap({ codeIdx: 0, nameIdx: 1, debitIdx: -1, creditIdx: -1, balanceIdx: 2 });
        setShowColMapping(false);
        return;
      }

      const text = await file.text();
      const { sep, lines, headers, hasHeader } = detectSeparatorAndHeader(text);
      const learned = getLearnedMapping(headers);
      const detected = learned ? learned.colMap : detectColumns(headers);
      setFileInfo({
        sep, lines, headers, hasHeader,
        learnedSource: learned ? { useCount: learned.useCount } : null,
      });
      setColMap(detected);
      setShowColMapping(!learned); // auto-expand mapping panel for new/unknown sources
    } catch {
      setError('Datei konnte nicht gelesen werden.');
    }
  };

  const toggle = (code: string) =>
    setSelected((p) => { const n = new Set(p); n.has(code) ? n.delete(code) : n.add(code); return n; });

  const handleImport = () => {
    const toImport = rows.filter((r) => selected.has(r.code));
    const drafts = toImport.map((r) => {
      const amount = Math.abs(r.balance || r.debit || r.credit);
      return rowToDraft(r.code, r.name, amount, date);
    });
    // Learn: save column mapping so next identical file is instantly recognized
    if (fileInfo?.headers.length) {
      saveLearnedMapping(fileInfo.headers, colMap);
    }
    // Learn: persist account code→name pairs for future imports
    const newLearned = learnAccounts(toImport.map((r) => ({ code: r.code, name: r.name })));
    onImport(drafts, newLearned);
    setFileInfo(null);
    setSelected(new Set());
    setColMap({ codeIdx: 0, nameIdx: -1, debitIdx: -1, creditIdx: -1, balanceIdx: -1 });
  };

  // ── No file yet ────────────────────────────────────────────────────────────
  if (!fileInfo) {
    return (
      <div>
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-12 text-center cursor-pointer hover:border-slate-400 transition"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-slate-700">Datei hier ablegen</p>
            <p className="text-xs text-slate-400 mt-1">CSV, Excel, PDF oder Bild (OCR)</p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs">
            Unterstützte Spalten: <span className="font-mono">Konto;Bezeichnung;Soll;Haben</span> oder <span className="font-mono">Konto;Bezeichnung;Saldo</span>
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,application/pdf,image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    );
  }

  const colOptions = [
    { value: -1, label: '— nicht vorhanden —' },
    ...fileInfo.headers.map((h, i) => ({ value: i, label: `Sp. ${i + 1}: ${h || `Col ${i + 1}`}` })),
  ];

  // ── File loaded ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Source badge + controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {fileInfo.learnedSource ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-1.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>
              Bekannte Quelle · {fileInfo.learnedSource.useCount}× importiert · Zuordnung automatisch angewendet
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              Neue Quelle · Bitte Spalten-Zuordnung prüfen
            </span>
          )}
          <span className="text-xs text-slate-400">{rows.length} Konten · {selected.size} ausgewählt</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColMapping((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <svg className={`h-3 w-3 transition-transform ${showColMapping ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            Spalten-Zuordnung
          </button>
          <button type="button" onClick={() => { setFileInfo(null); setSelected(new Set()); }}
            className="text-xs text-rose-500 hover:text-rose-700">Datei entfernen</button>
        </div>
      </div>

      {/* Column mapping panel */}
      {showColMapping && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spalten-Zuordnung</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COL_ROLES.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-sm text-slate-600">{label}</span>
                <select
                  value={colMap[key]}
                  onChange={(e) => setColMap((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                >
                  {colOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Korrekturen werden automatisch gespeichert und beim nächsten Import dieser Datei-Struktur angewendet.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <>
          <div className="flex gap-3 text-xs text-slate-500">
            <button type="button" onClick={() => setSelected(new Set(rows.map((r) => r.code)))} className="hover:text-slate-800">Alle</button>
            <button type="button" onClick={() => setSelected(new Set())} className="hover:text-slate-800">Keine</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 w-8" />
                  <th className="px-3 py-2 text-left">Konto</th>
                  <th className="px-3 py-2 text-left">Bezeichnung</th>
                  <th className="px-3 py-2 text-right">Soll</th>
                  <th className="px-3 py-2 text-right">Haben</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-left">Typ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const cat = r.code[0];
                  const isAktiv  = cat === '1';
                  const isPassiv = cat === '2';
                  const typeLabel = isAktiv ? 'Aktiven' : isPassiv ? 'Passiven' : cat === '3' ? 'Ertrag' : 'Aufwand';
                  const typeColor = isAktiv ? 'text-sky-700 bg-sky-50' : isPassiv ? 'text-violet-700 bg-violet-50' : cat === '3' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
                  return (
                    <tr key={r.code} className={`${selected.has(r.code) ? '' : 'opacity-40'} cursor-pointer hover:bg-slate-50`}
                      onClick={() => toggle(r.code)}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(r.code)} onChange={() => toggle(r.code)}
                          className="h-3.5 w-3.5 rounded border-slate-300" />
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">{r.code}</td>
                      <td className="px-3 py-2 text-slate-800">{r.name || '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.debit ? fmt(r.debit) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.credit ? fmt(r.credit) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(Math.abs(r.balance))}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColor}`}>{typeLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-800">
                {selected.size} Konto{selected.size !== 1 ? 'en' : ''} importieren
              </p>
              <button type="button" onClick={handleImport}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                {selected.size} Eröffnungsbuchung{selected.size !== 1 ? 'en' : ''} erstellen
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Learned knowledge footer ───────────────────────────────────────────────
const LearnerStatsFooter = () => {
  const stats = getLearnerStats(); // fresh read on each render
  const [cleared, setCleared] = useState(false);
  if (cleared || (stats.mappings === 0 && stats.accounts === 0)) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
      <span>
        🧠 Bookitty hat{' '}
        <strong className="text-slate-700">{stats.mappings} Datei-Format{stats.mappings !== 1 ? 'e' : ''}</strong>
        {' '}und{' '}
        <strong className="text-slate-700">{stats.accounts} Kontobezeichnung{stats.accounts !== 1 ? 'en' : ''}</strong>
        {' '}aus bisherigen Importen gelernt.
      </span>
      <button
        type="button"
        onClick={() => { clearLearned(); setCleared(true); }}
        className="text-rose-400 hover:text-rose-600"
      >
        Gelernte Daten löschen
      </button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────
const Import = () => {
  const { addBooking } = useBookkeeping();
  const [tab, setTab] = useState<'manual' | 'csv'>('manual');
  const [date, setDate] = useState(`${new Date().getFullYear() - 1}-12-31`);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [learnedCount, setLearnedCount] = useState(0);

  const handleImport = (drafts: BookingDraft[], newLearned = 0) => {
    drafts.forEach((d) => addBooking(d));
    setImportedCount(drafts.length);
    setLearnedCount(newLearned);
    setTimeout(() => setImportedCount(null), 6000);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Datenimport"
        subtitle="Vorjahresbilanz übertragen und Eröffnungssalden erfassen."
      />

      {/* Info banner */}
      <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800 flex items-start gap-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <p>
          Die Eröffnungsbuchungen werden mit dem Gegenkonto <span className="font-mono font-semibold">9200 Jahresgewinn oder -verlust</span> gebucht
          und erscheinen korrekt in Bilanz und Erfolgsrechnung.
          Das Datum solltest du auf den <strong>31.12. des Vorjahres</strong> setzen.
        </p>
      </div>

      {/* Success banner */}
      {importedCount !== null && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {importedCount} Eröffnungsbuchung{importedCount !== 1 ? 'en' : ''} erstellt
          {learnedCount > 0 && <> · <strong>{learnedCount} neue Bezeichnung{learnedCount !== 1 ? 'en' : ''}</strong> gelernt</>}.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        {/* Date + tabs header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="overflow-x-auto">
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-max">
              {([['manual', 'Manuelle Eingabe'], ['csv', 'CSV-Import']] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
                    tab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}>{label}</button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
            <span>Buchungsdatum</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-900 focus:border-slate-400 focus:outline-none" />
          </label>
        </div>

        {tab === 'manual'
          ? <ManualTab date={date} onImport={handleImport} />
          : <CsvTab    date={date} onImport={handleImport} />}
      </div>

      {/* Gelerntes Wissen */}
      <LearnerStatsFooter />
    </div>
  );
};

export default Import;
