import { useState, useEffect } from 'react';
import { useBookkeeping } from '../store/BookkeepingContext';

/* ── Types ────────────────────────────────────────────────────────── */
type DepreciationMethod = 'linear' | 'degressiv';

interface Asset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchaseValue: number;
  currentBookValue: number;
  usefulLife: number;        // years (linear)
  depreciationRate: number;  // % (degressiv)
  method: DepreciationMethod;
  assetAccount: string;
  depreciationAccount: string;
  notes: string;
  disposed: boolean;
  disposalDate?: string;
}

/* ── Constants ───────────────────────────────────────────────────── */
const STORAGE_KEY = 'bookitty.assets';
const CATEGORIES = ['Fahrzeuge', 'Maschinen/Geräte', 'EDV/IT', 'Büroeinrichtung', 'Immobilien', 'Patente/Lizenzen', 'Diverses'];
const ASSET_ACCOUNTS: Record<string, string> = {
  'Fahrzeuge': '1520 Fahrzeuge',
  'Maschinen/Geräte': '1510 Maschinen/Geräte',
  'EDV/IT': '1540 EDV/IT',
  'Büroeinrichtung': '1530 Büroeinrichtung',
  'Immobilien': '1400 Liegenschaften',
  'Patente/Lizenzen': '1600 Patente/Lizenzen',
  'Diverses': '1500 Sachanlagen',
};
const DEPRECIATION_ACCOUNT = '6800 Abschreibungen';

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) =>
  n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 });
const fmtPct = (n: number) => n.toFixed(1) + '%';

/* ── Helpers ─────────────────────────────────────────────────────── */
const calcAnnualDepreciation = (a: Asset): number => {
  if (a.method === 'linear') {
    return a.purchaseValue / (a.usefulLife || 1);
  }
  return a.currentBookValue * (a.depreciationRate / 100);
};

const calcBookValueAtYear = (a: Asset, year: number): number => {
  const purchaseYear = new Date(a.purchaseDate).getFullYear();
  const yearsElapsed = year - purchaseYear;
  if (yearsElapsed <= 0) return a.purchaseValue;
  if (a.method === 'linear') {
    const annual = a.purchaseValue / (a.usefulLife || 1);
    return Math.max(0, a.purchaseValue - annual * yearsElapsed);
  }
  let bv = a.purchaseValue;
  for (let i = 0; i < yearsElapsed; i++) {
    bv = bv * (1 - a.depreciationRate / 100);
    if (bv < 1) { bv = 0; break; }
  }
  return bv;
};

/* ── Component ───────────────────────────────────────────────────── */
export default function Anlagen() {
  const { addBooking } = useBookkeeping();
  const [assets, setAssets] = useState<Asset[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
  });
  const [tab, setTab] = useState<'spiegel' | 'erfassen'>('spiegel');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [booked, setBooked] = useState<string[]>([]);

  /* ── Persist ─────────────────────────────────────────────────────── */
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(assets)); }, [assets]);

  /* ── Form state ───────────────────────────────────────────────────── */
  const blank: Omit<Asset, 'id'> = {
    name: '', category: 'EDV/IT', purchaseDate: today(), purchaseValue: 0,
    currentBookValue: 0, usefulLife: 5, depreciationRate: 20, method: 'linear',
    assetAccount: '1540 EDV/IT', depreciationAccount: DEPRECIATION_ACCOUNT,
    notes: '', disposed: false,
  };
  const [form, setForm] = useState(blank);

  const openNew = () => { setForm(blank); setEditId(null); setModal(true); };
  const openEdit = (a: Asset) => {
    const { id, ...rest } = a;
    setForm(rest);
    setEditId(id);
    setModal(true);
  };
  const closeModal = () => setModal(false);

  const setField = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'category') next.assetAccount = ASSET_ACCOUNTS[v as string] ?? '1500 Sachanlagen';
      if (k === 'purchaseValue' && !editId) next.currentBookValue = v as number;
      return next;
    });
  };

  const saveAsset = () => {
    if (!form.name || form.purchaseValue <= 0) return;
    if (editId) {
      setAssets((prev) => prev.map((a) => a.id === editId ? { id: editId, ...form } : a));
    } else {
      setAssets((prev) => [...prev, { id: uid(), ...form }]);
    }
    closeModal();
  };

  const removeAsset = (id: string) => setAssets((prev) => prev.filter((a) => a.id !== id));
  const toggleDispose = (id: string) =>
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, disposed: !a.disposed, disposalDate: !a.disposed ? today() : undefined } : a));

  /* ── Book depreciation ────────────────────────────────────────────── */
  const bookDepreciation = (a: Asset) => {
    const amt = Math.round(calcAnnualDepreciation(a) * 100) / 100;
    if (amt <= 0) return;
    addBooking({
      date: today(),
      description: `Abschreibung ${new Date().getFullYear()}: ${a.name}`,
      account: a.depreciationAccount,
      contraAccount: a.assetAccount,
      category: 'Abschluss',
      amount: amt,
      vatRate: 0,
      currency: 'CHF',
      paymentStatus: 'Bezahlt',
      type: 'Ausgabe',
    });
    /* Update book value */
    setAssets((prev) => prev.map((x) =>
      x.id === a.id ? { ...x, currentBookValue: Math.max(0, x.currentBookValue - amt) } : x
    ));
    setBooked((prev) => [...prev, a.id]);
  };

  /* ── Anlagenspiegel CSV export ────────────────────────────────────── */
  const exportSpiegel = () => {
    const year = new Date().getFullYear();
    const header = ['Bezeichnung', 'Kategorie', 'Kaufdatum', 'Kaufwert CHF', 'Buchwert CHF', 'Jahres-AfA CHF', 'Methode', 'Konto', 'Abgeschrieben'];
    const rows = assets.map((a) => [
      `"${a.name}"`, a.category, a.purchaseDate,
      a.purchaseValue.toFixed(2), a.currentBookValue.toFixed(2),
      calcAnnualDepreciation(a).toFixed(2),
      a.method === 'linear' ? `Linear ${a.usefulLife}J` : `Degressiv ${a.depreciationRate}%`,
      a.assetAccount, a.disposed ? 'Ja' : 'Nein',
    ]);
    const csv = '\ufeff' + [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `anlagenspiegel-${year}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  const activeAssets = assets.filter((a) => !a.disposed);
  const disposedAssets = assets.filter((a) => a.disposed);
  const totalPurchase = activeAssets.reduce((s, a) => s + a.purchaseValue, 0);
  const totalBookValue = activeAssets.reduce((s, a) => s + a.currentBookValue, 0);
  const totalAnnualAfa = activeAssets.reduce((s, a) => s + calcAnnualDepreciation(a), 0);
  const currentYear = new Date().getFullYear();

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Anlagenbuchhaltung</h1>
          <p className="mt-1 text-sm text-slate-500">Sachanlagen erfassen, Abschreibungen berechnen und Anlagenspiegel exportieren.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportSpiegel} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Anlagenspiegel CSV
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            + Anlage erfassen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Bruttoanlage', value: fmt(totalPurchase), sub: `${activeAssets.length} aktive Anlagen` },
          { label: 'Buchwert gesamt', value: fmt(totalBookValue), sub: `${fmtPct(totalPurchase > 0 ? (totalBookValue / totalPurchase) * 100 : 0)} des Kaufwerts` },
          { label: `Jahres-AfA ${currentYear}`, value: fmt(totalAnnualAfa), sub: 'Planmässige Abschreibung' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(['spiegel', 'erfassen'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'spiegel' ? 'Anlagenspiegel' : 'Abschreibungen buchen'}
          </button>
        ))}
      </div>

      {/* ── Tab: Anlagenspiegel ─────────────────────────────────────── */}
      {tab === 'spiegel' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {assets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Noch keine Anlagen erfasst. Klicken Sie auf «+ Anlage erfassen».
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Bezeichnung</th>
                    <th className="px-4 py-3 text-left">Kategorie</th>
                    <th className="px-4 py-3 text-left">Kaufdatum</th>
                    <th className="px-4 py-3 text-right">Kaufwert</th>
                    <th className="px-4 py-3 text-right">Buchwert</th>
                    <th className="px-4 py-3 text-right">Jahres-AfA</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assets.map((a) => (
                    <tr key={a.id} className={a.disposed ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                      <td className="px-4 py-3 text-slate-500">{a.category}</td>
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{a.purchaseDate}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmt(a.purchaseValue)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(a.currentBookValue)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-rose-600">{a.disposed ? '—' : fmt(calcAnnualDepreciation(a))}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.disposed ? 'bg-slate-100 text-slate-500' :
                          a.currentBookValue <= 0 ? 'bg-emerald-100 text-emerald-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {a.disposed ? 'Abgegangen' : a.currentBookValue <= 0 ? 'Vollständig' : 'Aktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(a)} className="text-xs text-slate-400 hover:text-slate-700">Bearbeiten</button>
                          <button onClick={() => toggleDispose(a.id)} className="text-xs text-slate-400 hover:text-amber-600">
                            {a.disposed ? 'Reaktivieren' : 'Abgang'}
                          </button>
                          <button onClick={() => removeAsset(a.id)} className="rounded p-0.5 text-rose-400 hover:text-rose-600" aria-label="Entfernen"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Abschreibungen buchen ──────────────────────────────── */}
      {tab === 'erfassen' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {activeAssets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Keine aktiven Anlagen vorhanden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Anlage</th>
                    <th className="px-4 py-3 text-left">Methode</th>
                    <th className="px-4 py-3 text-right">Buchwert</th>
                    <th className="px-4 py-3 text-right">AfA {currentYear}</th>
                    <th className="px-4 py-3 text-center">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeAssets.map((a) => {
                    const afa = Math.round(calcAnnualDepreciation(a) * 100) / 100;
                    const done = booked.includes(a.id);
                    return (
                      <tr key={a.id}>
                        <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {a.method === 'linear' ? `Linear ${a.usefulLife}J` : `Degressiv ${a.depreciationRate}%`}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(a.currentBookValue)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-rose-600">{fmt(afa)}</td>
                        <td className="px-4 py-3 text-center">
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Gebucht</span>
                          ) : afa <= 0 ? (
                            <span className="text-xs text-slate-400">Vollständig abgeschrieben</span>
                          ) : (
                            <button onClick={() => bookDepreciation(a)}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">
                              Abschreibung buchen
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold text-sm border-t border-slate-100">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-slate-700">Total Jahres-AfA {currentYear}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-700">{fmt(totalAnnualAfa)}</td>
                    <td className="px-4 py-3 text-center">
                      {booked.length > 0 && <span className="text-xs text-emerald-600">{booked.length} gebucht</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Disposed assets ─────────────────────────────────────────── */}
      {tab === 'spiegel' && disposedAssets.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Abgegangene Anlagen ({disposedAssets.length})
          </summary>
          <div className="divide-y divide-slate-50">
            {disposedAssets.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm text-slate-400 opacity-60">
                <span>{a.name} ({a.category})</span>
                <span>Abgang: {a.disposalDate ?? '—'}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── Depreciation schedule card ──────────────────────────────── */}
      {tab === 'spiegel' && activeAssets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Abschreibungsplan (nächste 5 Jahre)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-600">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1.5 pr-4 text-left">Anlage</th>
                  {Array.from({ length: 5 }, (_, i) => currentYear + i).map((y) => (
                    <th key={y} className="py-1.5 px-2 text-right">{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeAssets.map((a) => (
                  <tr key={a.id}>
                    <td className="py-1.5 pr-4 font-medium text-slate-700">{a.name}</td>
                    {Array.from({ length: 5 }, (_, i) => currentYear + i).map((y) => {
                      const bv = calcBookValueAtYear(a, y + 1);
                      return <td key={y} className="py-1.5 px-2 text-right tabular-nums">{fmt(bv)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">Buchwerte per Jahresende. Degressiv: Satz auf Restbuchwert; Linear: Gleichmässig über Nutzungsdauer.</p>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-semibold text-slate-900">{editId ? 'Anlage bearbeiten' : 'Neue Anlage erfassen'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Bezeichnung *</label>
                <input type="text" placeholder="z. B. MacBook Pro M3" value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Kategorie</label>
                <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Kaufdatum</label>
                <input type="date" value={form.purchaseDate} onChange={(e) => setField('purchaseDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Kaufwert (CHF) *</label>
                <input type="number" min="0" step="0.01" value={form.purchaseValue || ''} onChange={(e) => setField('purchaseValue', parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Aktueller Buchwert (CHF)</label>
                <input type="number" min="0" step="0.01" value={form.currentBookValue || ''} onChange={(e) => setField('currentBookValue', parseFloat(e.target.value) || 0)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Abschreibungsmethode</label>
                <select value={form.method} onChange={(e) => setField('method', e.target.value as DepreciationMethod)} className={inputCls}>
                  <option value="linear">Linear (Kaufwert ÷ Jahre)</option>
                  <option value="degressiv">Degressiv (Buchwert × Satz)</option>
                </select>
              </div>
              {form.method === 'linear' ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Nutzungsdauer (Jahre)</label>
                  <input type="number" min="1" step="1" value={form.usefulLife} onChange={(e) => setField('usefulLife', parseInt(e.target.value) || 1)} className={inputCls} />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Abschreibungssatz (%)</label>
                  <input type="number" min="1" max="100" step="1" value={form.depreciationRate} onChange={(e) => setField('depreciationRate', parseFloat(e.target.value) || 20)} className={inputCls} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Anlagekonto</label>
                <input type="text" value={form.assetAccount} onChange={(e) => setField('assetAccount', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Abschreibungskonto</label>
                <input type="text" value={form.depreciationAccount} onChange={(e) => setField('depreciationAccount', e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Jahresabschreibung:{' '}
                <strong>
                  {fmt(form.method === 'linear'
                    ? (form.purchaseValue || 0) / (form.usefulLife || 1)
                    : (form.currentBookValue || 0) * ((form.depreciationRate || 20) / 100)
                  )}
                </strong>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Bemerkungen</label>
                <input type="text" placeholder="Optional" value={form.notes} onChange={(e) => setField('notes', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Abbrechen</button>
              <button onClick={saveAsset} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                {editId ? 'Speichern' : 'Anlage erfassen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
