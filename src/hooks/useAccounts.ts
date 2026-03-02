import { useState, useCallback, useEffect } from 'react';
import { accounts as STD_ACCOUNTS, type Account } from '../data/chAccounts';
import { getCustomAccounts, saveCustomAccounts } from '../utils/customAccountStore';
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
  const [custom, setCustom] = useState<Account[]>(getCustomAccounts);

  // Load from API when logged in and sync to localStorage
  useEffect(() => {
    if (!user) return;
    api.customAccounts.list()
      .then((list) => {
        saveCustomAccounts(list);
        setCustom(list);
      })
      .catch(() => {/* keep localStorage state */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
  const upsert = useCallback((account: Account) => {
    setCustom((prev) => {
      const next = [...prev.filter((c) => c.code !== account.code), account];
      saveCustomAccounts(next);
      return next;
    });
    if (user) api.customAccounts.upsert(account).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /** Remove a custom account (restores standard name if it was an override) */
  const remove = useCallback((code: string) => {
    setCustom((prev) => {
      const next = prev.filter((c) => c.code !== code);
      saveCustomAccounts(next);
      return next;
    });
    if (user) api.customAccounts.remove(code).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { accounts: merged, customAccounts: custom, upsert, remove };
};
