import { accountKey } from '../data/chAccounts';
import type { Booking } from '../types';

export function calculateFerPreview(bookings: Booking[], year: number) {
  const balance: Record<string, number> = {};
  const period: Record<string, number> = {};
  const issues = new Set<string>();
  const end = `${year}-12-31`;
  const start = `${year}-01-01`;

  for (const booking of bookings) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || Number.isNaN(Date.parse(`${booking.date}T00:00:00Z`)) || new Date(`${booking.date}T00:00:00Z`).toISOString().slice(0, 10) !== booking.date) {
      issues.add('Buchungen mit ungültigem Datum können nicht ausgewertet werden.');
      continue;
    }
    if (booking.date > end) continue;
    const debit = accountKey(booking.account);
    const credit = accountKey(booking.contraAccount);
    if (!/^[1-9]\d{3}$/.test(debit) || !/^[1-9]\d{3}$/.test(credit)) {
      issues.add('Buchungen ohne gültige vierstellige Kontonummer können nicht ausgewertet werden.');
      continue;
    }
    if (booking.currency !== 'CHF') {
      issues.add('Fremdwährungsbuchungen benötigen eine verlässliche CHF-Umrechnung, die hier noch nicht verfügbar ist.');
      continue;
    }
    if (!Number.isFinite(booking.amount) || booking.amount < 0) {
      issues.add('Buchungen mit ungültigem Betrag können nicht ausgewertet werden.');
      continue;
    }
    balance[debit] = (balance[debit] ?? 0) + booking.amount;
    balance[credit] = (balance[credit] ?? 0) - booking.amount;
    if (booking.date >= start && !debit.startsWith('9') && !credit.startsWith('9')) {
      period[debit] = (period[debit] ?? 0) + booking.amount;
      period[credit] = (period[credit] ?? 0) - booking.amount;
    }
  }

  const sum = (values: Record<string, number>, min: number, max: number) =>
    Object.entries(values).reduce((total, [code, amount]) => Number(code) >= min && Number(code) <= max ? total + amount : total, 0);
  const umlauf = sum(balance, 1000, 1399);
  const anlagen = sum(balance, 1400, 1999);
  const fk = -sum(balance, 2000, 2799);
  const ek = -sum(balance, 2800, 2999);
  const ertrag = -sum(period, 3000, 3999);
  const aufwand = sum(period, 4000, 6999);
  const uebrigerErfolg = -sum(period, 7000, 8899) - sum(period, 8901, 8999);
  const steuern = sum(period, 8900, 8900);
  const zwischenergebnis = ertrag - aufwand;
  return {
    issues: [...issues], umlauf, anlagen, total_a: umlauf + anlagen, fk, ek, total_p: fk + ek,
    ertrag, aufwand, zwischenergebnis, uebrigerErfolg, steuern,
    reingewinn: zwischenergebnis + uebrigerErfolg - steuern,
    fluessig: sum(balance, 1000, 1099), forderungen: sum(balance, 1100, 1199),
    vorraete: sum(balance, 1200, 1299), abgrenzungen: sum(balance, 1300, 1399),
    finanzanlagen: sum(balance, 1400, 1499), sachanlagen: sum(balance, 1500, 1699),
    sonstigeAnlagen: sum(balance, 1700, 1999), kurzfristig: -sum(balance, 2000, 2399),
    langfristig: -sum(balance, 2400, 2799), kapital: -sum(balance, 2800, 2899),
    reserven: -sum(balance, 2900, 2999),
  };
}