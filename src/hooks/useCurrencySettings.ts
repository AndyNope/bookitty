import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { companyStorageKey } from '../utils/companyStorage';

const STORAGE_KEY = 'bookitty.extraCurrencies';
const EVENT = 'bookitty:currency-settings';
const revisions = new Map<string, number>();

export function useCurrencySettings() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const key = companyStorageKey(STORAGE_KEY);
  const server = pathname.startsWith('/app') && Boolean(user);
  const [state, setState] = useState(() => ({ key, enabled: !server && localStorage.getItem(key) === '1', loading: server, error: '' }));

  useEffect(() => {
    let active = true;
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; enabled: boolean }>).detail;
      if (detail?.key === key) setState({ key, enabled: detail.enabled, loading: false, error: '' });
    };
    window.addEventListener(EVENT, sync);
    if (server) {
      const startRevision = revisions.get(key) ?? 0;
      api.currencySettings.get().then(({ enabled }) => {
        if (!active || (revisions.get(key) ?? 0) !== startRevision) return;
        try { localStorage.setItem(key, enabled ? '1' : '0'); } catch { /* ignore */ }
        setState({ key, enabled, loading: false, error: '' });
      }).catch(() => {
        if (active && (revisions.get(key) ?? 0) === startRevision) setState({ key, enabled: false, loading: false, error: 'Währungseinstellung konnte nicht geladen werden.' });
      });
    }
    return () => { active = false; window.removeEventListener(EVENT, sync); };
  }, [key, server]);

  const save = async (enabled: boolean) => {
    if (server) await api.currencySettings.save(enabled);
    revisions.set(key, (revisions.get(key) ?? 0) + 1);
    try { localStorage.setItem(key, enabled ? '1' : '0'); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, enabled } }));
  };

  return { enabled: state.key === key && state.enabled, loading: state.key !== key || state.loading, error: state.key === key ? state.error : '', save };
}