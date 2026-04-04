import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

/* ── Types ────────────────────────────────────────────────────────── */
interface LineItem { description: string; quantity: number; unitPrice: number; vatRate: number; }
interface PortalInvoice {
  number: string;
  date: string;
  dueDate: string;
  status: string;
  contactName: string;
  items: LineItem[];
  currency: string;
  notes?: string;
  iban?: string;
  reference?: string;
  issuerCompany: string;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmt = (n: number, currency = 'CHF') =>
  n.toLocaleString('de-CH', { style: 'currency', currency, minimumFractionDigits: 2 });

const calcTotals = (items: LineItem[], currency = 'CHF') => {
  const net = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const vat = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.vatRate / 100), 0);
  return { net, vat, gross: net + vat, currency };
};

const statusColor = (status: string) => {
  const map: Record<string, string> = {
    'Bezahlt':   'bg-emerald-100 text-emerald-800',
    'Offen':     'bg-amber-100 text-amber-800',
    'Überfällig': 'bg-rose-100 text-rose-800',
    'Entwurf':   'bg-slate-100 text-slate-600',
    'Storniert': 'bg-slate-100 text-slate-500',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
};

/* ── Component ───────────────────────────────────────────────────── */
export default function Portal() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<PortalInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Kein Token angegeben.'); setLoading(false); return; }

    /* Try demo-mode: base64-encoded invoice data embedded in token */
    if (token.startsWith('demo_')) {
      try {
        const data = JSON.parse(atob(token.slice(5)));
        setInvoice(data);
        setLoading(false);
        return;
      } catch {
        /* fall through to API */
      }
    }

    const apiBase = import.meta.env.VITE_API_URL ?? '/api';
    fetch(`${apiBase}/portal.php?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? 'Fehler');
        return res.json();
      })
      .then(setInvoice)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Rechnung wird geladen …</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-5xl">🔍</div>
          <h1 className="text-lg font-semibold text-slate-900">Rechnung nicht gefunden</h1>
          <p className="text-sm text-slate-500">{error || 'Dieser Link ist ungültig oder abgelaufen.'}</p>
        </div>
      </div>
    );
  }

  const { net, vat, gross } = calcTotals(invoice.items, invoice.currency);
  const isOverdue = invoice.status === 'Offen' && invoice.dueDate && new Date(invoice.dueDate) < new Date();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Bookitty" className="h-8 w-8" />
            <span className="font-bold text-slate-900">Bookitty</span>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(isOverdue ? 'Überfällig' : invoice.status)}`}>
            {isOverdue ? 'Überfällig' : invoice.status}
          </span>
        </div>

        {/* Invoice card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Invoice header */}
          <div className="bg-slate-900 text-white px-6 py-5 flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rechnung</p>
              <p className="text-2xl font-bold mt-0.5">{invoice.number}</p>
              <p className="text-slate-300 text-sm mt-1">von {invoice.issuerCompany}</p>
            </div>
            <div className="text-right text-sm text-slate-300 space-y-0.5">
              <p>Datum: <span className="text-white">{invoice.date}</span></p>
              {invoice.dueDate && <p>Fällig: <span className={isOverdue ? 'text-rose-300 font-semibold' : 'text-white'}>{invoice.dueDate}</span></p>}
            </div>
          </div>

          {/* Recipient */}
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Empfänger</p>
            <p className="mt-1 font-medium text-slate-800">{invoice.contactName}</p>
          </div>

          {/* Items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left">Leistung / Artikel</th>
                  <th className="px-4 py-3 text-right">Menge</th>
                  <th className="px-4 py-3 text-right">Einheit</th>
                  <th className="px-4 py-3 text-right">MwSt</th>
                  <th className="px-6 py-3 text-right">Betrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3 text-slate-700">{item.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{item.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{fmt(item.unitPrice, invoice.currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-400">{item.vatRate}%</td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-800">{fmt(item.quantity * item.unitPrice, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 px-6 py-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Netto</span>
              <span className="tabular-nums">{fmt(net, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>MwSt</span>
              <span className="tabular-nums">{fmt(vat, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-100 pt-2 mt-2">
              <span>Total</span>
              <span className="tabular-nums">{fmt(gross, invoice.currency)}</span>
            </div>
          </div>

          {/* Payment details */}
          {(invoice.iban || invoice.reference) && (
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 space-y-1 text-sm text-slate-600">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Zahlungsdetails</p>
              {invoice.iban && (
                <p><span className="text-slate-400">IBAN:</span> <span className="font-mono">{invoice.iban}</span></p>
              )}
              {invoice.reference && (
                <p><span className="text-slate-400">Referenz:</span> <span className="font-mono">{invoice.reference}</span></p>
              )}
              <p><span className="text-slate-400">Betrag:</span> <strong>{fmt(gross, invoice.currency)}</strong></p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-500">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Bemerkungen</p>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Overdue notice */}
        {isOverdue && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
            Diese Rechnung ist überfällig (fällig: {invoice.dueDate}). Bitte begleichen Sie den ausstehenden Betrag zeitnah.
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          Dieser Link ist für {invoice.contactName} bestimmt · Powered by Bookitty
        </p>
      </div>
    </div>
  );
}
