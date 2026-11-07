import { companyStorageKey } from './companyStorage';

export type InvoiceTemplateLayout = 'classic' | 'modern';

export type InvoiceTemplate = {
  id: string;
  name: string;
  layout: InvoiceTemplateLayout;
  accentColor: string;
  footerText: string;
  isDefault: boolean;
};

const defaultTemplate: InvoiceTemplate = {
  id: 'standard',
  name: 'Bookitty Standard',
  layout: 'classic',
  accentColor: '#16253d',
  footerText: '',
  isDefault: true,
};

const storageKey = (scope: string) => `bookitty.invoiceTemplates.${encodeURIComponent(scope)}`;

export const getInvoiceTemplateScope = (userId: string | number | undefined, isDemo: boolean) =>
  isDemo ? 'demo' : userId ? `user:${userId}` : 'guest';

export const getInvoiceTemplates = (scope: string): InvoiceTemplate[] => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(companyStorageKey(storageKey(scope))) ?? 'null');
    if (!Array.isArray(stored)) return [defaultTemplate];
    const valid = stored.filter((template): template is InvoiceTemplate =>
      !!template && typeof template === 'object' &&
      typeof template.id === 'string' && typeof template.name === 'string' &&
      (template.layout === 'classic' || template.layout === 'modern') &&
      typeof template.accentColor === 'string' && typeof template.footerText === 'string' &&
      typeof template.isDefault === 'boolean'
    );
    return valid.length ? valid : [defaultTemplate];
  } catch {
    return [defaultTemplate];
  }
};

export const saveInvoiceTemplates = (scope: string, templates: InvoiceTemplate[]) => {
  const withDefault = templates.some((template) => template.isDefault)
    ? templates
    : templates.map((template, index) => ({ ...template, isDefault: index === 0 }));
  localStorage.setItem(companyStorageKey(storageKey(scope)), JSON.stringify(withDefault));
};

export const getDefaultInvoiceTemplate = (scope: string) =>
  getInvoiceTemplates(scope).find((template) => template.isDefault) ?? defaultTemplate;

export const getInvoiceTemplate = (scope: string, id?: string) =>
  getInvoiceTemplates(scope).find((template) => template.id === id) ?? getDefaultInvoiceTemplate(scope);