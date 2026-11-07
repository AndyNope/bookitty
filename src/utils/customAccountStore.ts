import type { Account } from '../data/chAccounts';
import { companyStorageKey } from './companyStorage';

const KEY = 'bookitty.customAccounts';

/** Returns the list of custom/overridden accounts from localStorage */
export const getCustomAccounts = (): Account[] => {
  try {
    const raw = localStorage.getItem(companyStorageKey(KEY));
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
};

/** Persists the full list of custom accounts */
export const saveCustomAccounts = (list: Account[]): void => {
  localStorage.setItem(companyStorageKey(KEY), JSON.stringify(list));
};
