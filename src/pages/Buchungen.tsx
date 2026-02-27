import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import BookingTable from '../components/BookingTable';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { BookingDraft, BookingType, PaymentStatus } from '../types';
import { useKittyHighlight } from '../hooks/useKittyHighlight';

const todayStr = () => new Date().toISOString().split('T')[0];

const Buchungen = () => {
  const { bookings, addBooking, removeBooking } = useBookkeeping();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledDraft, setPrefilledDraft] = useState<Partial<BookingDraft> | undefined>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightBtn = useKittyHighlight('btn-neue-buchung');

  const pendingDeleteBooking = bookings.find((b) => b.id === pendingDeleteId);

  // Überfällige offene Buchungen (mit gesetztem Fälligkeitsdatum)
  const today = todayStr();
  const overdueBookings = bookings.filter(
    (b) => b.paymentStatus === 'Offen' && b.dueDate && b.dueDate < today,
  );
  const overdueSum = overdueBookings.reduce((s, b) => s + b.amount, 0);
  const primaryCurrency = bookings[0]?.currency ?? 'CHF';
  const fmt = (v: number) =>
    new Intl.NumberFormat('de-CH', { style: 'currency', currency: primaryCurrency }).format(v);

  // Kitty-Buchungsvorschlag via URL-Params öffnen
  useEffect(() => {
    if (searchParams.get('kitty') === '1') {
      const partial: Partial<BookingDraft> = {};
      if (searchParams.get('kitty_desc'))   partial.description   = searchParams.get('kitty_desc')!;
      if (searchParams.get('kitty_debit'))  partial.account       = searchParams.get('kitty_debit')!;
      if (searchParams.get('kitty_credit')) partial.contraAccount = searchParams.get('kitty_credit')!;
      if (searchParams.get('kitty_vat'))    partial.vatRate       = parseFloat(searchParams.get('kitty_vat')!);
      if (searchParams.get('kitty_amount')) partial.amount        = parseFloat(searchParams.get('kitty_amount')!);
      if (searchParams.get('kitty_type'))   partial.type          = searchParams.get('kitty_type') as BookingType;
      if (searchParams.get('kitty_status')) partial.paymentStatus = searchParams.get('kitty_status') as PaymentStatus;
      setPrefilledDraft(partial);
      setIsModalOpen(true);
      setSearchParams({}, { replace: true }); // URL bereinigen
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = (draft: Parameters<typeof addBooking>[0]) => {
    addBooking(draft);
    setIsModalOpen(false);
    setPrefilledDraft(undefined);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Buchungen"
        subtitle="Erfassen, prüfen und verwalten Sie alle Buchungen."
        action={
          <button
            type="button"
            data-kitty-id="btn-neue-buchung"
            onClick={() => { setPrefilledDraft(undefined); setIsModalOpen(true); }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              highlightBtn
                ? 'bg-emerald-500 ring-4 ring-emerald-300 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            Neue Buchung
          </button>
        }
      />

      {/* ── Mahnungen-Banner: überfällige Buchungen ── */}
      {overdueBookings.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-800">
              {overdueBookings.length} überfällige Zahlung{overdueBookings.length > 1 ? 'en' : ''} – {fmt(overdueSum)} ausstehend
            </p>
            <ul className="mt-1 space-y-0.5">
              {overdueBookings.slice(0, 5).map((b) => {
                const diffDays = Math.round(
                  (new Date(today).getTime() - new Date(b.dueDate!).getTime()) / 86_400_000,
                );
                return (
                  <li key={b.id} className="text-xs text-rose-700">
                    <span className="font-medium">{b.description}</span>
                    {' · '}
                    {new Intl.NumberFormat('de-CH', { style: 'currency', currency: b.currency }).format(b.amount)}
                    {' · '}
                    <span className="font-semibold">{diffDays} Tag{diffDays !== 1 ? 'e' : ''} überfällig</span>
                  </li>
                );
              })}
              {overdueBookings.length > 5 && (
                <li className="text-xs text-rose-500">… und {overdueBookings.length - 5} weitere</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <BookingTable bookings={bookings} onDelete={(id) => setPendingDeleteId(id)} />

      {/* ── Delete confirmation modal ── */}
      {pendingDeleteBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-base font-semibold text-slate-900">Buchung löschen?</h3>
            <p className="mt-1 text-sm text-slate-500">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm space-y-1">
              <p className="font-medium text-slate-900">{pendingDeleteBooking.description}</p>
              <p className="text-slate-500">{pendingDeleteBooking.date} · {pendingDeleteBooking.account}</p>
              <p className={`font-semibold tabular-nums ${
                pendingDeleteBooking.type === 'Einnahme' ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {new Intl.NumberFormat('de-CH', { style: 'currency', currency: pendingDeleteBooking.currency }).format(pendingDeleteBooking.amount)}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => { removeBooking(pendingDeleteBooking.id); setPendingDeleteId(null); }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Löschen bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl">
            <BookingForm
              onSubmit={handleSubmit}
              onCancel={() => { setIsModalOpen(false); setPrefilledDraft(undefined); }}
              initialValues={prefilledDraft}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Buchungen;
