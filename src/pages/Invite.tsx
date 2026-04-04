import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, tokenStore } from '../services/api';
import type { Invitation } from '../types';

export default function Invite() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') ?? '';

  const [invite,   setInvite]   = useState<Invitation | null>(null);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [pwError,  setPwError]  = useState('');

  const ROLE_LABELS: Record<string, string> = { buchhalter: 'Buchhalter', readonly: 'Nur-Lesen', admin: 'Admin' };

  useEffect(() => {
    if (!token) { setError('Kein Einladungstoken gefunden.'); setLoading(false); return; }
    api.invite.check(token)
      .then(data => { setInvite(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message ?? 'Einladung ungültig oder abgelaufen.'); setLoading(false); });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (!invite?.user_exists && password.length < 8) {
      setPwError('Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    setSending(true);
    try {
      const { token: jwt, user } = await api.invite.accept(token, name, password);
      tokenStore.set(jwt);
      // Reload so AuthContext picks up the new user
      window.location.href = '/app';
      void user;
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Fehler beim Annehmen der Einladung.');
      setSending(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-slate-400 text-sm">Einladung wird geprüft …</div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <h1 className="mb-2 text-lg font-bold text-slate-800">Ungültige Einladung</h1>
        <p className="mb-6 text-sm text-slate-500">{error}</p>
        <button onClick={() => navigate('/login')} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700">
          Zur Anmeldung
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <span className="text-2xl font-bold text-slate-900">Bookitty</span>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800">Teameinladung</h1>
            <p className="mt-1 text-sm text-slate-500">
              Eingeladen von <span className="font-medium">{invite?.inviter_name}</span>
            </p>
          </div>

          {/* Info badge */}
          <div className="mb-6 rounded-xl bg-slate-50 px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">E-Mail</span>
              <span className="font-medium text-slate-800">{invite?.email}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-500">Rolle</span>
              <span className="font-medium text-slate-800">{ROLE_LABELS[invite?.role ?? ''] ?? invite?.role}</span>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            {!invite?.user_exists && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Dein Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required
                    placeholder="Vorname Nachname" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Passwort (mind. 8 Zeichen)</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••" className={inputCls} />
                  {pwError && <p className="mt-1 text-xs text-red-600">{pwError}</p>}
                </div>
              </>
            )}

            {invite?.user_exists && (
              <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Du hast bereits ein Bookitty-Konto. Mit «Annehmen» wird dein Konto mit diesem Team verknüpft.
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button type="submit" disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40">
              {sending && <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              Einladung annehmen
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
