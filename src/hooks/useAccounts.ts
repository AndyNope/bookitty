import { useState, useCallback } from 'react';
import { accounts as STD_ACCOUNTS, type Account } from '../data/chAccounts';
import { getCustomAccounts, saveCustomAccounts } from '../utils/customAccountStore';

/**
 * Returns a merged account list (standard accounts with custom overrides applied,
 * plus any fully new custom accounts) and helpers to manage the custom list.
 *
 * Sorting: numeric by account code so selects are always in order.
 */
export const useAccounts = () => {
  const [custom, setCustom] = useState<Account[]>(getCustomAccounts);

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
  }, []);

  /** Remove a custom account (restores standard name if it was an override) */
  const remove = useCallback((code: string) => {
    setCustom((prev) => {
      const next = prev.filter((c) => c.code !== code);
      saveCustomAccounts(next);
      return next;
    });
  }, []);

  return { accounts: merged, customAccounts: custom, upsert, remove };
};
