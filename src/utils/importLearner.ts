import type { ColMap } from './importParser';

const MAPPINGS_KEY = 'bookitty.importMappings';
const ACCOUNTS_KEY = 'bookitty.learnedAccounts';

export type LearnedMapping = {
  fingerprint: string;
  colMap: ColMap;
  useCount: number;
  lastUsed: string;
};

type LearnedAccount = {
  code: string;
  name: string;
  count: number;
};

const fingerprintOf = (headers: string[]) =>
  headers.map((h) => h.toLowerCase().trim()).join('|');

// ── Column mapping learning ────────────────────────────────────────────────

/**
 * Returns a previously-learned column mapping for these headers, or null.
 * Matching is done via a case-insensitive fingerprint of the header names.
 */
export const getLearnedMapping = (headers: string[]): LearnedMapping | null => {
  if (!headers.length) return null;
  try {
    const fp = fingerprintOf(headers);
    const stored: LearnedMapping[] = JSON.parse(localStorage.getItem(MAPPINGS_KEY) ?? '[]');
    return stored.find((m) => m.fingerprint === fp) ?? null;
  } catch {
    return null;
  }
};

/**
 * Save (or update) the column mapping for these headers.
 * Called after every successful import so corrections are remembered.
 */
export const saveLearnedMapping = (headers: string[], colMap: ColMap): void => {
  if (!headers.length) return;
  try {
    const fp = fingerprintOf(headers);
    const stored: LearnedMapping[] = JSON.parse(localStorage.getItem(MAPPINGS_KEY) ?? '[]');
    const idx = stored.findIndex((m) => m.fingerprint === fp);
    const entry: LearnedMapping = {
      fingerprint: fp,
      colMap,
      useCount: (stored[idx]?.useCount ?? 0) + 1,
      lastUsed: new Date().toISOString(),
    };
    if (idx >= 0) stored[idx] = entry;
    else stored.push(entry);
    localStorage.setItem(MAPPINGS_KEY, JSON.stringify(stored));
  } catch {
    // localStorage unavailable – silently skip
  }
};

// ── Account name learning ──────────────────────────────────────────────────

/**
 * Persist account code→name pairs learned from an import.
 * Returns the count of NEW accounts added (not previously seen).
 */
export const learnAccounts = (rows: { code: string; name: string }[]): number => {
  if (!rows.length) return 0;
  try {
    const stored: LearnedAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    let newCount = 0;
    for (const { code, name } of rows) {
      if (!code || !name.trim()) continue;
      const idx = stored.findIndex((a) => a.code === code);
      if (idx >= 0) {
        stored[idx].count += 1;
        stored[idx].name = name; // keep most-recent name
      } else {
        stored.push({ code, name, count: 1 });
        newCount++;
      }
    }
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(stored));
    return newCount;
  } catch {
    return 0;
  }
};

/** Returns all learned account names as a { code → name } map. */
export const getLearnedAccounts = (): Record<string, string> => {
  try {
    const stored: LearnedAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Object.fromEntries(stored.map((a) => [a.code, a.name]));
  } catch {
    return {};
  }
};

// ── Stats & management ─────────────────────────────────────────────────────

export const getLearnerStats = (): { mappings: number; accounts: number } => {
  try {
    return {
      mappings: (JSON.parse(localStorage.getItem(MAPPINGS_KEY) ?? '[]') as unknown[]).length,
      accounts: (JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') as unknown[]).length,
    };
  } catch {
    return { mappings: 0, accounts: 0 };
  }
};

export const clearLearned = (): void => {
  localStorage.removeItem(MAPPINGS_KEY);
  localStorage.removeItem(ACCOUNTS_KEY);
};
