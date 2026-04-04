import { useState, useEffect } from 'react';

/* ── Types ────────────────────────────────────────────────────────── */
interface StockItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  vatRate: number;
  stock: number;
  minStock: number;
  account: string;
  category: string;
}

interface StockMovement {
  id: string;
  itemId: string;
  date: string;
  type: 'Eingang' | 'Ausgang' | 'Korrektur';
  quantity: number;
  reference: string;
  note: string;
}

/* ── Constants ───────────────────────────────────────────────────── */
const ITEMS_KEY = 'bookitty.stock.items';
const MOVEMENTS_KEY = 'bookitty.stock.movements';
const UNITS = ['Stk', 'St', 'kg', 'g', 'l', 'ml', 'm', 'm²', 'h', 'Std', 'Paket', 'Karton'];
const CATEGORIES = ['Handelswaren', 'Rohstoffe', 'Halbfabrikate', 'Verbrauchsmaterial', 'Diverses'];

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => n.toLocaleString('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 });

/* ── Component ───────────────────────────────────────────────────── */
export default function Lager() {
  const [items, setItems] = useState<StockItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(ITEMS_KEY) ?? '[]'); } catch { return []; }
  });
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try { return JSON.parse(localStorage.getItem(MOVEMENTS_KEY) ?? '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(ITEMS_KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements)); }, [movements]);

  const [tab, setTab] = useState<'artikel' | 'bewegungen' | 'neu'>('artikel');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'item' | 'move' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [moveItemId, setMoveItemId] = useState('');

  /* ── Item form ─────────────────────────────────────────────────── */
  const blankItem: Omit<StockItem, 'id'> = {
    sku: '', name: '', description: '', unit: 'Stk', purchasePrice: 0, salePrice: 0,
    vatRate: 8.1, stock: 0, minStock: 5, account: '1200 Warenvorräte', category: 'Handelswaren',
  };
  const [itemForm, setItemForm] = useState(blankItem);

  const openNewItem = () => { setItemForm(blankItem); setEditId(null); setModal('item'); };
  const openEditItem = (item: StockItem) => {
    const { id, ...rest } = item;
    setItemForm(rest);
    setEditId(id);
    setModal('item');
  };
  const saveItem = () => {
    if (!itemForm.name) return;
    if (editId) {
      setItems((prev) => prev.map((x) => x.id === editId ? { id: editId, ...itemForm } : x));
    } else {
      setItems((prev) => [...prev, { id: uid(), ...itemForm }]);
    }
    setModal(null);
  };

  /* ── Movement form ─────────────────────────────────────────────── */
  const blankMove = { type: 'Eingang' as StockMovement['type'], quantity: '', reference: '', note: '', date: today() };
  const [moveForm, setMoveForm] = useState(blankMove);

  const openMove = (itemId: string) => { setMoveItemId(itemId); setMoveForm(blankMove); setModal('move'); };
  const saveMove = () => {
    const qty = parseInt(String(moveForm.quantity)) || 0;
    if (!moveItemId || qty === 0) return;
    const move: StockMovement = {
      id: uid(), itemId: moveItemId, date: moveForm.date,
      type: moveForm.type, quantity: qty, reference: moveForm.reference, note: moveForm.note,
    };
    setMovements((prev) => [move, ...prev]);
    /* Update stock */
    setItems((prev) => prev.map((x) => {
      if (x.id !== moveItemId) return x;
      const delta = moveForm.type === 'Eingang' ? qty : moveForm.type === 'Ausgang' ? -qty : qty;
      return { ...x, stock: Math.max(0, x.stock + delta) };
    }));
    setModal(null);
  };

  /* ── Derived ─────────────────────────────────────────────────────── */
  const filtered = items.filter((x) =>
    !search || x.name.toLowerCase().includes(search.toLowerCase()) || x.sku.toLowerCase().includes(search.toLowerCase())
  );
  const lowStock = items.filter((x) => x.stock <= x.minStock && x.minStock > 0);
  const totalValue = items.reduce((s, x) => s + x.stock * x.purchasePrice, 0);

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lagerverwaltung</h1>
          <p className="mt-1 text-sm text-slate-500">Artikel-Stamm verwalten, Lagerein- und -ausgänge buchen, Mindestbestand überwachen.</p>
        </div>
        <button onClick={openNewItem} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          + Artikel erfassen
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Artikel</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Lagerwert</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalValue)}</p>
        </div>
        <div className={`rounded-2xl border p-5 shadow-sm ${lowStock.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${lowStock.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>Unterbestand</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${lowStock.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{lowStock.length} Artikel</p>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Unterbestand:</strong>{' '}
          {lowStock.map((x) => `${x.name} (${x.stock} ${x.unit})`).join(' · ')}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(['artikel', 'bewegungen'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'artikel' ? 'Artikel' : 'Bewegungen'}
          </button>
        ))}
      </div>

      {/* ── Tab: Artikel ───────────────────────────────────────────── */}
      {tab === 'artikel' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <input type="search" placeholder="Artikel oder SKU suchen …" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Keine Artikel gefunden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Bezeichnung</th>
                    <th className="px-4 py-3 text-center">Bestand</th>
                    <th className="px-4 py-3 text-center">Mindest</th>
                    <th className="px-4 py-3 text-right">EK-Preis</th>
                    <th className="px-4 py-3 text-right">VK-Preis</th>
                    <th className="px-4 py-3 text-right">Lagerwert</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((item) => (
                    <tr key={item.id} className={item.stock <= item.minStock && item.minStock > 0 ? 'bg-amber-50/40' : ''}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.name}</p>
                        {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold tabular-nums ${item.stock <= item.minStock && item.minStock > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                          {item.stock} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400 text-xs">{item.minStock} {item.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{fmt(item.purchasePrice)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">{fmt(item.salePrice)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{fmt(item.stock * item.purchasePrice)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openMove(item.id)} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100">
                            Buchung
                          </button>
                          <button onClick={() => openEditItem(item)} className="text-xs text-slate-400 hover:text-slate-700">Bearbeiten</button>
                          <button onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))} className="text-xs text-rose-400 hover:text-rose-600">✕</button>
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

      {/* ── Tab: Bewegungen ────────────────────────────────────────── */}
      {tab === 'bewegungen' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {movements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Noch keine Lagerbewegungen erfasst.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left">Datum</th>
                    <th className="px-4 py-3 text-left">Artikel</th>
                    <th className="px-4 py-3 text-center">Art</th>
                    <th className="px-4 py-3 text-right">Menge</th>
                    <th className="px-4 py-3 text-left">Referenz</th>
                    <th className="px-4 py-3 text-left">Bemerkung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movements.map((m) => {
                    const item = items.find((x) => x.id === m.itemId);
                    return (
                      <tr key={m.id}>
                        <td className="px-4 py-3 tabular-nums text-slate-500">{m.date}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{item?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.type === 'Eingang' ? 'bg-emerald-100 text-emerald-700' :
                            m.type === 'Ausgang' ? 'bg-rose-100 text-rose-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{m.type}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {m.type === 'Eingang' ? '+' : m.type === 'Ausgang' ? '−' : '±'}{m.quantity} {item?.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{m.reference || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{m.note || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Artikel ─────────────────────────────────────────── */}
      {modal === 'item' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-semibold text-slate-900">{editId ? 'Artikel bearbeiten' : 'Neuer Artikel'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">SKU / Artikelnummer</label>
                <input type="text" placeholder="z. B. ART-001" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Einheit</label>
                <select value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} className={inputCls}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Bezeichnung *</label>
                <input type="text" placeholder="Artikelname" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Beschreibung</label>
                <input type="text" placeholder="Optional" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">EK-Preis (CHF)</label>
                <input type="number" min="0" step="0.01" value={itemForm.purchasePrice || ''} onChange={(e) => setItemForm({ ...itemForm, purchasePrice: parseFloat(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">VK-Preis (CHF)</label>
                <input type="number" min="0" step="0.01" value={itemForm.salePrice || ''} onChange={(e) => setItemForm({ ...itemForm, salePrice: parseFloat(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">MwSt-Satz (%)</label>
                <select value={itemForm.vatRate} onChange={(e) => setItemForm({ ...itemForm, vatRate: parseFloat(e.target.value) })} className={inputCls}>
                  <option value={8.1}>8.1% (Normalsatz)</option>
                  <option value={2.6}>2.6% (Sondersatz Beherbergung)</option>
                  <option value={2.5}>2.5% (Reduziersatz)</option>
                  <option value={0}>0% (Steuerbefreit)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Anfangsbestand</label>
                <input type="number" min="0" step="1" value={itemForm.stock || ''} onChange={(e) => setItemForm({ ...itemForm, stock: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Mindestbestand</label>
                <input type="number" min="0" step="1" value={itemForm.minStock || ''} onChange={(e) => setItemForm({ ...itemForm, minStock: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Kategorie</label>
                <select value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Lagerkonto</label>
                <input type="text" value={itemForm.account} onChange={(e) => setItemForm({ ...itemForm, account: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Abbrechen</button>
              <button onClick={saveItem} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                {editId ? 'Speichern' : 'Artikel anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Buchung ─────────────────────────────────────────── */}
      {modal === 'move' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              Lagerbewegung — {items.find((x) => x.id === moveItemId)?.name}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Art</label>
                <select value={moveForm.type} onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value as StockMovement['type'] })} className={inputCls}>
                  <option value="Eingang">Eingang (Zukauf / Produktion)</option>
                  <option value="Ausgang">Ausgang (Verkauf / Verbrauch)</option>
                  <option value="Korrektur">Korrektur (Inventur)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Menge</label>
                <input type="number" min="1" step="1" value={moveForm.quantity} onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Datum</label>
                <input type="date" value={moveForm.date} onChange={(e) => setMoveForm({ ...moveForm, date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Referenz (z. B. Rechnungsnr.)</label>
                <input type="text" placeholder="Optional" value={moveForm.reference} onChange={(e) => setMoveForm({ ...moveForm, reference: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Bemerkung</label>
                <input type="text" placeholder="Optional" value={moveForm.note} onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Abbrechen</button>
              <button onClick={saveMove}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${moveForm.type === 'Eingang' ? 'bg-emerald-600 hover:bg-emerald-700' : moveForm.type === 'Ausgang' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-700 hover:bg-slate-900'}`}>
                Buchen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
