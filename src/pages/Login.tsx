import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

const Login = () => {
  const { login }        = useAuth();
  const navigate          = useNavigate();
  const [params]          = useSearchParams();

  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const confirmed = params.get('confirmed') === '1';
  const tokenErr  = params.get('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, pass);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Anmeldung fehlgeschlagen');
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
          <p className="text-sm text-slate-500 mt-1">Finanzbuchhaltung für KMU</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          {/* Success banner */}
          {confirmed && (
            <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
              ✓ E-Mail bestätigt! Du kannst dich jetzt anmelden.
            </div>
          )}

          {/* Token error banner */}
          {tokenErr && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
              Ungültiger oder abgelaufener Bestätigungs-Link. Bitte registriere dich erneut.
            </div>
          )}

          <h2 className="text-lg font-semibold text-slate-900 mb-6">Anmelden</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="••••••••"
                required
                autoComplete="current-password"
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
              {loading ? 'Anmeldung …' : 'Anmelden'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Noch kein Konto?{' '}
            <Link to="/register" className="font-medium text-slate-900 hover:underline">
              Jetzt registrieren
            </Link>
          </p>
        </div>

        {/* Demo link */}
        <p className="mt-4 text-center text-sm text-slate-400">
          Nur schauen?{' '}
          <Link to="/" className="text-slate-500 hover:underline">
            Demo-Modus starten →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
