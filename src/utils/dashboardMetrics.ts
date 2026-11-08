import type { Booking } from '../types';

export const dashboardMetrics = (bookings: Booking[], today: string) => {
  const year = Number(today.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const yearToDate = bookings.filter((booking) => booking.date >= yearStart && booking.date <= today);
  const chfYearToDate = yearToDate.filter((booking) => booking.currency.toUpperCase() === 'CHF');
  const monthCount = Number(today.slice(5, 7));
  const months = Array.from({ length: monthCount }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    const rows = chfYearToDate.filter((booking) => booking.date.slice(0, 7) === `${year}-${month}`);
    return {
      label: new Intl.DateTimeFormat('de-CH', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, index, 1))),
      income: rows.filter((booking) => booking.type === 'Einnahme').reduce((sum, booking) => sum + booking.amount, 0),
      expenses: rows.filter((booking) => booking.type === 'Ausgabe').reduce((sum, booking) => sum + booking.amount, 0),
    };
  });
  const overdue = bookings.filter((booking) => booking.paymentStatus === 'Offen' && booking.dueDate && booking.dueDate < today);
  const overdueCurrencies = [...new Set(overdue.map((booking) => booking.currency.toUpperCase()))];

  return {
    year,
    yearStart,
    chfYearToDate,
    income: chfYearToDate.filter((booking) => booking.type === 'Einnahme').reduce((sum, booking) => sum + booking.amount, 0),
    expenses: chfYearToDate.filter((booking) => booking.type === 'Ausgabe').reduce((sum, booking) => sum + booking.amount, 0),
    months,
    hasForeign: yearToDate.some((booking) => booking.currency.toUpperCase() !== 'CHF'),
    overdue,
    overdueCurrencies,
    overdueAmount: overdueCurrencies.length === 1 ? overdue.reduce((sum, booking) => sum + booking.amount, 0) : null,
  };
};