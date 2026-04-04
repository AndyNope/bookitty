import type { Booking, Contact, DocumentImport, Invoice, Offer, TeamMember, Invitation, UserRole } from '../types';
import type { Account } from '../data/chAccounts';

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
  if (!res.ok) throw new Error((json as { error?: string })?.error ?? `HTTP ${res.status}`);
  return json as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type AuthUser = { id: number; email: string; name: string; role: import('../types').UserRole; company_id: number | null };

// ─── API surface ──────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      apiFetch<{ ok: boolean; message: string }>('/register.php', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: AuthUser }>('/login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => apiFetch<AuthUser>('/me.php'),
  },

  bookings: {
    list:   ()                                  => apiFetch<Booking[]>('/bookings.php'),
    create: (b: Booking)                        => apiFetch<{ ok: boolean; id: string }>('/bookings.php', { method: 'POST',   body: JSON.stringify(b) }),
    update: (id: string, data: Partial<Booking>) => apiFetch<{ ok: boolean }>('/bookings.php', { method: 'PUT',    body: JSON.stringify({ id, ...data }) }),
    remove: (id: string)                        => apiFetch<{ ok: boolean }>('/bookings.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  documents: {
    list:   ()                                              => apiFetch<DocumentImport[]>('/documents.php'),
    create: (d: DocumentImport)                            => apiFetch<{ ok: boolean; id: string }>('/documents.php', { method: 'POST',   body: JSON.stringify(d) }),
    update: (id: string, data: Partial<DocumentImport>)   => apiFetch<{ ok: boolean }>('/documents.php', { method: 'PUT',    body: JSON.stringify({ id, ...data }) }),
    remove: (id: string)                                   => apiFetch<{ ok: boolean }>('/documents.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
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

  imap: {
    get:   ()             => apiFetch<{ host?: string; port?: number; username?: string; ssl?: boolean; folder?: string }>('/imap.php'),
    save:  (data: object) => apiFetch<{ ok: boolean }>('/imap.php', { method: 'PUT', body: JSON.stringify(data) }),
    fetch: ()             => apiFetch<{ ok: boolean; emails: Array<{ subject: string; from: string; date: string; messageId: string; filename: string; data: string }> }>('/imap.php', { method: 'POST' }),
  },

  customAccounts: {
    list:   ()               => apiFetch<Account[]>('/custom_accounts.php'),
    upsert: (a: Account)     => apiFetch<{ ok: boolean }>('/custom_accounts.php', { method: 'PUT',    body: JSON.stringify(a) }),
    remove: (code: string)   => apiFetch<{ ok: boolean }>('/custom_accounts.php', { method: 'DELETE', body: JSON.stringify({ code }) }),
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
    invite: (email: string, role: UserRole, accessDays = 0) =>
      apiFetch<{ ok: boolean; token: string }>('/team.php', { method: 'POST', body: JSON.stringify({ email, role, access_days: accessDays }) }),
    updateRole: (id: number, role: UserRole) =>
      apiFetch<{ ok: boolean }>('/team.php', { method: 'PUT', body: JSON.stringify({ id, role }) }),
    remove: (id: number) =>
      apiFetch<{ ok: boolean }>('/team.php', { method: 'DELETE', body: JSON.stringify({ id }) }),
  },

  invite: {
    check:  (token: string)              => apiFetch<Invitation>(`/invite.php?token=${encodeURIComponent(token)}`),
    accept: (token: string, name: string, password: string) =>
      apiFetch<{ token: string; user: AuthUser }>('/invite.php', {
        method: 'POST',
        body: JSON.stringify({ token, name, password }),
      }),
  },
};
