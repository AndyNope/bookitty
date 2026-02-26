import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import BookingTable from '../components/BookingTable';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';
import type { BookingDraft, BookingType, PaymentStatus } from '../types';
import { useKittyHighlight } from '../hooks/useKittyHighlight';

const Buchungen = () => {
  const { bookings, addBooking, removeBooking } = useBookkeeping();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledDraft, setPrefilledDraft] = useState<Partial<BookingDraft> | undefined>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightBtn = useKittyHighlight('btn-neue-buchung');

  const pendingDeleteBooking = bookings.find((b) => b.id === pendingDeleteId);

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
