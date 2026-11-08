import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { validForexSnapshot, type ForexRates, type ForexSnapshot } from '../utils/forex';

export { toCHF } from '../utils/forex';
export type { ForexRates } from '../utils/forex';

const CACHE_KEY = 'bookitty.forex.ecb.';
const CACHE_TTL = 60 * 60 * 1000;

/** Format a number as currency string with locale de-CH. */
export const formatCurrency = (amount: number, currency = 'CHF'): string =>
  new Intl.NumberFormat('de-CH', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

/** Hook: loads CHF-based exchange rates, caches locally. */
export function useForex(requestedDate = new Date().toISOString().slice(0, 10), enabled = true) {
  const [state, setState] = useState<{ requestedDate: string; snapshot: ForexSnapshot | null; error: string }>({ requestedDate: '', snapshot: null, error: '' });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    try {
      const cached = localStorage.getItem(CACHE_KEY + requestedDate);
      if (cached) {
        const parsed = JSON.parse(cached) as { snapshot: ForexSnapshot; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL && validForexSnapshot(parsed.snapshot, requestedDate)) {
          setState({ requestedDate, snapshot: parsed.snapshot, error: '' });
          return;
        }
      }
    } catch { /* ignore */ }
    api.forex.rates(requestedDate)
      .then(data => {
        if (!validForexSnapshot(data, requestedDate)) throw new Error('Ungültige Referenzkurse.');
        if (!active) return;
        setState({ requestedDate, snapshot: data, error: '' });
        try { localStorage.setItem(CACHE_KEY + requestedDate, JSON.stringify({ snapshot: data, ts: Date.now() })); } catch { /* ignore */ }
      })
      .catch(() => { if (active) setState({ requestedDate, snapshot: null, error: 'Referenzkurse sind derzeit nicht verfügbar.' }); });
    return () => { active = false; };
  }, [requestedDate, enabled]);

  const current = state.requestedDate === requestedDate ? state.snapshot : null;
  const rates: ForexRates = current?.rates ?? {};
  return { rates, snapshot: current, loading: enabled && state.requestedDate !== requestedDate, date: current?.date ?? '', rateDates: current?.rateDates ?? {}, source: current?.source ?? '', retrievedAt: current?.retrievedAt ?? '', error: state.requestedDate === requestedDate ? state.error : '' };
}
