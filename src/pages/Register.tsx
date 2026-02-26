import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

const Register = () => {
  const { register } = useAuth();

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { message } = await register(name, email, pass);
      setSuccess(message);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Bookitty" className="h-14 w-14 mb-3" />
          <h1 className="text-2xl font-bold text-slate-900">Bookitty</h1>
          <p className="text-sm text-slate-500 mt-1">Kostenlos registrieren</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {success ? (
            /* ── Success state ────────────────────────────────────────────── */
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                ✉️
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Fast fertig!</h2>
              <p className="text-sm text-slate-600">{success}</p>
              <Link
                to="/login"
                className="mt-4 inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Zur Anmeldung
              </Link>
            </div>
          ) : (
            /* ── Registration form ────────────────────────────────────────── */
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Konto erstellen</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  Dein Name / Firmenname
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Muster"
                    required
                    autoComplete="name"
                    className="mt-0.5 rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  E-Mail
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="deine@email.ch"
                    required
                    autoComplete="email"
                    className="mt-0.5 rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-600">
                  Passwort
                  <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="Mindestens 8 Zeichen"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="mt-0.5 rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 focus:border-slate-400 focus:outline-none"
                  />
                </label>

                {error && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? 'Registrierung …' : 'Konto erstellen'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                Bereits registriert?{' '}
                <Link to="/login" className="font-medium text-slate-900 hover:underline">
                  Anmelden
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          Nur schauen?{' '}
          <Link to="/demo" className="text-slate-500 hover:underline">
            Demo starten →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
