import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api, tokenStore } from '../services/api';

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<{ enabled: boolean; available: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; image: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.twoFactor.status().then(setStatus).catch((err: Error) => setError(err.message));
  }, []);

  const begin = async () => {
    setBusy(true); setError('');
    try {
      const result = await api.twoFactor.setup(password);
      setSetup({ secret: result.secret, image: await QRCode.toDataURL(result.uri, { width: 200, margin: 1 }) });
      setPassword('');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      const result = await api.twoFactor.confirm(code.trim());
      tokenStore.set(result.token);
      window.dispatchEvent(new Event('bookitty:company-activity'));
      setRecoveryCodes(result.recoveryCodes);
      setStatus({ enabled: true, available: true });
      setSetup(null); setCode('');
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setError('');
    try {
      const result = await api.twoFactor.disable(password, code.trim());
      tokenStore.set(result.token);
      window.dispatchEvent(new Event('bookitty:company-activity'));
      setStatus({ enabled: false, available: true });
      setPassword(''); setCode(''); setRecoveryCodes([]);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900';
  const button = 'rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Zwei-Faktor-Authentifizierung</h3>
      {!status && !error && <p className="mt-3 text-sm text-slate-500">Wird geladen …</p>}
      {status && !status.available && <p className="mt-3 text-sm text-amber-700">2FA ist auf diesem Server noch nicht eingerichtet.</p>}
      {status?.available && !setup && !recoveryCodes.length && (
        <div className="mt-3 max-w-md space-y-3">
          <p className="text-sm text-slate-600">{status.enabled ? 'Aktiviert' : 'Nicht aktiviert'}</p>
          <label className="block text-sm text-slate-600">Passwort
            <input className={input} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {status.enabled && <label className="block text-sm text-slate-600">Authenticator- oder Wiederherstellungscode
            <input className={input} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>}
          <button type="button" className={button} disabled={busy || !password || (status.enabled && !code)} onClick={status.enabled ? disable : begin}>
            {status.enabled ? '2FA deaktivieren' : '2FA einrichten'}
          </button>
        </div>
      )}
      {setup && (
        <div className="mt-4 max-w-md space-y-3">
          <img src={setup.image} alt="QR-Code für die Authenticator-App" width={200} height={200} />
          <p className="break-all font-mono text-xs text-slate-600">{setup.secret}</p>
          <label className="block text-sm text-slate-600">Code aus der Authenticator-App
            <input className={input} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} />
          </label>
          <button type="button" className={button} disabled={busy || !code} onClick={confirm}>Aktivieren</button>
        </div>
      )}
      {recoveryCodes.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-slate-800">Wiederherstellungscodes einmalig sicher aufbewahren.</p>
          <div className="grid gap-1 font-mono text-xs text-slate-700 sm:grid-cols-2">{recoveryCodes.map((item) => <span key={item} className="break-all">{item}</span>)}</div>
          <button type="button" className={button} onClick={() => setRecoveryCodes([])}>Fertig</button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}