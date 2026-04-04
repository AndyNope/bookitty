import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import SectionHeader from '../components/SectionHeader';
import NotificationModal from '../components/NotificationModal';
import { api } from '../services/api';
import type { Contact, Offer, OfferStatus, Invoice, InvoiceLineItem } from '../types';
import { calcInvoiceTotals } from '../utils/invoicePdf';
import jsPDF from 'jspdf';

// ─── Demo localStorage ────────────────────────────────────────────────────────
const STORAGE_KEY_OFFERS   = 'bookitty.offers';
const STORAGE_KEY_INVOICES = 'bookitty.invoices';

function loadOffers(): Offer[] {
  try { const r = localStorage.getItem(STORAGE_KEY_OFFERS); if (r) return JSON.parse(r); } catch {/**/}
  return [];
}
function saveOffers(o: Offer[]) { localStorage.setItem(STORAGE_KEY_OFFERS, JSON.stringify(o)); }

function loadInvoices(): Invoice[] {
  try { const r = localStorage.getItem(STORAGE_KEY_INVOICES); if (r) return JSON.parse(r); } catch {/**/}
  return [];
}
function saveInvoices(o: Invoice[]) { localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(o)); }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<OfferStatus, string> = {
  Entwurf:    'bg-slate-100 text-slate-600',
  Versendet:  'bg-blue-100 text-blue-700',
  Angenommen: 'bg-emerald-100 text-emerald-700',
  Abgelehnt:  'bg-red-100 text-red-700',
  Abgelaufen: 'bg-orange-100 text-orange-700',
};

function todayISO() { return new Date().toISOString().split('T')[0]; }
function plusDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; }
function fmtDate(iso: string) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; }
function fmtCHF(n: number) { return n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function genOfferNumber(existing: Offer[]): string {
  const year = new Date().getFullYear();
  const max  = existing.reduce((n, o) => {
    const m = o.number.match(/AN-\d{4}-(\d+)$/);
    return m ? Math.max(n, parseInt(m[1])) : n;
  }, 0);
  return `AN-${year}-${String(max + 1).padStart(3, '0')}`;
}

function genInvoiceNumber(existing: Invoice[]): string {
  const year = new Date().getFullYear();
  const max  = existing.reduce((n, i) => {
    const m = i.number.match(/RE-\d{4}-(\d+)$/);
    return m ? Math.max(n, parseInt(m[1])) : n;
  }, 0);
  return `RE-${year}-${String(max + 1).padStart(3, '0')}`;
}

function isExpired(o: Offer) {
  return o.status === 'Versendet' && o.validUntil < todayISO();
}

const EMPTY_ITEM: InvoiceLineItem = { description: '', quantity: 1, unit: 'Stk.', unitPrice: 0, vatRate: 8.1 };

// ─── PDF export (Offerte / Angebot) ──────────────────────────────────────────
async function exportOfferPDF(offer: Offer) {
  const { subtotal, total, vatMap } = calcInvoiceTotals(offer.items);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const M = 20; const R = W - M;
  let y = 20;

  const txt   = (t: string, x: number, yy: number, size = 10, color = [0, 0, 0]) => {
    doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]);
    doc.text(t, x, yy);
  };
  const right = (t: string, yy: number, size = 10) => {
    doc.setFontSize(size); doc.setTextColor(0);
    doc.text(t, R - doc.getTextWidth(t), yy);
  };
  const line  = (yy: number) => { doc.setDrawColor(220); doc.line(M, yy, R, yy); };

  // Header
  txt('ANGEBOT', M, y, 22); y += 8;
  txt(`Nr. ${offer.number}`, M, y, 11, [80, 80, 80]); y += 5;
  txt(`Datum: ${fmtDate(offer.date)}   ·   Gültig bis: ${fmtDate(offer.validUntil)}`, M, y, 9, [120, 120, 120]);
  y += 12;

  // Empfänger
  txt('Angebot für:', M, y, 8, [130, 130, 130]); y += 5;
  if (offer.contactCompany) { txt(offer.contactCompany, M, y, 10); y += 5; }
  txt(offer.contactName, M, y, 10); y += 5;
  if (offer.contactStreet) { txt(`${offer.contactStreet}`, M, y, 9, [80, 80, 80]); y += 4; }
  if (offer.contactZip || offer.contactCity) {
    txt(`${offer.contactZip ?? ''} ${offer.contactCity ?? ''}`.trim(), M, y, 9, [80, 80, 80]); y += 4;
  }
  y += 6; line(y); y += 6;

  // Items table header
  doc.setFillColor(245, 245, 245);
  doc.rect(M, y - 4, R - M, 7, 'F');
  txt('Pos.', M + 1, y, 8, [80, 80, 80]);
  txt('Beschreibung', M + 10, y, 8, [80, 80, 80]);
  right('Menge', y, 8); // simplified – full table would need col positions
  y += 6;
  line(y); y += 4;

  offer.items.forEach((item, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    const net = item.quantity * item.unitPrice;
    txt(`${i + 1}.`, M + 1, y, 9);
    txt(item.description || '—', M + 10, y, 9);
    txt(`${item.quantity} ${item.unit}`, M + 90, y, 9, [80, 80, 80]);
    txt(`à CHF ${fmtCHF(item.unitPrice)}`, M + 115, y, 9, [80, 80, 80]);
    right(`CHF ${fmtCHF(net)}`, y, 9);
    y += 6;
  });

  y += 4; line(y); y += 6;

  // Totals
  txt('Netto:', R - 70, y, 9, [80, 80, 80]); right(`CHF ${fmtCHF(subtotal)}`, y, 9); y += 5;
  for (const [rate, vat] of Object.entries(vatMap)) {
    txt(`MwSt ${rate}%:`, R - 70, y, 9, [80, 80, 80]); right(`CHF ${fmtCHF(vat as number)}`, y, 9); y += 5;
  }
  doc.setFontSize(11);
  txt('Total CHF:', R - 70, y + 1, 11); right(`CHF ${fmtCHF(total)}`, y + 1, 11);
  y += 10;

  if (offer.notes) {
    y += 4; line(y); y += 6;
    txt(offer.notes, M, y, 9, [80, 80, 80]);
  }

  doc.save(`Angebot-${offer.number}.pdf`);
}

// ─── Offer form ───────────────────────────────────────────────────────────────
const OfferForm = ({
  initial, contacts, existingOffers, onSave, onClose,
}: {
  initial: Partial<Offer> | null;
  contacts: Contact[];
  existingOffers: Offer[];
  onSave: (o: Omit<Offer, 'id'>, id?: string) => void;
  onClose: () => void;
}) => {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<Omit<Offer, 'id'>>({
    number:         initial?.number         ?? genOfferNumber(existingOffers),
    date:           initial?.date           ?? todayISO(),
    validUntil:     initial?.validUntil     ?? plusDays(30),
    status:         initial?.status         ?? 'Entwurf',
    contactId:      initial?.contactId,
    contactName:    initial?.contactName    ?? '',
    contactCompany: initial?.contactCompany,
    contactStreet:  initial?.contactStreet,
    contactZip:     initial?.contactZip,
    contactCity:    initial?.contactCity,
    contactCountry: initial?.contactCountry ?? 'CH',
    contactEmail:   initial?.contactEmail,
    items:          initial?.items?.length ? initial.items : [{ ...EMPTY_ITEM }],
    currency:       initial?.currency       ?? 'CHF',
    notes:          initial?.notes,
    convertedToInvoiceId: initial?.convertedToInvoiceId,
  });

  const set = <K extends keyof typeof form>(k: K) => (v: typeof form[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const { subtotal, vatTotal, total } = useMemo(() => calcInvoiceTotals(form.items), [form.items]);

  const handleContactSelect = (id: string) => {
    const c = contacts.find(c => c.id === id);
    if (!c) return;
    setForm(prev => ({
      ...prev, contactId: c.id, contactName: c.name,
      contactCompany: c.company ?? '', contactStreet: c.street ?? '',
      contactZip: c.zip ?? '', contactCity: c.city ?? '',
      contactCountry: c.country ?? 'CH', contactEmail: c.email ?? '',
    }));
  };

  const setItem = (i: number, field: keyof InvoiceLineItem, val: string | number) =>
    setForm(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], [field]: val };
      return { ...prev, items };
    });

  const addItem    = () => setForm(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, j) => j !== i) }));

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">{isEdit ? 'Angebot bearbeiten' : 'Neues Angebot'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); if (form.contactName.trim()) onSave(form, initial?.id); }}
          className="flex flex-col gap-6 overflow-y-auto p-6">

          {/* Meta */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Angebotsnr.</label>
              <input value={form.number} onChange={e => set('number')(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Datum</label>
              <input type="date" value={form.date} onChange={e => set('date')(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Gültig bis</label>
              <input type="date" value={form.validUntil} onChange={e => set('validUntil')(e.target.value)} className={inputCls} />
              <div className="mt-1 flex gap-1">
                {[15, 30, 60].map(d => (
                  <button key={d} type="button" onClick={() => set('validUntil')(plusDays(d))}
                    className="rounded px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-slate-200">
                    +{d}T
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Empfänger */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Empfänger</h3>
            {contacts.length > 0 && (
              <div className="mb-3">
                <select onChange={e => handleContactSelect(e.target.value)} defaultValue="" className={inputCls}>
                  <option value="">— Kontakt wählen —</option>
                  {contacts.filter(c => c.type !== 'Lieferant').map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name *</label>
                <input value={form.contactName} onChange={e => set('contactName')(e.target.value)} required className={inputCls} />
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

          {/* Positionen */}
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
                  {form.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-2">
                        <input value={item.description}
                          onChange={e => setItem(i, 'description', e.target.value)}
                          placeholder="Beschreibung" className={inputCls} />
                      </td>
                      <td className="py-1.5 px-1">
                        <input type="number" min={0} step="0.01" value={item.quantity}
                          onChange={e => setItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className={`${inputCls} text-right`} />
                      </td>
                      <td className="py-1.5 px-1">
                        <input value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)} className={inputCls} />
                      </td>
                      <td className="py-1.5 px-1">
                        <input type="number" min={0} step="0.01" value={item.unitPrice}
                          onChange={e => setItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className={`${inputCls} text-right`} />
                      </td>
                      <td className="py-1.5 px-1">
                        <select value={item.vatRate} onChange={e => setItem(i, 'vatRate', parseFloat(e.target.value))} className={inputCls}>
                          <option value={0}>0%</option>
                          <option value={2.6}>2.6%</option>
                          <option value={3.8}>3.8%</option>
                          <option value={8.1}>8.1%</option>
                        </select>
                      </td>
                      <td className="py-1.5 pl-2 text-right font-medium text-slate-700">
                        {fmtCHF(item.quantity * item.unitPrice)}
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
                  ))}
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
            <div className="mt-4 ml-auto w-64 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600"><span>Netto</span><span>{fmtCHF(subtotal)}</span></div>
              <div className="flex justify-between text-sm text-slate-600"><span>MwSt.</span><span>{fmtCHF(vatTotal)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-800">
                <span>Total CHF</span><span>{fmtCHF(total)}</span>
              </div>
            </div>
          </div>

          {/* Notizen */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notizen / Konditionen</label>
            <textarea value={form.notes ?? ''} onChange={e => set('notes')(e.target.value)} rows={2}
              placeholder="Dieses Angebot ist 30 Tage gültig. Preise verstehen sich exkl. MwSt."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Abbrechen</button>
            <button type="submit" disabled={!form.contactName.trim()}
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
      <h3 className="mb-2 text-base font-semibold text-slate-800">Angebot löschen</h3>
      <p className="mb-6 text-sm text-slate-500">Angebot <span className="font-medium">«{number}»</span> wirklich löschen?</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Abbrechen</button>
        <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Löschen</button>
      </div>
    </div>
  </div>
);

// ─── Convert confirm dialog ───────────────────────────────────────────────────
const ConvertDialog = ({ offer, onConfirm, onClose }: { offer: Offer; onConfirm: () => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-800">Zu Rechnung umwandeln</h3>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Angebot <span className="font-medium">«{offer.number}»</span> wird als neue Rechnung erstellt.
        Das Angebot wird als «Angenommen» markiert.
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Abbrechen</button>
        <button onClick={onConfirm} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Rechnung erstellen
        </button>
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Offerten() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo   = location.pathname.startsWith('/demo');
  const { isReadonly } = useAuth();
  const base     = isDemo ? '/demo' : '/app';

  const [offers,       setOffers]       = useState<Offer[]>([]);
  const [contacts,     setContacts]     = useState<Contact[]>([]);
  const [modal,        setModal]        = useState<'add' | 'edit' | null>(null);
  const [editing,      setEditing]      = useState<Offer | null>(null);
  const [deleting,     setDeleting]     = useState<Offer | null>(null);
  const [converting,   setConverting]   = useState<Offer | null>(null);
  const [exporting,    setExporting]    = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OfferStatus | 'Alle'>('Alle');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) {
      setOffers(loadOffers());
      try { const r = localStorage.getItem('bookitty.contacts'); if (r) setContacts(JSON.parse(r)); } catch {/**/}
    } else {
      api.offers.list().then(setOffers).catch(console.error);
      api.contacts.list().then(setContacts).catch(console.error);
    }
  }, [isDemo]);

  useEffect(() => { if (isDemo) saveOffers(offers); }, [offers, isDemo]);

  // Auto-mark expired
  useEffect(() => {
    setOffers(prev => prev.map(o => isExpired(o) ? { ...o, status: 'Abgelaufen' } : o));
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      offers.length,
    offen:      offers.filter(o => o.status === 'Versendet').length,
    angenommen: offers.filter(o => o.status === 'Angenommen').length,
    abgelaufen: offers.filter(o => o.status === 'Abgelaufen').length,
  }), [offers]);

  const filtered = useMemo(() =>
    filterStatus === 'Alle' ? offers : offers.filter(o => o.status === filterStatus),
    [offers, filterStatus]
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (form: Omit<Offer, 'id'>, id?: string) => {
    if (id) {
      const updated = { ...form, id };
      setOffers(prev => prev.map(o => o.id === id ? updated : o));
      if (!isDemo) await api.offers.update(updated).catch(console.error);
      setNotification({ type: 'success', title: 'Gespeichert', message: `${form.number} aktualisiert.` });
    } else {
      const newId = crypto.randomUUID();
      const created: Offer = { ...form, id: newId };
      setOffers(prev => [created, ...prev]);
      if (!isDemo) await api.offers.create(created).catch(console.error);
      setNotification({ type: 'success', title: 'Angebot erstellt', message: `${form.number} wurde erstellt.` });
    }
    setModal(null); setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const num = deleting.number;
    setOffers(prev => prev.filter(o => o.id !== deleting.id));
    if (!isDemo) await api.offers.remove(deleting.id).catch(console.error);
    setDeleting(null);
    setNotification({ type: 'success', title: 'Gelöscht', message: `${num} entfernt.` });
  };

  const handleStatusChange = (id: string, status: OfferStatus) => {
    setOffers(prev => prev.map(o => {
      if (o.id !== id) return o;
      const updated = { ...o, status };
      if (!isDemo) api.offers.update(updated).catch(console.error);
      return updated;
    }));
  };

  // ── 1-Klick Umwandlung → Rechnung ────────────────────────────────────────
  const handleConvert = async () => {
    if (!converting) return;
    const existingInvoices = isDemo ? loadInvoices() : [];
    const invoiceNumber = genInvoiceNumber(existingInvoices);

    const newInvoice: Invoice = {
      id:             crypto.randomUUID(),
      number:         invoiceNumber,
      date:           todayISO(),
      dueDate:        plusDays(30),
      status:         'Entwurf',
      contactId:      converting.contactId,
      contactName:    converting.contactName,
      contactCompany: converting.contactCompany,
      contactStreet:  converting.contactStreet,
      contactZip:     converting.contactZip,
      contactCity:    converting.contactCity,
      contactCountry: converting.contactCountry,
      contactEmail:   converting.contactEmail,
      items:          converting.items,
      currency:       converting.currency,
      notes:          converting.notes,
    };

    if (isDemo) {
      saveInvoices([newInvoice, ...existingInvoices]);
    } else {
      await api.invoices.create(newInvoice).catch(console.error);
    }

    // Mark offer as Angenommen + link
    const updatedOffer = { ...converting, status: 'Angenommen' as OfferStatus, convertedToInvoiceId: newInvoice.id };
    setOffers(prev => prev.map(o => o.id === converting.id ? updatedOffer : o));
    if (!isDemo) await api.offers.update(updatedOffer).catch(console.error);

    setConverting(null);
    setNotification({
      type: 'success',
      title: 'Rechnung erstellt',
      message: `${invoiceNumber} aus Angebot ${converting.number} erstellt.`,
    });
    setTimeout(() => navigate(`${base}/rechnungen`), 1500);
  };

  const handleExportPDF = async (offer: Offer) => {
    setExporting(offer.id);
    try { await exportOfferPDF(offer); }
    catch { setNotification({ type: 'error', title: 'PDF-Fehler', message: 'Export fehlgeschlagen.' }); }
    finally { setExporting(null); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Angebote"
        subtitle={`${stats.total} total · ${stats.offen} offen · ${stats.angenommen} angenommen`}
        action={
          !isReadonly ? (
          <button onClick={() => { setEditing(null); setModal('add'); }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Neues Angebot
          </button>
          ) : <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-400">Nur-Lesen</span>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: stats.total,      color: 'text-slate-800' },
          { label: 'Versendet',  value: stats.offen,      color: 'text-blue-600' },
          { label: 'Angenommen', value: stats.angenommen, color: 'text-emerald-600' },
          { label: 'Abgelaufen', value: stats.abgelaufen, color: stats.abgelaufen > 0 ? 'text-orange-600' : 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(['Alle', 'Entwurf', 'Versendet', 'Angenommen', 'Abgelehnt', 'Abgelaufen'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">
            {filterStatus !== 'Alle' ? `Keine Angebote mit Status «${filterStatus}»` : 'Noch keine Angebote'}
          </p>
          {filterStatus === 'Alle' && (
            <button onClick={() => { setEditing(null); setModal('add'); }}
              className="mt-3 text-sm text-slate-500 underline hover:text-slate-700">
              Erstes Angebot erstellen
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
                <th className="hidden px-4 py-3 text-left md:table-cell">Gültig bis</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(offer => {
                const { total } = calcInvoiceTotals(offer.items);
                const expired   = isExpired(offer) || offer.status === 'Abgelaufen';
                const converted = !!offer.convertedToInvoiceId;
                return (
                  <tr key={offer.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{offer.number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{offer.contactName}</div>
                      {offer.contactCompany && offer.contactCompany !== offer.contactName && (
                        <div className="text-xs text-slate-400">{offer.contactCompany}</div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{fmtDate(offer.date)}</td>
                    <td className={`hidden px-4 py-3 md:table-cell font-medium ${expired ? 'text-orange-600' : 'text-slate-500'}`}>
                      {fmtDate(offer.validUntil)}
                      {expired && <span className="ml-1 text-[10px]">⚠</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {offer.currency} {fmtCHF(total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select value={offer.status}
                          onChange={e => handleStatusChange(offer.id, e.target.value as OfferStatus)}
                          disabled={converted}
                          className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium outline-none ${STATUS_STYLE[offer.status]} disabled:opacity-60`}>
                          {(['Entwurf', 'Versendet', 'Angenommen', 'Abgelehnt', 'Abgelaufen'] as OfferStatus[]).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {converted && (
                          <span title="Zu Rechnung umgewandelt" className="text-emerald-500">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {/* Convert to invoice */}
                        {!converted && offer.status !== 'Abgelehnt' && (
                          <button title="Zu Rechnung umwandeln"
                            onClick={() => setConverting(offer)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </button>
                        )}
                        {/* PDF */}
                        <button title="PDF exportieren" onClick={() => handleExportPDF(offer)}
                          disabled={exporting === offer.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40">
                          {exporting === offer.id ? (
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
                        <button title="Bearbeiten" onClick={() => { setEditing(offer); setModal('edit'); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button title="Löschen" onClick={() => setDeleting(offer)}
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

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <OfferForm
          initial={modal === 'edit' ? editing : null}
          contacts={contacts}
          existingOffers={offers}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditing(null); }}
        />
      )}
      {deleting && <DeleteDialog number={deleting.number} onConfirm={handleDelete} onClose={() => setDeleting(null)} />}
      {converting && <ConvertDialog offer={converting} onConfirm={handleConvert} onClose={() => setConverting(null)} />}
      {notification && (
        <NotificationModal open type={notification.type} title={notification.title}
          message={notification.message} onClose={() => setNotification(null)} />
      )}
    </div>
  );
}
