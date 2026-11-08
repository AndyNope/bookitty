import assert from 'node:assert/strict';
import test from 'node:test';
import { financialReportPeriod, splitFinancialBookings } from '../src/utils/financialReport';
import type { Booking } from '../src/types';

const booking = (date: string): Booking => ({
  id: date, date, description: 'Test', account: '1020 Bank', contraAccount: '3000 Ertrag',
  amount: 100, currency: 'CHF', category: 'Ertrag', paymentStatus: 'Bezahlt', type: 'Einnahme',
});

test('current period ends today and prior-year reports end on December 31', () => {
  assert.deepEqual(financialReportPeriod(2026, '2026-11-08'), {
    year: 2026, start: '2026-01-01', end: '2026-11-08', balanceAsOf: '2026-11-08',
  });
  assert.deepEqual(financialReportPeriod(2025, '2026-11-08'), {
    year: 2025, start: '2025-01-01', end: '2025-12-31', balanceAsOf: '2025-12-31',
  });
});

test('income statement is period-bound while balance sheet keeps opening balances', () => {
  const period = financialReportPeriod(2026, '2026-11-08');
  const split = splitFinancialBookings([
    booking('2025-12-31'), booking('2026-01-01'), booking('2026-11-08'), booking('2026-11-09'),
  ], period);
  assert.deepEqual(split.incomeStatement.map((item) => item.date), ['2026-01-01', '2026-11-08']);
  assert.deepEqual(split.balanceSheet.map((item) => item.date), ['2025-12-31', '2026-01-01', '2026-11-08']);
});