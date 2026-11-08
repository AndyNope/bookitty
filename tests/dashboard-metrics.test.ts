import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardMetrics } from '../src/utils/dashboardMetrics';
import type { Booking } from '../src/types';

const booking = (id: string, date: string, amount: number, currency = 'CHF', type: Booking['type'] = 'Einnahme', dueDate?: string): Booking => ({
  id, date, amount, currency, type, dueDate, description: id, account: '1020 Bank', contraAccount: '3000 Ertrag', category: '', vatRate: 0, paymentStatus: dueDate ? 'Offen' : 'Bezahlt',
});

test('dashboard totals use year-to-date CHF values and keep foreign amounts out', () => {
  const result = dashboardMetrics([
    booking('prior-year', '2025-12-31', 900),
    booking('income', '2026-02-01', 300),
    booking('expense', '2026-02-02', 100, 'CHF', 'Ausgabe'),
    booking('foreign', '2026-03-01', 120, 'EUR'),
    booking('future', '2026-12-01', 500),
  ], '2026-11-08');
  assert.deepEqual([result.income, result.expenses, result.hasForeign], [300, 100, true]);
  assert.equal(result.months.length, 11);
  assert.deepEqual(result.months[1], { label: 'Feb', income: 300, expenses: 100 });
});

test('dashboard does not add overdue balances with different currencies', () => {
  const result = dashboardMetrics([
    booking('chf', '2026-01-01', 80, 'CHF', 'Einnahme', '2026-01-10'),
    booking('eur', '2026-01-01', 50, 'EUR', 'Einnahme', '2026-01-10'),
  ], '2026-02-01');
  assert.equal(result.overdue.length, 2);
  assert.equal(result.overdueAmount, null);
  assert.deepEqual(result.overdueCurrencies, ['CHF', 'EUR']);
});