import type { Booking } from '../types';

export type ForexRates = Record<string, number>;

export type ForexSnapshot = {
  base: 'CHF';
  date: string;
  requestedDate: string;
  rates: ForexRates;
  rateDates: Record<string, string>;
  source: string;
  retrievedAt: string;
};

export const toCHF = (amount: number, currency: string, rates: ForexRates): number | null => {
  if (!Number.isFinite(amount)) return null;
  if (currency.toUpperCase() === 'CHF') return amount;
  const rate = rates[currency.toUpperCase()];
  return Number.isFinite(rate) && rate > 0 ? amount / rate : null;
};

export const validForexSnapshot = (value: ForexSnapshot, requestedDate: string): boolean => {
  if (!value || value.base !== 'CHF' || value.source !== 'ECB via Frankfurter' || value.requestedDate !== requestedDate || !value.rates || !value.rateDates) return false;
  const entries = Object.entries(value.rates);
  return entries.length > 0 && entries.every(([code, rate]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0 && /^\d{4}-\d{2}-\d{2}$/.test(value.rateDates[code] ?? '') && value.rateDates[code] <= requestedDate);
};

export const provisionalBookings = (bookings: Booking[], snapshot: ForexSnapshot): { bookings: Booking[]; missing: string[] } => {
  const missing = new Set<string>();
  const converted = bookings.map((booking) => {
    const currency = booking.currency.toUpperCase();
    if (currency === 'CHF') return booking;
    const rateDate = snapshot.rateDates[currency];
    const age = rateDate ? (Date.parse(`${snapshot.requestedDate}T00:00:00Z`) - Date.parse(`${rateDate}T00:00:00Z`)) / 86400000 : Number.NaN;
    const amount = toCHF(booking.amount, currency, snapshot.rates);
    const vatAmount = booking.vatAmount === undefined || booking.vatAmount === null ? undefined : toCHF(booking.vatAmount, currency, snapshot.rates);
    if (amount === null || vatAmount === null || !Number.isFinite(age) || age < 0 || age > 7) {
      missing.add(currency || 'Unbekannt');
      return booking;
    }
    return { ...booking, amount, vatAmount, currency: 'CHF' };
  });
  return { bookings: converted, missing: [...missing].sort() };
};