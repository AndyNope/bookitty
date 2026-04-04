import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import SectionHeader from '../components/SectionHeader';
import type { Expense, ExpenseCategory, ExpenseStatus } from '../types';

/* ── local mock helper ─────────────────────────────────────────────── */
const STORAGE_KEY = 'bookitty.expenses';
const loadMock = (): Expense[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
};
const saveMock = (items: Expense[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

const CATEGORIES: ExpenseCategory[] = [
  'Reise', 'Verpflegung', 'Unterkunft', 'Kommunikation', 'Material', 'Fahrzeug', 'Diverses',
];

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  Ausstehend: 'bg-yellow-100 text-yellow-800',
  Genehmigt:  'bg-green-100 text-green-800',
  Abgelehnt:  'bg-red-100 text-red-700',
};

const emptyForm = (): Partial<Expense> => ({
  date:        new Date().toISOString().slice(0, 10),
  amount:      0,
  currency:    'CHF',
  category:    'Diverses',
  description: '',
  receipt_url: '',
});

/* ── main component ────────────────────────────────────────────────── */
export default function Spesen() {
  const location = useLocation();
  const isDemo   = location.pathname.startsWith('/demo');
  const { user, isAdmin, isReadonly } = useAuth();

  const [items,    setItems]    = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(false);

  // form
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<Expense | null>(null);
  const [form,     setForm]     = useState<Partial<Expense>>(emptyForm());
  const [formErr,  setFormErr]  = useState('');

  // filter
  const [filterStatus, setFilterStatus] = useState<'alle' | ExpenseStatus>('alle');

  /* ── load ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (isDemo) { setItems(loadMock()); return; }
    setLoading(true);
    api.expenses.list()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemo]);

  /* ── helpers ───────────────────────────────────────────────────────── */
  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormErr('');
    setShowForm(true);
  };
  const openEdit = (exp: Expense) => {
    setEditing(exp);
    setForm({ ...exp });
    setFormErr('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setFormErr('');
    if (!form.description?.trim()) { setFormErr('Beschreibung erforderlich'); return; }
    if (!form.amount || form.amount <= 0) { setFormErr('Betrag muss grösser als 0 sein'); return; }

    if (isDemo) {
      const all = loadMock();
      if (editing) {
        const updated = all.map(e => e.id === editing.id ? { ...e, ...form } as Expense : e);
        saveMock(updated);
        setItems(updated);
      } else {
        const newExp: Expense = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          user_id: 1,
          status: 'Ausstehend',
          created_at: new Date().toISOString(),
          submitter_name: user?.name ?? 'Demo',
          currency: 'CHF',
          ...form,
        } as Expense;
        const updated = [newExp, ...all];
        saveMock(updated);
        setItems(updated);
      }
      setShowForm(false);
      return;
    }

    try {
      if (editing) {
        await api.expenses.update(editing.id, form);
        setItems(prev => prev.map(e => e.id === editing.id ? { ...e, ...form } as Expense : e));
      } else {
        const res = await api.expenses.create(form);
        const newExp: Expense = {
          id: res.id,
          user_id: user!.id,
          status: 'Ausstehend',
          created_at: new Date().toISOString(),
          submitter_name: user!.name,
          currency: form.currency ?? 'CHF',
          ...form,
        } as Expense;
        setItems(prev => [newExp, ...prev]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      setFormErr((e as Error).message ?? 'Fehler beim Speichern');
    }
  };

  const handleApprove = async (exp: Expense) => {
    if (isDemo) {
      const updated = loadMock().map(e =>
        e.id === exp.id ? { ...e, status: 'Genehmigt' as ExpenseStatus } : e
      );
      saveMock(updated);
      setItems(updated);
      return;
    }
    await api.expenses.approve(exp.id).catch(() => {});
    setItems(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'Genehmigt' } : e));
  };

  const handleReject = async (exp: Expense) => {
    if (isDemo) {
      const updated = loadMock().map(e =>
        e.id === exp.id ? { ...e, status: 'Abgelehnt' as ExpenseStatus } : e
      );
      saveMock(updated);
      setItems(updated);
      return;
    }
    await api.expenses.reject(exp.id).catch(() => {});
    setItems(prev => prev.map(e => e.id === exp.id ? { ...e, status: 'Abgelehnt' } : e));
  };

  const handleDelete = async (exp: Expense) => {
    if (!confirm(`Spese "${exp.description}" löschen?`)) return;
    if (isDemo) {
      const updated = loadMock().filter(e => e.id !== exp.id);
      saveMock(updated);
      setItems(updated);
      return;
    }
    await api.expenses.remove(exp.id).catch(() => {});
    setItems(prev => prev.filter(e => e.id !== exp.id));
  };

  /* ── filtered ──────────────────────────────────────────────────────── */
  const filtered = filterStatus === 'alle'
    ? items
    : items.filter(e => e.status === filterStatus);

  const totalByStatus = (s: ExpenseStatus) =>
    items.filter(e => e.status === s).reduce((acc, e) => acc + e.amount, 0);

  /* ── render ────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Spesenabrechnungen"
        subtitle="Spesen einreichen und genehmigen"
        action={
          !isReadonly ? (
            <button onClick={openNew}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Neue Spese
            </button>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {([ ['Ausstehend', 'yellow'], ['Genehmigt', 'green'], ['Abgelehnt', 'red'] ] as const).map(([status, color]) => (
          <button key={status}
            onClick={() => setFilterStatus(prev => prev === status ? 'alle' : status)}
            className={`rounded-2xl border p-4 text-left transition-all ${filterStatus === status ? 'ring-2 ring-offset-1 ring-slate-700' : 'hover:shadow-sm'} bg-${color}-50 border-${color}-100`}>
            <div className={`text-xs font-medium text-${color}-600 mb-1`}>{status}</div>
            <div className={`text-xl font-bold text-${color}-900`}>
              CHF {totalByStatus(status as ExpenseStatus).toLocaleString('de-CH', { minimumFractionDigits: 2 })}
            </div>
            <div className={`text-xs text-${color}-500`}>{items.filter(e => e.status === status).length} Einträge</div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* filter tabs */}
        <div className="flex gap-1 border-b border-slate-100 px-4 pt-3 pb-0">
          {(['alle', 'Ausstehend', 'Genehmigt', 'Abgelehnt'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${filterStatus === s ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {s === 'alle' ? 'Alle' : s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <svg className="h-5 w-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Lade...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <svg className="h-10 w-10 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <p>Keine Spesenabrechnungen</p>
            {!isReadonly && <button onClick={openNew} className="text-sm text-slate-500 hover:underline">Erste Spese erfassen</button>}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* header */}
            <div className="grid grid-cols-[100px_1fr_120px_80px_100px_120px] gap-3 px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wide bg-slate-50">
              <span>Datum</span><span>Beschreibung</span><span>Kategorie</span>
              <span className="text-right">Betrag</span><span>Status</span><span>Aktionen</span>
            </div>
            {filtered.map(exp => (
              <div key={exp.id}
                className="grid grid-cols-[100px_1fr_120px_80px_100px_120px] gap-3 items-center px-4 py-3 hover:bg-slate-50 group">
                <span className="text-sm text-slate-500">{new Date(exp.date).toLocaleDateString('de-CH')}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{exp.description}</div>
                  {exp.submitter_name && isAdmin && (
                    <div className="text-xs text-slate-400 truncate">{exp.submitter_name}</div>
                  )}
                </div>
                <span className="text-xs text-slate-500">{exp.category}</span>
                <span className="text-sm font-semibold text-slate-800 text-right">
                  {exp.amount.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                </span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[exp.status]}`}>
                  {exp.status}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Approve/Reject – admin only, pending only */}
                  {isAdmin && exp.status === 'Ausstehend' && (
                    <>
                      <button onClick={() => handleApprove(exp)} title="Genehmigen"
                        className="rounded-lg p-1.5 text-green-600 hover:bg-green-50">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button onClick={() => handleReject(exp)} title="Ablehnen"
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                  {/* Edit – own + pending */}
                  {exp.status === 'Ausstehend' && !isReadonly && (
                    <button onClick={() => openEdit(exp)} title="Bearbeiten"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.707-6.707a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L11 14H9v-2z" />
                      </svg>
                    </button>
                  )}
                  {/* Delete – admin always, own if pending */}
                  {(isAdmin || exp.status === 'Ausstehend') && !isReadonly && (
                    <button onClick={() => handleDelete(exp)} title="Löschen"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  {/* Receipt link */}
                  {exp.receipt_url && (
                    <a href={exp.receipt_url} target="_blank" rel="noreferrer" title="Beleg öffnen"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Form modal ───────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editing ? 'Spese bearbeiten' : 'Neue Spese erfassen'}
              </h2>
              <button onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* Date + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Datum</label>
                  <input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Betrag (CHF)</label>
                  <input type="number" min="0" step="0.01" value={form.amount ?? ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Kategorie</label>
                <select value={form.category ?? 'Diverses'} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Beschreibung</label>
                <input value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="z.B. Bahnfahrt Zürich–Basel"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </div>

              {/* Receipt URL */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Beleg-URL (optional)</label>
                <input value={form.receipt_url ?? ''} onChange={e => setForm(f => ({ ...f, receipt_url: e.target.value }))}
                  placeholder="https://... oder leer lassen"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              </div>

              {formErr && <p className="text-xs text-red-600">{formErr}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Abbrechen
              </button>
              <button onClick={handleSave}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700">
                {editing ? 'Speichern' : 'Einreichen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
