import type { Booking, Contact, DocumentImport, Expense, Invoice, Offer, TeamMember, Invitation, UserRole } from '../types';
import type { Account } from '../data/chAccounts';
import type { CompanyPermission } from '../utils/companyPermissions';
import type { ForexSnapshot } from '../utils/forex';

// ─── Config ───────────────────────────────────────────────────────────────────
// In development (.env.development) this points to the remote server so you can
// test auth without a local PHP installation.
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

// ─── Token storage ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'bookitty.token';

export const tokenStore = {
  get:   (): string | null => sessionStorage.getItem(TOKEN_KEY),
  set:   (t: string)       => sessionStorage.setItem(TOKEN_KEY, t),
  clear: ()                => sessionStorage.removeItem(TOKEN_KEY),
};

const privateFileName = (url: string): string | null => {
  const match = url.match(/\/api\/uploads\/\d+\/([a-f0-9]{32}(?:\.[a-z0-9]{1,10})?)(?:[?#].*)?$/i);
  return match?.[1] ?? null;
};

export const isPrivateDocumentUrl = (url: string): boolean => privateFileName(url) !== null;

export const fetchDocument = async (url: string): Promise<Blob> => {
  const name = privateFileName(url);
  const token = tokenStore.get();
  const response = await fetch(name ? `${API_URL}/file.php?name=${encodeURIComponent(name)}` : url, {
    headers: name && token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (response.status === 402) window.dispatchEvent(new Event('bookitty:subscription-required'));
  if (!response.ok) throw new Error('Beleg konnte nicht geöffnet werden.');
  return response.blob();
};

export const openPrivateDocument = async (url: string): Promise<void> => {
  const tab = window.open('about:blank', '_blank');
  if (!tab) throw new Error('Das Browserfenster wurde blockiert.');
  tab.opener = null;
  try {
    const blobUrl = URL.createObjectURL(await fetchDocument(url));
    tab.location.href = blobUrl;
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch (error) {
    tab.close();
    throw error;
  }
};

// ─── Generic fetch wrapper ────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
  const json = await res.json().catch(() => null);
  if ((json as { code?: string } | null)?.code === 'subscription_required') {
    window.dispatchEvent(new Event('bookitty:subscription-required'));
  }
  if (!res.ok) throw new Error((json as { error?: string })?.error ?? `HTTP ${res.status}`);
  return json as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type AuthUser = { id: number; email: string; name: string; role: import('../types').UserRole; company_id: number | null; permissions?: CompanyPermission[] | null; subscriptionActive: boolean };
export type CompanyMembership = { id: number; name: string; role: UserRole };
export type CompanyRole = { id: number; name: string; baseRole: 'buchhalter' | 'readonly'; permissions: CompanyPermission[] };
export type CompanyActivity = { id: number; action: string; targetType: string; targetId: string | null; createdAt: string; actorName: string };
export type BillingSummary = {
  plan: string;
  status: string;
  monthlyTokens: number;
  purchasedTokens: number;
  periodEnd: string | null;
  billingEnabled: boolean;
  tokenPurchasesEnabled: boolean;
  portalEnabled: boolean;
  hasSubscription: boolean;
  plans: Record<string, { name: string; price: number; monthly_tokens: number }>;
  tokenPacks: Record<string, { name: string; price: number; tokens: number }>;
};

// ─── API surface ──────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      apiFetch<{ ok: boolean; message: string }>('/register.php', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    login: (email: string, password: string, code = '') =>
      apiFetch<{ token: string; user: AuthUser } | { requiresTwoFactor: true }>('/login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password, code }),
      }),
    me: () => apiFetch<AuthUser>('/me.php'),
  },

  twoFactor: {
    status: () => apiFetch<{ enabled: boolean; available: boolean }>('/two-factor.php'),
    setup: (password: string) => apiFetch<{ secret: string; uri: string }>('/two-factor.php', { method: 'POST', body: JSON.stringify({ action: 'setup', password }) }),
    confirm: (code: string) => apiFetch<{ recoveryCodes: string[]; token: string }>('/two-factor.php', { method: 'POST', body: JSON.stringify({ action: 'confirm', code }) }),
    disable: (password: string, code: string) => apiFetch<{ ok: boolean; token: string }>('/two-factor.php', { method: 'POST', body: JSON.stringify({ action: 'disable', password, code }) }),
  },

  bookings: {
    list:   ()                                  => apiFetch<Booking[]>('/bookings.php'),
    create: (b: Booking)                        => apiFetch<{ ok: boolean; id: string }>('/bookings.php', { method: 'POST',   body: JSON.stringify(b) }),
    createBatch: (bookings: Booking[])          => apiFetch<{ ok: boolean; ids: string[] }>('/bookings.php', { method: 'POST', body: JSON.stringify({ bookings }) }),
    update: (id: string, data: Partial<Booking>) => apiFetch<{ ok: boolean }>('/bookings.php', { method: 'PUT',    body: JSON.stringify({ id, ...data }) }),
    remove: (id: string)                        => apiFetch<{ ok: boolean }>('/bookings.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  documents: {
    list:   ()                                              => apiFetch<DocumentImport[]>('/documents.php'),
    create: (d: DocumentImport)                            => apiFetch<{ ok: boolean; id: string }>('/documents.php', { method: 'POST',   body: JSON.stringify(d) }),
    update: (id: string, data: Partial<DocumentImport>)   => apiFetch<{ ok: boolean }>('/documents.php', { method: 'PUT',    body: JSON.stringify({ id, ...data }) }),
    remove: (id: string)                                   => apiFetch<{ ok: boolean }>('/documents.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
    confirm: (documentId: string, bookingId: string, draft: import('../types').BookingDraft) =>
      apiFetch<{ ok: boolean }>('/confirm_document.php', { method: 'POST', body: JSON.stringify({ documentId, bookingId, draft }) }),
  },

  /** Upload a file for an authenticated user. Returns the permanent server URL. */
  upload: async (file: File): Promise<{ ok: boolean; url: string }> => {
    const token = tokenStore.get();
    const form  = new FormData();
    form.append('file', file);
    const res  = await fetch(`${API_URL}/upload.php`, {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error((json as { error?: string })?.error ?? `HTTP ${res.status}`);
    return json as { ok: boolean; url: string };
  },

  templates: {
    list:   ()                                   => apiFetch<Record<string, object>>('/templates.php'),
    upsert: (pattern: string, template: object)  => apiFetch<{ ok: boolean }>('/templates.php', { method: 'POST', body: JSON.stringify({ pattern, template }) }),
    remove: (pattern: string)                    => apiFetch<{ ok: boolean }>('/templates.php', { method: 'DELETE', body: JSON.stringify({ pattern }) }),
  },

  company: {
    get:  ()             => apiFetch<Record<string, string>>('/company.php'),
    save: (data: object) => apiFetch<{ ok: boolean }>('/company.php', { method: 'PUT', body: JSON.stringify(data) }),
  },

  companies: {
    list: () => apiFetch<CompanyMembership[]>('/companies.php'),
    switch: (companyId: number) => apiFetch<{ token: string }>('/companies.php', { method: 'POST', body: JSON.stringify({ company_id: companyId }) }),
  },

  roles: {
    list: () => apiFetch<CompanyRole[]>('/roles.php'),
    save: (role: Omit<CompanyRole, 'id'> & { id?: number }) =>
      apiFetch<{ ok: boolean; id: number }>('/roles.php', { method: role.id ? 'PUT' : 'POST', body: JSON.stringify(role) }),
    remove: (id: number) => apiFetch<{ ok: boolean }>('/roles.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  activity: {
    list: () => apiFetch<CompanyActivity[]>('/activity.php'),
  },

  imap: {
    get:   ()             => apiFetch<{ host?: string; port?: number; username?: string; ssl?: boolean; folder?: string }>('/imap.php'),
    save:  (data: object) => apiFetch<{ ok: boolean }>('/imap.php', { method: 'PUT', body: JSON.stringify(data) }),
    fetch: (before?: number) => apiFetch<{ ok: boolean; emails: Array<{ subject: string; from: string; date: string; messageId: string; filename: string; data: string }>; scanned: number; skipped: number; remaining: number; nextCursor: number | null }>('/imap.php', { method: 'POST', body: JSON.stringify({ action: 'fetch', ...(before !== undefined ? { before } : {}) }) }),
    acknowledge: (messageId: string) => apiFetch<{ ok: boolean }>('/imap.php', { method: 'POST', body: JSON.stringify({ action: 'ack', messageId }) }),
  },

  customAccounts: {
    list:   ()               => apiFetch<Account[]>('/custom_accounts.php'),
    upsert: (a: Account)     => apiFetch<{ ok: boolean }>('/custom_accounts.php', { method: 'PUT',    body: JSON.stringify(a) }),
    remove: (code: string)   => apiFetch<{ ok: boolean }>('/custom_accounts.php', { method: 'DELETE', body: JSON.stringify({ code }) }),
  },

  currencySettings: {
    get: () => apiFetch<{ enabled: boolean }>('/currency-settings.php'),
    save: (enabled: boolean) => apiFetch<{ ok: boolean }>('/currency-settings.php', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  },

  contacts: {
    list:   ()               => apiFetch<Contact[]>('/contacts.php'),
    create: (c: Contact)     => apiFetch<{ ok: boolean; id: string }>('/contacts.php', { method: 'POST',   body: JSON.stringify(c) }),
    update: (c: Contact)     => apiFetch<{ ok: boolean }>('/contacts.php', { method: 'PUT',    body: JSON.stringify(c) }),
    remove: (id: string)     => apiFetch<{ ok: boolean }>('/contacts.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  invoices: {
    list:   ()                    => apiFetch<Invoice[]>('/invoices.php'),
    create: (inv: Invoice)        => apiFetch<{ ok: boolean; id: string }>('/invoices.php', { method: 'POST',   body: JSON.stringify(inv) }),
    update: (inv: Invoice)        => apiFetch<{ ok: boolean }>('/invoices.php', { method: 'PUT',    body: JSON.stringify(inv) }),
    remove: (id: string)          => apiFetch<{ ok: boolean }>('/invoices.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
    send:   (id: string)          => apiFetch<{ ok: boolean }>('/invoices_send.php', { method: 'POST', body: JSON.stringify({ id }) }),
    auditUnlock: (invoiceId: string, oldStatus: string, newStatus: string, reason: string) =>
      apiFetch<{ ok: boolean }>('/invoice_audit.php', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: invoiceId, old_status: oldStatus, new_status: newStatus, reason }),
      }),
  },

  offers: {
    list:   ()                    => apiFetch<Offer[]>('/offers.php'),
    create: (o: Offer)            => apiFetch<{ ok: boolean; id: string }>('/offers.php', { method: 'POST',   body: JSON.stringify(o) }),
    update: (o: Offer)            => apiFetch<{ ok: boolean }>('/offers.php', { method: 'PUT',    body: JSON.stringify(o) }),
    remove: (id: string)          => apiFetch<{ ok: boolean }>('/offers.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  mahnung: {
    send: (invoiceId: string, level: 1 | 2 | 3, message?: string) =>
      apiFetch<{ ok: boolean; level: number; sent_to: string }>('/mahnung.php', {
        method: 'POST',
        body: JSON.stringify({ invoice_id: invoiceId, level, message: message ?? '' }),
      }),
  },

  team: {
    list:   ()                          => apiFetch<TeamMember[]>('/team.php'),
    invite: (email: string, role: UserRole, accessDays = 0, customRoleId?: number) =>
      apiFetch<{ ok: boolean; token: string }>('/team.php', { method: 'POST', body: JSON.stringify({ email, role, access_days: accessDays, custom_role_id: customRoleId }) }),
    updateRole: (id: number, role: UserRole, customRoleId?: number) =>
      apiFetch<{ ok: boolean }>('/team.php', { method: 'PUT', body: JSON.stringify({ id, role, custom_role_id: customRoleId }) }),
    remove: (id: number) =>
      apiFetch<{ ok: boolean }>('/team.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  invite: {
    check:  (token: string)              => apiFetch<Invitation>(`/invite.php?token=${encodeURIComponent(token)}`),
    accept: (token: string, name: string, password: string, code = '') =>
      apiFetch<{ token: string; user: AuthUser }>('/invite.php', {
        method: 'POST',
        body: JSON.stringify({ token, name, password, code }),
      }),
  },

  expenses: {
    list:    ()                                  => apiFetch<Expense[]>('/expenses.php'),
    create:  (data: Partial<Expense>)           => apiFetch<{ id: string }>('/expenses.php', { method: 'POST', body: JSON.stringify(data) }),
    update:  (id: string, data: Partial<Expense>) => apiFetch<{ ok: boolean }>('/expenses.php', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
    approve: (id: string)                        => apiFetch<{ ok: boolean; status: string }>('/expenses.php', { method: 'PUT', body: JSON.stringify({ id, action: 'approve' }) }),
    reject:  (id: string)                        => apiFetch<{ ok: boolean; status: string }>('/expenses.php', { method: 'PUT', body: JSON.stringify({ id, action: 'reject' }) }),
    remove:  (id: string)                        => apiFetch<{ ok: boolean }>('/expenses.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  forex: {
    rates: (date?: string) => apiFetch<ForexSnapshot>(`/forex.php${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  },

  portal: {
    generate: (id: string) => apiFetch<{ token: string; url: string }>('/portal.php', { method: 'POST', body: JSON.stringify({ id }) }),
  },

  learning: {
    push: (samples: { type: string; fingerprint: string; payload: object; use_count: number }[]) =>
      apiFetch<{ ok: boolean; stored: number }>('/document-learning.php', {
        method: 'POST',
        body: JSON.stringify({ samples }),
      }),
  },

  billing: {
    summary: () => apiFetch<BillingSummary>('/billing.php'),
    checkout: (type: 'subscription' | 'tokens' | 'portal', option = '') =>
      apiFetch<{ url: string }>('/billing.php', {
        method: 'POST',
        body: JSON.stringify(type === 'subscription' ? { type, plan: option } : { type, pack: option }),
      }),
  },

  startupNight: {
    sendRewardCode: (email: string, marketingOptIn: boolean) =>
      apiFetch<{ ok: boolean; marketing_opt_in_saved: boolean; message: string }>('/startup-night-reward.php', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email, marketing_opt_in: marketingOptIn }),
      }),
  },

  contact: {
    challenge: () => apiFetch<{ question: string }>('/contact-challenge.php', { credentials: 'include' }),
    submit: (data: { kind: 'support' | 'idea'; name: string; email: string; message: string; website: string; captchaAnswer: string }) =>
      apiFetch<{ ok: boolean; message: string }>('/contact.php', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(data),
      }),
  },
};
