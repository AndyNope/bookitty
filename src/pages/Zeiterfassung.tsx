import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';

/* ── Types ───────────────────────────────────────────────────────────────── */
type TimeEntry = {
  id: string;
  date: string;
  project: string;
  client: string;
  description: string;
  hours: number;
  hourlyRate: number;
  currency: string;
  billed: boolean;
};

const LS_KEY = 'bookitty.timeentries';
const loadEntries = (): TimeEntry[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); }
  catch { return []; }
};
const saveEntries = (e: TimeEntry[]) => localStorage.setItem(LS_KEY, JSON.stringify(e));

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };
const fmtCHF  = (n: number, c = 'CHF') => n.toLocaleString('de-CH', { style: 'currency', currency: c, minimumFractionDigits: 2 });

const EMPTY_FORM: Omit<TimeEntry, 'id' | 'billed'> = {
  date: today(), project: '', client: '', description: '', hours: 1, hourlyRate: 120, currency: 'CHF',
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function Zeiterfassung() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isDemo    = location.pathname.startsWith('/demo');
  const base      = isDemo ? '/demo' : '/app';

  const [entries, setEntries]   = useState<TimeEntry[]>([]);
  const [modal, setModal]       = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selected, setSelected]  = useState<Set<string>>(new Set());
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setEntries(loadEntries()); }, []);

  /* Live timer */
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const stopTimer = () => {
    setTimerRunning(false);
    const hours = parseFloat((timerSeconds / 3600).toFixed(2));
    setForm(f => ({ ...f, hours }));
    setTimerSeconds(0);
    setModal(true);
  };

  const fmtTimer = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const openNew = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setModal(true); };
  const openEdit = (e: TimeEntry) => {
    setForm({ date: e.date, project: e.project, client: e.client, description: e.description, hours: e.hours, hourlyRate: e.hourlyRate, currency: e.currency });
    setEditId(e.id); setModal(true);
  };

  const handleSave = () => {
    if (!form.description.trim()) return;
    if (editId) {
      const updated = entries.map(e => e.id === editId ? { ...e, ...form } : e);
      setEntries(updated); saveEntries(updated);
    } else {
      const entry: TimeEntry = { id: `te-${Date.now()}`, ...form, billed: false };
      const updated = [entry, ...entries];
      setEntries(updated); saveEntries(updated);
    }
    setModal(false);
  };

  const handleDelete = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated); saveEntries(updated);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clients  = [...new Set(entries.map(e => e.client).filter(Boolean))];
  const projects = [...new Set(entries.map(e => e.project).filter(Boolean))];

  const filtered = useMemo(() => entries.filter(e =>
    (!filterClient  || e.client  === filterClient) &&
    (!filterProject || e.project === filterProject)
  ), [entries, filterClient, filterProject]);

  const unbilled  = filtered.filter(e => !e.billed);
  const totalHours = filtered.reduce((s, e) => s + e.hours, 0);
  const totalValue = filtered.reduce((s, e) => s + e.hours * e.hourlyRate, 0);
  const selectedEntries = filtered.filter(e => selected.has(e.id));

  /* Build invoice from selection and navigate to Rechnungen */
  const createInvoice = () => {
    if (!selectedEntries.length) return;
    const items = selectedEntries.map(e => ({
      description: `${e.project ? e.project + ': ' : ''}${e.description} (${e.hours}h × ${fmtCHF(e.hourlyRate, e.currency)}/h)`,
      quantity: e.hours,
      unitPrice: e.hourlyRate,
      vatRate: 8.1,
    }));
    const client = selectedEntries[0].client;
    const payload = { items, contactName: client };
    sessionStorage.setItem('bookitty.newInvoiceDraft', JSON.stringify(payload));
    // Mark as billed
    const updated = entries.map(e => selected.has(e.id) ? { ...e, billed: true } : e);
    setEntries(updated); saveEntries(updated);
    setSelected(new Set());
    navigate(`${base}/rechnungen`);
  };

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Zeiterfassung"
        subtitle="Stunden auf Projekte und Kunden buchen, direkt zur Rechnung umwandeln."
        action={
          <div className="flex items-center gap-2">
            {timerRunning ? (
              <button onClick={stopTimer}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {fmtTimer(timerSeconds)} Stoppen
              </button>
            ) : (
              <button onClick={() => { setTimerRunning(true); setTimerSeconds(0); }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                Timer starten
              </button>
            )}
            <button onClick={openNew}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              + Eintrag
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Stunden (gesamt)', value: `${totalHours.toFixed(1)} h` },
          { label: 'Wert (gesamt)',    value: fmtCHF(totalValue) },
          { label: 'Nicht verrechnet', value: `${unbilled.length} Einträge` },
          { label: 'Verrechenbar',    value: fmtCHF(unbilled.reduce((s, e) => s + e.hours * e.hourlyRate, 0)) },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400">
          <option value="">Alle Kunden</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400">
          <option value="">Alle Projekte</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {selected.size > 0 && (
          <button onClick={createInvoice}
            className="ml-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {selected.size} Einträge → Rechnung
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="text-sm font-medium text-slate-500">Noch keine Zeiteinträge</p>
          <p className="text-xs text-slate-400">Starte den Timer oder erfasse Stunden manuell.</p>
          <button onClick={openNew}
            className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Ersten Eintrag erfassen
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox"
                    checked={selected.size === filtered.filter(e => !e.billed).length && filtered.some(e => !e.billed)}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set(filtered.filter(x => !x.billed).map(x => x.id)));
                      else setSelected(new Set());
                    }}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left">Datum</th>
                <th className="px-4 py-3 text-left">Projekt / Kunde</th>
                <th className="px-4 py-3 text-left">Beschreibung</th>
                <th className="px-4 py-3 text-right">Stunden</th>
                <th className="px-4 py-3 text-right">Ansatz</th>
                <th className="px-4 py-3 text-right">Betrag</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(entry => (
                <tr key={entry.id} className={`group ${selected.has(entry.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(entry.id)} disabled={entry.billed}
                      onChange={() => toggleSelect(entry.id)}
                      className="rounded border-slate-300 disabled:opacity-30" />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{fmtDate(entry.date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{entry.project || '–'}</p>
                    <p className="text-xs text-slate-400">{entry.client}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{entry.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{entry.hours.toFixed(2)} h</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{fmtCHF(entry.hourlyRate, entry.currency)}/h</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">{fmtCHF(entry.hours * entry.hourlyRate, entry.currency)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${entry.billed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {entry.billed ? 'Verrechnet' : 'Offen'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => openEdit(entry)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-slate-800">{editId ? 'Eintrag bearbeiten' : 'Neuer Zeiteintrag'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Datum</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Stunden</label>
                <input type="number" min="0.25" step="0.25" value={form.hours}
                  onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Kunde</label>
                <input list="clients-list" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Max Müller AG" className={inputCls} />
                <datalist id="clients-list">{clients.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Projekt</label>
                <input list="projects-list" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="Website Relaunch" className={inputCls} />
                <datalist id="projects-list">{projects.map(p => <option key={p} value={p} />)}</datalist>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Beschreibung</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Konzeption, Umsetzung, …" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Stundensatz</label>
                <input type="number" min="0" step="5" value={form.hourlyRate}
                  onChange={e => setForm(f => ({ ...f, hourlyRate: parseFloat(e.target.value) || 0 }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Währung</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
                  {['CHF', 'EUR', 'USD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-2 text-sm text-slate-600">
              <strong>Betrag:</strong> {fmtCHF(form.hours * form.hourlyRate, form.currency)}
              {' (exkl. MwSt.)'}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModal(false)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Abbrechen</button>
              <button onClick={handleSave} disabled={!form.description.trim()}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
                {editId ? 'Speichern' : 'Erfassen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
