import type { BookingDraft } from '../types';
import { companyStorageKey } from './companyStorage';
import { documentIdentityKeys, type DocumentIdentity } from './documentIdentity';

export type TemplateRule = {
  id: string;
  /** Vendor/sender name used for matching inside document text */
  pattern: string;
  draft: Partial<BookingDraft>;
  /** How many times this template has been confirmed/applied */
  hitCount: number;
  updatedAt: string;
};

const STORAGE_KEY = 'bookitty.templates';

const readTemplates = (): TemplateRule[] => {
  try {
    const raw = localStorage.getItem(companyStorageKey(STORAGE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TemplateRule[];
    // Migrate old entries that lack new fields
    return parsed.map((t) => {
      const today = new Date().toISOString().split('T')[0];
      return { ...t, hitCount: t.hitCount ?? 0, updatedAt: t.updatedAt ?? today };
    });
  } catch {
    return [];
  }
};

const writeTemplates = (templates: TemplateRule[]) => {
  localStorage.setItem(companyStorageKey(STORAGE_KEY), JSON.stringify(templates));
  window.dispatchEvent(new Event('bookitty:templates-changed'));
};

export const getTemplates = () => readTemplates();
export const removeTemplate = (pattern: string) => writeTemplates(readTemplates().filter((rule) => rule.pattern !== pattern));

export const mergeServerTemplates = (server: Record<string, object>) => {
  const local = readTemplates();
  const serverRules = Object.entries(server).map(([pattern, draft]) => ({
    id: pattern, pattern, draft: draft as Partial<BookingDraft>, hitCount: 0, updatedAt: '',
  }));
  const keys = new Set(serverRules.map((rule) => rule.pattern.toLowerCase()));
  writeTemplates([...serverRules, ...local.filter((rule) => !keys.has(rule.pattern.toLowerCase()) && !/^(sha256|vendor):/i.test(rule.pattern))]);
};

export const learnedFields = (draft: Partial<BookingDraft>): Partial<BookingDraft> => {
  const result: Partial<BookingDraft> = {};
  if (typeof draft.account === 'string') result.account = draft.account;
  if (typeof draft.contraAccount === 'string') result.contraAccount = draft.contraAccount;
  if (typeof draft.category === 'string') result.category = draft.category;
  if (typeof draft.type === 'string') result.type = draft.type;
  if (typeof draft.vatRate === 'number' && Number.isFinite(draft.vatRate)) result.vatRate = draft.vatRate;
  return result;
};

/**
 * Upsert a template by pattern (case-insensitive).
 * If a template with the same pattern already exists it is updated in-place
 * so corrections from repeated confirmations accumulate correctly.
 */
export const upsertTemplate = (
  pattern: string,
  draft: Partial<BookingDraft>,
) => {
  const templates = readTemplates();
  const key = pattern.toLowerCase();
  const existing = templates.find((t) => t.pattern.toLowerCase() === key);
  const today = new Date().toISOString().split('T')[0];
  if (existing) {
    existing.draft = { ...existing.draft, ...draft };
    existing.hitCount += 1;
    existing.updatedAt = today;
  } else {
    templates.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pattern,
      draft,
      hitCount: 1,
      updatedAt: today,
    });
  }
  writeTemplates(templates);
};

/** Legacy alias used by the manual "Als Vorlage speichern" button */
export const addTemplate = upsertTemplate;

/**
 * Find a template whose pattern appears in the given document text or file name.
 * Prefers templates with higher hitCount (more confirmations = more reliable).
 */
export const findTemplate = (_fileName: string, _documentText?: string, identity: DocumentIdentity = {}) => {
  const templates = readTemplates();
  for (const key of documentIdentityKeys(identity)) {
    const exact = templates.find((rule) => rule.pattern.toLowerCase() === key.toLowerCase());
    if (exact) return exact;
  }
  if (!identity.vendor) return undefined;
  return templates.find((rule) => rule.pattern.toLowerCase() === identity.vendor?.toLowerCase());
};
