import type { Booking, DocumentImport } from '../types';

// ─── Config ───────────────────────────────────────────────────────────────────
// In development (.env.development) this points to the remote server so you can
// test auth without a local PHP installation.
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

// ─── Token storage ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'bookitty.token';

export const tokenStore = {
  get:   (): string | null => localStorage.getItem(TOKEN_KEY),
  set:   (t: string)       => localStorage.setItem(TOKEN_KEY, t),
  clear: ()                => localStorage.removeItem(TOKEN_KEY),
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
export type AuthUser = { id: number; email: string; name: string };

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
};
