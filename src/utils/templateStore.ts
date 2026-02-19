import type { BookingDraft } from '../types';

export type TemplateRule = {
  id: string;
  pattern: string;
  draft: Partial<BookingDraft>;
};

const STORAGE_KEY = 'bookitty.templates';

const readTemplates = (): TemplateRule[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TemplateRule[]) : [];
  } catch {
    return [];
  }
};

const writeTemplates = (templates: TemplateRule[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

export const getTemplates = () => readTemplates();

export const addTemplate = (pattern: string, draft: Partial<BookingDraft>) => {
  const templates = readTemplates();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  templates.unshift({ id, pattern, draft });
  writeTemplates(templates.slice(0, 50));
};

export const findTemplate = (fileName: string) => {
  const templates = readTemplates();
  const lower = fileName.toLowerCase();
  return templates.find((rule) => lower.includes(rule.pattern.toLowerCase()));
};
