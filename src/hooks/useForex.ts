import { useEffect, useState } from 'react';
import { api } from '../services/api';

export type ForexRates = Record<string, number>; // e.g. { EUR: 1.04, USD: 1.12 }

const CACHE_KEY = 'bookitty.forex';
const CACHE_TTL = 23 * 60 * 60 * 1000; // 23 hours in ms

const FALLBACK_RATES: ForexRates = {
  EUR: 1.04, USD: 1.12, GBP: 0.88, JPY: 170.0, CAD: 1.52, AUD: 1.71,
};

/** Convert an amount in `currency` to CHF using the given rates (base = CHF).
 *  If currency === 'CHF', returns amount unchanged.
 *  Rates are "how many units of foreign currency per 1 CHF",
 *  so CHF amount = foreign amount / rate. */
export const toCHF = (amount: number, currency: string, rates: ForexRates): number => {
  if (currency === 'CHF') return amount;
  const rate = rates[currency.toUpperCase()];
  if (!rate) return amount;
  return amount / rate;
};

/** Format a number as currency string with locale de-CH. */
export const formatCurrency = (amount: number, currency = 'CHF'): string =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

/** Hook: loads CHF-based exchange rates, caches locally. */
export function useForex() {
  const [rates, setRates]     = useState<ForexRates>(FALLBACK_RATES);
  const [loading, setLoading] = useState(false);
  const [date, setDate]       = useState<string>('');

  useEffect(() => {
    // Try localStorage cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { rates: ForexRates; date: string; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setRates(parsed.rates);
          setDate(parsed.date);
          return;
        }
      }
    } catch { /* ignore */ }

    // Fetch live
    setLoading(true);
    api.forex.rates()
      .then(data => {
        setRates(data.rates);
        setDate(data.date ?? '');
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, date: data.date, ts: Date.now() }));
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => setLoading(false));
  }, []);

  return { rates, loading, date };
}
