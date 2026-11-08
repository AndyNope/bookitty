import assert from 'node:assert/strict';
import test from 'node:test';
import { provisionalBookings, toCHF, validForexSnapshot, type ForexSnapshot } from '../src/utils/forex';
import type { Booking } from '../src/types';

test('converts from foreign units per CHF and rejects unknown rates', () => {
  assert.equal(toCHF(100, 'CHF', {}), 100);
  assert.equal(toCHF(120, 'EUR', { EUR: 1.2 }), 100);
  assert.equal(toCHF(100, 'USD', {}), null);
  assert.equal(toCHF(100, 'EUR', { EUR: 0 }), null);
  assert.equal(toCHF(100, 'EUR', { EUR: Number.NaN }), null);
});

test('rejects fallback and mismatched dated snapshots', () => {
  const snapshot: ForexSnapshot = { base: 'CHF', date: '2026-11-06', requestedDate: '2026-11-07', rates: { EUR: 1.1 }, rateDates: { EUR: '2026-11-06' }, source: 'ECB via Frankfurter', retrievedAt: '2026-11-08T00:00:00Z' };
  assert.equal(validForexSnapshot(snapshot, '2026-11-07'), true);
  assert.equal(validForexSnapshot({ ...snapshot, source: 'fallback' }, '2026-11-07'), false);
  assert.equal(validForexSnapshot(snapshot, '2026-11-06'), false);
  assert.equal(validForexSnapshot({ ...snapshot, rateDates: { EUR: '2026-11-08' } }, '2026-11-07'), false);
});

test('provisional conversions retain original bookings and reject missing or stale rates', () => {
  const snapshot: ForexSnapshot = { base: 'CHF', date: '2026-11-06', requestedDate: '2026-11-07', rates: { EUR: 1.2, USD: 1 }, rateDates: { EUR: '2026-11-06', USD: '2026-10-01' }, source: 'ECB via Frankfurter', retrievedAt: '2026-11-08T00:00:00Z' };
  const booking: Booking = { id: 'one', date: '2026-10-01', description: 'Test', account: '1020 Bank', contraAccount: '3000 Ertrag', category: '', amount: 120, vatAmount: 12, vatRate: 0, currency: 'EUR', paymentStatus: 'Bezahlt', type: 'Einnahme' };
  const result = provisionalBookings([booking, { ...booking, id: 'two', currency: 'USD' }, { ...booking, id: 'three', currency: 'JPY' }], snapshot);
  assert.equal(result.bookings[0].amount, 100);
  assert.equal(result.bookings[0].vatAmount, 10);
  assert.equal(result.bookings[0].currency, 'CHF');
  assert.deepEqual(result.missing, ['JPY', 'USD']);
  assert.equal(booking.amount, 120);
  assert.equal(booking.currency, 'EUR');
});