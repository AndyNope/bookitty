import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { accounts as STD_ACCOUNTS, type Account } from '../data/chAccounts';
import { customAccountsChangeEvent, customAccountsRevision, getCustomAccounts, saveCustomAccounts } from '../utils/customAccountStore';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';

/**
 * Returns a merged account list (standard accounts with custom overrides applied,
 * plus any fully new custom accounts) and helpers to manage the custom list.
 *
 * Sorting: numeric by account code so selects are always in order.
 */
export const useAccounts = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const useServer = Boolean(user) && pathname.startsWith('/app');
  const scope = useServer ? `${user?.id}:${user?.company_id ?? user?.id}` : null;
  const [custom, setCustom] = useState<Account[]>(getCustomAccounts);
  const [loadError, setLoadError] = useState('');
  const [loadedScope, setLoadedScope] = useState<string | null>(null);

  // Load from API when logged in and sync to localStorage
  useEffect(() => {
    let active = true;
    const sync = () => setCustom(getCustomAccounts());
    window.addEventListener(customAccountsChangeEvent, sync);
    if (useServer) {
      const startRevision = customAccountsRevision();
      api.customAccounts.list()
        .then((list) => {
          if (active && customAccountsRevision() === startRevision) saveCustomAccounts(list);
        })
        .catch(() => {
          if (active) setLoadError('Eigene Konten konnten nicht vom Server geladen werden. Angezeigt wird der lokale Stand.');
        })
        .finally(() => {
          if (active) setLoadedScope(scope);
        });
    }
    return () => {
      active = false;
      window.removeEventListener(customAccountsChangeEvent, sync);
    };
  }, [useServer, scope]);

  /** Standard accounts with names overridden where a custom entry exists for the same code */
  const merged: Account[] = [
    ...STD_ACCOUNTS.map((a) => {
      const override = custom.find((c) => c.code === a.code);
      return override ? { ...a, name: override.name, categoryCode: override.categoryCode } : a;
    }),
    // Fully new accounts (codes not in standard list)
    ...custom.filter((c) => !STD_ACCOUNTS.some((a) => a.code === c.code)),
  ].sort((a, b) => Number(a.code) - Number(b.code));

  /** Add or update a custom account (identified by code) */
  const upsert = useCallback(async (account: Account) => {
    if (useServer) await api.customAccounts.upsert(account);
    saveCustomAccounts([...getCustomAccounts().filter((item) => item.code !== account.code), account]);
  }, [useServer]);

  /** Remove a custom account (restores standard name if it was an override) */
  const remove = useCallback(async (code: string) => {
    if (useServer) await api.customAccounts.remove(code);
    saveCustomAccounts(getCustomAccounts().filter((item) => item.code !== code));
  }, [useServer]);

  return { accounts: merged, customAccounts: custom, upsert, remove, loadError, loading: scope !== null && loadedScope !== scope };
};
