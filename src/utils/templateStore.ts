import type { BookingDraft } from '../types';

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
    const raw = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

export const getTemplates = () => readTemplates();

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
  writeTemplates(templates.slice(0, 100));
};

/** Legacy alias used by the manual "Als Vorlage speichern" button */
export const addTemplate = upsertTemplate;

/**
 * Find a template whose pattern appears in the given document text or file name.
 * Prefers templates with higher hitCount (more confirmations = more reliable).
 */
export const findTemplate = (fileName: string, documentText?: string) => {
  const templates = readTemplates();
  const haystack = [
    fileName.toLowerCase(),
    (documentText ?? '').toLowerCase(),
  ].join(' ');

  const matches = templates.filter((rule) =>
    haystack.includes(rule.pattern.toLowerCase()),
  );
  if (!matches.length) return undefined;
  // Return the most-confirmed match
  return matches.sort((a, b) => b.hitCount - a.hitCount)[0];
};
