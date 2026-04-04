import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';
import NotificationModal from '../components/NotificationModal';
import { api } from '../services/api';
import type { Contact, Invoice, InvoiceLineItem, InvoiceStatus } from '../types';
import { calcInvoiceTotals, exportInvoicePDF } from '../utils/invoicePdf';

// ─── Demo localStorage ────────────────────────────────────────────────────────
const STORAGE_KEY = 'bookitty.invoices';

function genNumber(existing: Invoice[]): string {
  const year = new Date().getFullYear();
  const max  = existing.reduce((n, inv) => {
    const m = inv.number.match(/(\d+)$/);
    return m ? Math.max(n, parseInt(m[1])) : n;
  }, 0);
  return `RE-${year}-${String(max + 1).padStart(3, '0')}`;
}

function loadInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Invoice[];
  } catch { /**/ }
  return [];
}
function saveInvoices(invs: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invs));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<InvoiceStatus, string> = {
  Entwurf:   'bg-slate-100 text-slate-600',
  Versendet: 'bg-blue-100 text-blue-700',
  Bezahlt:   'bg-emerald-100 text-emerald-700',
  Überfällig:'bg-red-100 text-red-700',
  Storniert: 'bg-orange-100 text-orange-700',
};

function todayISO() { return new Date().toISOString().split('T')[0]; }
function plusDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
function fmtCHF(n: number) {
  return n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function isOverdue(inv: Invoice) {
  return inv.status === 'Versendet' && inv.dueDate < todayISO();
}

// ─── Empty line item ──────────────────────────────────────────────────────────
const EMPTY_ITEM: InvoiceLineItem = { description: '', quantity: 1, unit: 'Stk.', unitPrice: 0, vatRate: 8.1 };

// ─── Invoice form ─────────────────────────────────────────────────────────────
const InvoiceForm = ({
  initial,
  contacts,
  existingInvoices,
  onSave,
  onClose,
}: {
  initial: Partial<Invoice> | null;
  contacts: Contact[];
  existingInvoices: Invoice[];
  onSave: (inv: Omit<Invoice, 'id'>, id?: string) => void;
  onClose: () => void;
}) => {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<Omit<Invoice, 'id'>>({
    number:         initial?.number    ?? genNumber(existingInvoices),
    date:           initial?.date      ?? todayISO(),
    dueDate:        initial?.dueDate   ?? plusDays(30),
    status:         initial?.status    ?? 'Entwurf',
    contactId:      initial?.contactId,
    contactName:    initial?.contactName    ?? '',
    contactCompany: initial?.contactCompany,
    contactStreet:  initial?.contactStreet,
    contactZip:     initial?.contactZip,
    contactCity:    initial?.contactCity,
    contactCountry: initial?.contactCountry ?? 'CH',
    contactEmail:   initial?.contactEmail,
    iban:           initial?.iban,
    reference:      initial?.reference,
    items:          initial?.items?.length ? initial.items : [{ ...EMPTY_ITEM }],
    currency:       initial?.currency  ?? 'CHF',
    notes:          initial?.notes,
  });

  const set = <K extends keyof typeof form>(k: K) => (v: typeof form[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const { subtotal, vatTotal, total } = useMemo(() => calcInvoiceTotals(form.items), [form.items]);

  // Auto-fill from contact
  const handleContactSelect = (id: string) => {
    const c = contacts.find(c => c.id === id);
    if (!c) return;
    setForm(prev => ({
      ...prev,
      contactId:      c.id,
      contactName:    c.name,
      contactCompany: c.company ?? '',
      contactStreet:  c.street  ?? '',
      contactZip:     c.zip     ?? '',
      contactCity:    c.city    ?? '',
      contactCountry: c.country ?? 'CH',
      contactEmail:   c.email   ?? '',
      iban:           prev.iban ?? '', // keep own iban
    }));
  };

  const setItem = (i: number, field: keyof InvoiceLineItem, val: string | number) =>
    setForm(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], [field]: val };
      return { ...prev, items };
    });

  const addItem    = () => setForm(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName.trim()) return;
    onSave(form, initial?.id);
  };

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? 'Rechnung bearbeiten' : 'Neue Rechnung'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 overflow-y-auto p-6">

          {/* ── Meta row ── */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Rechnungsnr.</label>
              <input value={form.number} onChange={e => set('number')(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Datum</label>
              <input type="date" value={form.date} onChange={e => set('date')(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Zahlbar bis</label>
              <div className="flex gap-1">
                <input type="date" value={form.dueDate} onChange={e => set('dueDate')(e.target.value)} className={inputCls} />
              </div>
              <div className="mt-1 flex gap-1">
                {[30, 60, 90].map(d => (
                  <button key={d} type="button"
                    onClick={() => set('dueDate')(plusDays(d))}
                    className="rounded px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-slate-200">
                    +{d}T
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Empfänger ── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Empfänger</h3>
            {contacts.length > 0 && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Aus Kontakten wählen</label>
                <select
                  onChange={e => handleContactSelect(e.target.value)}
                  defaultValue=""
                  className={inputCls}
                >
                  <option value="">— Kontakt auswählen —</option>
                  {contacts.filter(c => c.type !== 'Lieferant').map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name / Kontaktperson *</label>
                <input value={form.contactName} onChange={e => set('contactName')(e.target.value)} placeholder="Max Mustermann" className={inputCls} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Firma</label>
                <input value={form.contactCompany ?? ''} onChange={e => set('contactCompany')(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Strasse</label>
                <input value={form.contactStreet ?? ''} onChange={e => set('contactStreet')(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-slate-600">PLZ</label>
                  <input value={form.contactZip ?? ''} onChange={e => set('contactZip')(e.target.value)} placeholder="8001" className={inputCls} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Ort</label>
                  <input value={form.contactCity ?? ''} onChange={e => set('contactCity')(e.target.value)} placeholder="Zürich" className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Positionen ── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Positionen</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="pb-2 text-left">Beschreibung</th>
                    <th className="pb-2 text-right w-16">Menge</th>
                    <th className="pb-2 text-left w-20 pl-2">Einheit</th>
                    <th className="pb-2 text-right w-28">Preis (CHF)</th>
                    <th className="pb-2 text-right w-20">MwSt.</th>
                    <th className="pb-2 text-right w-28">Betrag</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {form.items.map((item, i) => {
                    const net = item.quantity * item.unitPrice;
                    return (
                      <tr key={i}>
                        <td className="py-1.5 pr-2">
                          <input value={item.description} onChange={e => setItem(i, 'description', e.target.value)}
                            placeholder="Dienstleistung / Produkt" className={inputCls} />
                        </td>
                        <td className="py-1.5 px-1">
                          <input type="number" min={0} step="0.01" value={item.quantity}
                            onChange={e => setItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                            className={`${inputCls} text-right`} />
                        </td>
                        <td className="py-1.5 px-1">
                          <input value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)}
                            placeholder="Stk." className={inputCls} />
                        </td>
                        <td className="py-1.5 px-1">
                          <input type="number" min={0} step="0.01" value={item.unitPrice}
                            onChange={e => setItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`${inputCls} text-right`} />
                        </td>
                        <td className="py-1.5 px-1">
                          <select value={item.vatRate} onChange={e => setItem(i, 'vatRate', parseFloat(e.target.value))}
                            className={inputCls}>
                            <option value={0}>0%</option>
                            <option value={2.6}>2.6%</option>
                            <option value={3.8}>3.8%</option>
                            <option value={8.1}>8.1%</option>
                          </select>
                        </td>
                        <td className="py-1.5 pl-2 text-right font-medium text-slate-700">
                          {fmtCHF(net)}
                        </td>
                        <td className="py-1.5 pl-1">
                          <button type="button" onClick={() => removeItem(i)} disabled={form.items.length === 1}
                            className="rounded p-1 text-slate-300 hover:text-red-400 disabled:opacity-30">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Position hinzufügen
            </button>

            {/* Totals */}
            <div className="mt-4 ml-auto w-64 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Netto</span>
                <span>{fmtCHF(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>MwSt.</span>
                <span>{fmtCHF(vatTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-800">
                <span>Total CHF</span>
                <span>{fmtCHF(total)}</span>
              </div>
            </div>
          </div>

          {/* ── QR / IBAN ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Eigenes IBAN (für QR-Rechnung)
              </label>
              <input value={form.iban ?? ''} onChange={e => set('iban')(e.target.value)}
                placeholder="CH56 0483 5012 3456 7800 9" className={inputCls} />
              <p className="mt-1 text-[10px] text-slate-400">Falls leer, wird das IBAN aus den Einstellungen verwendet</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Referenz (optional)</label>
              <input value={form.reference ?? ''} onChange={e => set('reference')(e.target.value)}
                placeholder="21 00000 00003 13947 14300 09017" className={inputCls} />
            </div>
          </div>

          {/* ── Notizen ── */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notizen / Zahlungskonditionen</label>
            <textarea value={form.notes ?? ''} onChange={e => set('notes')(e.target.value)} rows={2}
              placeholder="Zahlbar innerhalb 30 Tagen. Vielen Dank für Ihren Auftrag."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Abbrechen
            </button>
            <button type="submit" disabled={!form.contactName.trim() || form.items.length === 0}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
              {isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete confirm ───────────────────────────────────────────────────────────
const DeleteDialog = ({ number, onConfirm, onClose }: { number: string; onConfirm: () => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
      <h3 className="mb-2 text-base font-semibold text-slate-800">Rechnung löschen</h3>
      <p className="mb-6 text-sm text-slate-500">
        Möchtest du Rechnung <span className="font-medium text-slate-700">«{number}»</span> wirklich löschen?
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Abbrechen</button>
        <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Löschen</button>
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Rechnungen() {
  const location = useLocation();
  const isDemo   = location.pathname.startsWith('/demo');

  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [modal,     setModal]     = useState<'add' | 'edit' | null>(null);
  const [editing,   setEditing]   = useState<Invoice | null>(null);
  const [deleting,  setDeleting]  = useState<Invoice | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'Alle'>('Alle');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) {
      setInvoices(loadInvoices());
      try {
        const raw = localStorage.getItem('bookitty.contacts');
        if (raw) setContacts(JSON.parse(raw));
      } catch {/**/ }
    } else {
      api.invoices.list().then(setInvoices).catch(console.error);
      api.contacts.list().then(setContacts).catch(console.error);
    }
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) saveInvoices(invoices);
  }, [invoices, isDemo]);

  // ── Auto-mark overdue ─────────────────────────────────────────────────────
  useEffect(() => {
    setInvoices(prev => prev.map(inv =>
      isOverdue(inv) ? { ...inv, status: 'Überfällig' } : inv
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const offen     = invoices.filter(i => i.status === 'Versendet' || i.status === 'Überfällig');
    const total     = offen.reduce((s, i) => s + (calcInvoiceTotals(i.items).total), 0);
    const overdue   = invoices.filter(i => i.status === 'Überfällig');
    return { offen: offen.length, total, overdue: overdue.length };
  }, [invoices]);

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    filterStatus === 'Alle' ? invoices : invoices.filter(i => i.status === filterStatus),
    [invoices, filterStatus]
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (form: Omit<Invoice, 'id'>, id?: string) => {
    if (id) {
      const updated = { ...form, id };
      setInvoices(prev => prev.map(i => i.id === id ? updated : i));
      if (!isDemo) await api.invoices.update(updated).catch(console.error);
      setNotification({ type: 'success', title: 'Gespeichert', message: `${form.number} wurde aktualisiert.` });
    } else {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
      const created: Invoice = { ...form, id: newId };
      setInvoices(prev => [created, ...prev]);
      if (!isDemo) await api.invoices.create(created).catch(console.error);
      setNotification({ type: 'success', title: 'Rechnung erstellt', message: `${form.number} wurde erstellt.` });
    }
    setModal(null);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const num = deleting.number;
    setInvoices(prev => prev.filter(i => i.id !== deleting.id));
    if (!isDemo) await api.invoices.remove(deleting.id).catch(console.error);
    setDeleting(null);
    setNotification({ type: 'success', title: 'Gelöscht', message: `${num} wurde entfernt.` });
  };

  const handleStatusChange = (id: string, status: InvoiceStatus) => {
    setInvoices(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, status };
      if (!isDemo) api.invoices.update(updated).catch(console.error);
      return updated;
    }));
  };

  const handleExportPDF = async (inv: Invoice) => {
    setExporting(inv.id);
    try {
      await exportInvoicePDF(inv);
    } catch (e) {
      setNotification({ type: 'error', title: 'PDF-Fehler', message: 'Der PDF-Export ist fehlgeschlagen.' });
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Rechnungen"
        subtitle={`${invoices.length} total · ${stats.offen} offen · ${stats.overdue > 0 ? stats.overdue + ' überfällig' : 'keine überfällig'}`}
        action={
          <button
            onClick={() => { setEditing(null); setModal('add'); }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Neue Rechnung
          </button>
        }
      />

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{invoices.length}</div>
          <div className="mt-0.5 text-xs text-slate-500">Total</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.offen}</div>
          <div className="mt-0.5 text-xs text-slate-500">Offen (CHF {fmtCHF(stats.total)})</div>
        </div>
        <div className={`rounded-xl border p-4 text-center shadow-sm ${stats.overdue > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
          <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>{stats.overdue}</div>
          <div className="mt-0.5 text-xs text-slate-500">Überfällig</div>
        </div>
      </div>

      {/* ── Filter ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(['Alle', 'Entwurf', 'Versendet', 'Bezahlt', 'Überfällig', 'Storniert'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">
            {filterStatus !== 'Alle' ? `Keine Rechnungen mit Status «${filterStatus}»` : 'Noch keine Rechnungen'}
          </p>
          {filterStatus === 'Alle' && (
            <button onClick={() => { setEditing(null); setModal('add'); }}
              className="mt-3 text-sm text-slate-500 underline hover:text-slate-700">
              Erste Rechnung erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Nr.</th>
                <th className="px-4 py-3 text-left">Empfänger</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">Datum</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Fällig</th>
                <th className="px-4 py-3 text-right">Betrag</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => {
                const { total } = calcInvoiceTotals(inv.items);
                const overdue   = isOverdue(inv) || inv.status === 'Überfällig';
                return (
                  <tr key={inv.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{inv.number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{inv.contactName}</div>
                      {inv.contactCompany && inv.contactCompany !== inv.contactName && (
                        <div className="text-xs text-slate-400">{inv.contactCompany}</div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{fmtDate(inv.date)}</td>
                    <td className={`hidden px-4 py-3 md:table-cell font-medium ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
                      {fmtDate(inv.dueDate)}
                      {overdue && <span className="ml-1 text-[10px]">⚠</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {inv.currency} {fmtCHF(total)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={inv.status}
                        onChange={e => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                        className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STATUS_STYLE[inv.status]}`}
                      >
                        {(['Entwurf', 'Versendet', 'Bezahlt', 'Überfällig', 'Storniert'] as InvoiceStatus[]).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* PDF export */}
                        <button title="PDF / QR-Rechnung exportieren"
                          onClick={() => handleExportPDF(inv)}
                          disabled={exporting === inv.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
                          {exporting === inv.id ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </button>
                        {/* Edit */}
                        <button title="Bearbeiten"
                          onClick={() => { setEditing(inv); setModal('edit'); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button title="Löschen"
                          onClick={() => setDeleting(inv)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {(modal === 'add' || modal === 'edit') && (
        <InvoiceForm
          initial={modal === 'edit' ? editing : null}
          contacts={contacts}
          existingInvoices={invoices}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditing(null); }}
        />
      )}

      {deleting && (
        <DeleteDialog
          number={deleting.number}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      {notification && (
        <NotificationModal
          open
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
