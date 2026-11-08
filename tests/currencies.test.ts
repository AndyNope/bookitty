import assert from 'node:assert/strict';
import test from 'node:test';
import { availableCurrencies } from '../src/utils/currencies';

test('extra currencies are optional and existing currencies remain selectable', () => {
  assert.deepEqual(availableCurrencies(false), ['CHF', 'EUR', 'GBP', 'USD']);
  assert.equal(availableCurrencies(false, 'JPY').includes('JPY'), true);
  assert.equal(availableCurrencies(true).includes('JPY'), true);
  assert.equal(availableCurrencies(true).includes('IDR'), true);
});