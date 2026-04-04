import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import BookingTable from '../components/BookingTable';
import SectionHeader from '../components/SectionHeader';
import NotificationModal from '../components/NotificationModal';
import { useBookkeeping } from '../store/BookkeepingContext';
import { useAuth } from '../store/AuthContext';
import type { Booking, BookingDraft, BookingType, PaymentStatus } from '../types';
import { useKittyHighlight } from '../hooks/useKittyHighlight';
import { autoCategorizeDraft } from '../utils/kittySuggester';

const todayStr = () => new Date().toISOString().split('T')[0];

const Buchungen = () => {
  const { bookings, addBooking, removeBooking, updateBooking } = useBookkeeping();
  const { isReadonly } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledDraft, setPrefilledDraft] = useState<Partial<BookingDraft> | undefined>();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notify, setNotify] = useState<{ open: boolean; type: 'success' | 'error'; title: string; message: string }>({
    open: false, type: 'success', title: '', message: '',
  });
  const highlightBtn = useKittyHighlight('btn-neue-buchung');
  const [autoDismissed, setAutoDismissed] = useState(false);

  // Bookings that could be auto-categorized (uncategorized = default account 4000/6xxx and generic)
  const autoSuggestions = useMemo(() => {
    if (autoDismissed) return [];
    return bookings
      .filter(b => !b.account || b.account.startsWith('4000') || b.account === '')
      .map(b => ({ booking: b, draft: autoCategorizeDraft(b.description, b.amount, b.type, b.date) }))
      .filter(x => x.draft !== null) as { booking: Booking; draft: BookingDraft }[];
  }, [bookings, autoDismissed]);

  const applyAllSuggestions = () => {
    for (const { booking, draft } of autoSuggestions) {
      updateBooking(booking.id, draft);
    }
    setAutoDismissed(true);
    setNotify({ open: true, type: 'success', title: 'Auto-Kategorisierung', message: `${autoSuggestions.length} Buchung${autoSuggestions.length !== 1 ? 'en' : ''} automatisch kategorisiert.` });
  };

  const pendingDeleteBooking = bookings.find((b) => b.id === pendingDeleteId);
  const detailBooking = bookings.find((b) => b.id === detailBookingId);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefilledDraft(partial);
      setIsModalOpen(true);
      setSearchParams({}, { replace: true }); // URL bereinigen
    }
  }, [searchParams, setSearchParams]);

  const closeModal = () => {
    setIsModalOpen(false);
    setPrefilledDraft(undefined);
    setEditingBooking(null);
  };

  const handleSubmit = (draft: Parameters<typeof addBooking>[0]) => {
    if (editingBooking) {
      updateBooking(editingBooking.id, draft);
      setNotify({ open: true, type: 'success', title: 'Buchung gespeichert', message: `„${draft.description}“ wurde erfolgreich aktualisiert.` });
    } else {
      addBooking(draft);
      setNotify({ open: true, type: 'success', title: 'Buchung erstellt', message: `„${draft.description}“ wurde erfolgreich erfasst.` });
    }
    closeModal();
  };

  const openEdit = (id: string) => {
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setEditingBooking(b);
    setPrefilledDraft(undefined);
    setIsModalOpen(true);
  };

  const openDetails = (id: string) => {
    setDetailBookingId(id);
  };

  return (
    <div className="space-y-6">
      <NotificationModal
        open={notify.open}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((n) => ({ ...n, open: false }))}
      />
      <SectionHeader
        title="Buchungen"
        subtitle="Erfassen, prüfen und verwalten Sie alle Buchungen."
        action={
          !isReadonly ? (
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
          ) : (
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-400">Nur-Lesen</span>
          )
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

      {/* ── Auto-Kategorisierung Banner ── */}
      {!isReadonly && autoSuggestions.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800">
              Kitty kann {autoSuggestions.length} Buchung{autoSuggestions.length !== 1 ? 'en' : ''} automatisch kategorisieren
            </p>
            <ul className="mt-1 space-y-0.5">
              {autoSuggestions.slice(0, 3).map(({ booking, draft }) => (
                <li key={booking.id} className="text-xs text-indigo-700">
                  <span className="font-medium">{booking.description}</span>
                  {' → '}
                  <span className="font-mono">{draft.account}</span>
                </li>
              ))}
              {autoSuggestions.length > 3 && <li className="text-xs text-indigo-500">… und {autoSuggestions.length - 3} weitere</li>}
            </ul>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={applyAllSuggestions}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
              Alle übernehmen
            </button>
            <button onClick={() => setAutoDismissed(true)} className="text-indigo-400 hover:text-indigo-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <BookingTable
        bookings={bookings}
        onDelete={(id) => setPendingDeleteId(id)}
        onEdit={openEdit}
        onView={openDetails}
      />

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
                onClick={() => { removeBooking(pendingDeleteBooking.id); setPendingDeleteId(null); setNotify({ open: true, type: 'success', title: 'Buchung gelöscht', message: `„${pendingDeleteBooking.description}“ wurde gelöscht.` }); }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Löschen bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {detailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Buchungsdetails</h3>
                <p className="mt-1 text-sm text-slate-500">{detailBooking.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailBookingId(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Schliessen"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Datum</p>
                <p className="font-medium text-slate-900">{detailBooking.date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Betrag</p>
                <p className="font-semibold text-slate-900">
                  {new Intl.NumberFormat('de-CH', { style: 'currency', currency: detailBooking.currency }).format(detailBooking.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Sollkonto</p>
                <p className="font-medium text-slate-900">{detailBooking.account}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Habenkonto</p>
                <p className="font-medium text-slate-900">{detailBooking.contraAccount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Kategorie</p>
                <p className="font-medium text-slate-900">{detailBooking.category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Typ</p>
                <p className="font-medium text-slate-900">{detailBooking.type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="font-medium text-slate-900">{detailBooking.paymentStatus}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Fälligkeit</p>
                <p className="font-medium text-slate-900">{detailBooking.dueDate || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">MwSt-Satz</p>
                <p className="font-medium text-slate-900">{detailBooking.vatRate ?? 0}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">MwSt-Betrag</p>
                <p className="font-medium text-slate-900">
                  {detailBooking.vatAmount !== null && detailBooking.vatAmount !== undefined
                    ? new Intl.NumberFormat('de-CH', { style: 'currency', currency: detailBooking.currency }).format(detailBooking.vatAmount)
                    : '—'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDetailBookingId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Schliessen
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailBookingId(null);
                  openEdit(detailBooking.id);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Bearbeiten
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl">
            <BookingForm
              key={editingBooking?.id ?? 'new'}
              onSubmit={handleSubmit}
              onCancel={closeModal}
              initialValues={editingBooking ?? prefilledDraft}
              editMode={!!editingBooking}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Buchungen;
