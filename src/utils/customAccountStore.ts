import type { Account } from '../data/chAccounts';
import { companyStorageKey } from './companyStorage';

const KEY = 'bookitty.customAccounts';
const CHANGE_EVENT = 'bookitty:custom-accounts-changed';
let revision = 0;

export const customAccountsRevision = () => revision;
export const customAccountsChangeEvent = CHANGE_EVENT;

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
  revision += 1;
  window.dispatchEvent(new Event(CHANGE_EVENT));
};
