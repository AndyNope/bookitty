import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFerPreview } from '../src/utils/ferPreview';
import type { Booking } from '../src/types';

const booking = (date: string, account: string, contraAccount: string, amount: number, currency = 'CHF'): Booking => ({
  id: `${date}-${account}-${contraAccount}`, date, account, contraAccount, amount, currency,
  description: 'Test', category: '', paymentStatus: 'Bezahlt', type: 'Ausgabe',
});

test('aggregates both sides, balance sheet history and only the selected calendar year', () => {
  const result = calculateFerPreview([
    booking('2025-01-01', '1020 Bank', '2800 Kapital', 1000),
    booking('2026-02-01', '1020 Bank', '3000 Ertrag', 100),
    booking('2026-02-02', '4000 Aufwand', '1020 Bank', 30),
    booking('2026-03-01', '1500 Anlage', '1020 Bank', 100),
    booking('2027-01-01', '1020 Bank', '3000 Ertrag', 200),
  ], 2026);
  assert.deepEqual(result.issues, []);
  assert.deepEqual([result.umlauf, result.anlagen, result.total_a, result.ek], [970, 100, 1070, 1000]);
  assert.deepEqual([result.ertrag, result.aufwand, result.reingewinn], [100, 30, 70]);
});

test('reversals, other income, tax and closing bookings affect the correct period', () => {
  const result = calculateFerPreview([
    booking('2026-01-01', '1020 Bank', '3000 Ertrag', 200),
    booking('2026-01-02', '3000 Ertrag', '1020 Bank', 50),
    booking('2026-01-03', '4000 Aufwand', '1020 Bank', 20),
    booking('2026-01-04', '1020 Bank', '8100 Ertrag', 10),
    booking('2026-01-05', '8900 Steuern', '2000 Kreditoren', 5),
    booking('2026-12-31', '3000 Ertrag', '9200 Abschluss', 150),
    booking('2026-12-31', '9200 Abschluss', '4000 Aufwand', 20),
  ], 2026);
  assert.deepEqual([result.ertrag, result.aufwand, result.uebrigerErfolg, result.steuern, result.reingewinn], [150, 20, 10, 5, 135]);
});

test('reports invalid dates, currencies, accounts and amounts instead of silently exporting them', () => {
  const result = calculateFerPreview([
    booking('2026-01-01', '1020 Bank', '3000 Ertrag', 1, 'EUR'),
    booking('2026-02-30', '1020 Bank', '3000 Ertrag', 1),
    booking('2026-01-01', 'Bank', '3000 Ertrag', 1),
    booking('2026-01-01', '1020 Bank', '3000 Ertrag', -1),
  ], 2026);
  assert.equal(result.issues.length, 4);
});