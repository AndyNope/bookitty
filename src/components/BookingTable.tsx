import { useState } from 'react';
import type { Booking } from '../types';

const sendToKitty = (booking: Booking) =>
  window.dispatchEvent(new CustomEvent('kitty:context', { detail: booking }));

const currency = (value: number, currencyCode: string) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);

const today = () => new Date().toISOString().split('T')[0];

const DueBadge = ({ dueDate, paymentStatus }: { dueDate?: string; paymentStatus: string }) => {
  if (!dueDate || paymentStatus === 'Bezahlt') return <span className="text-slate-300">—</span>;
  const t = today();
  const diffMs = new Date(dueDate).getTime() - new Date(t).getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Überfällig {Math.abs(diffDays)}T
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Heute fällig
      </span>
    );
  }
  if (diffDays <= 7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 whitespace-nowrap">
        In {diffDays}T fällig
      </span>
    );
  }
  return (
    <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">{dueDate}</span>
  );
};

const BookingTable = ({
  bookings,
  onDelete,
  onEdit,
  onView,
}: {
  bookings: Booking[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const hasActions = Boolean(onDelete || onEdit || onView);

  return (
    <div className="overflow-x-auto overflow-y-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1000px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Datum</th>
            <th className="px-4 py-3">Beschreibung</th>
            <th className="px-4 py-3">
              <span className="text-emerald-600">Soll</span>
            </th>
            <th className="px-4 py-3">
              <span className="text-slate-500">Haben</span>
            </th>
            <th className="px-4 py-3 text-right">Betrag</th>
            <th className="px-4 py-3">Typ</th>
            <th className="px-4 py-3">Fälligkeit</th>
            {hasActions && <th className="px-4 py-3 text-right" />}
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-t border-slate-100 group">
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {booking.date}
              </td>
              <td className="px-4 py-3 text-slate-900">
                <div className="flex items-center gap-2">
                  <span
                    className="max-w-[260px] truncate"
                    title={booking.description}
                  >
                    {booking.description}
                  </span>
                  {booking.pdfUrl && (
                    <a
                      href={booking.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Beleg öffnen"
                      className="shrink-0 text-slate-300 hover:text-slate-600 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </a>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700 text-xs">
                <span className="block max-w-[220px] truncate" title={booking.account}>
                  {booking.account}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">
                <span className="block max-w-[220px] truncate" title={booking.contraAccount}>
                  {booking.contraAccount}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                {currency(booking.amount, booking.currency)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    booking.type === 'Einnahme'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {booking.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <DueBadge dueDate={booking.dueDate} paymentStatus={booking.paymentStatus} />
              </td>
              {hasActions && (
                <td className="px-4 py-3 text-right relative">
                  <div
                    className="relative inline-flex"
                    onMouseLeave={() => setOpenMenuId(null)}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === booking.id ? null : booking.id))
                      }
                      className="rounded-lg px-2 py-1 text-slate-400 hover:text-slate-700"
                      aria-label="Aktionen"
                    >
                      <span className="text-lg leading-none">…</span>
                    </button>
                    {openMenuId === booking.id && (
                      <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            sendToKitty(booking);
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                        >
                          Kitty fragen
                        </button>
                        {onView && (
                          <button
                            type="button"
                            onClick={() => {
                              onView(booking.id);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                          >
                            Details anzeigen
                          </button>
                        )}
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(booking.id);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                          >
                            Bearbeiten
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(booking.id);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                          >
                            Löschen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookingTable;
