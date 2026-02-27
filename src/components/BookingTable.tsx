import type { Booking } from '../types';

const currency = (value: number, currencyCode: string) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);

const BookingTable = ({
  bookings,
  onDelete,
}: {
  bookings: Booking[];
  onDelete?: (id: string) => void;
}) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
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
          {onDelete && <th className="px-4 py-3" />}
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
                <span>{booking.description}</span>
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
              {booking.account}
            </td>
            <td className="px-4 py-3 text-slate-400 text-xs">
              {booking.contraAccount}
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
            {onDelete && (
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(booking.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-xs font-semibold text-rose-500 hover:text-rose-700"
                  title="Buchung löschen"
                >
                  Löschen
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default BookingTable;
