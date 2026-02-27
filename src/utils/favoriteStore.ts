const KEY = 'bookitty.favorites';

export const getFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const isFavorite = (account: string): boolean =>
  getFavorites().includes(account);

/**
 * Toggle an account in the favorites list and persist to localStorage.
 * Returns the updated favorites array.
 */
export const toggleFavorite = (account: string): string[] => {
  const current = getFavorites();
  const next = current.includes(account)
    ? current.filter((a) => a !== account)
    : [...current, account];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
};
