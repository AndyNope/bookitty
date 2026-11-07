import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type BillingSummary } from '../services/api';
import { useAuth } from '../store/AuthContext';
import CompanySwitcher from './CompanySwitcher';

export default function SubscriptionGate() {
  const { user, logout } = useAuth();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const isOwner = user?.role === 'admin' && (user.company_id ?? user.id) === user.id;

  useEffect(() => {
    if (!isOwner) return;
    api.billing.summary().then(setBilling).catch((err: Error) => setError(err.message));
  }, [isOwner]);

  const start = async (type: 'subscription' | 'portal', plan = '') => {
    setBusy(plan || 'portal');
    setError('');
    try {
      const { url } = await api.billing.checkout(type, plan);
      window.location.assign(url);
    } catch (err) {
      setError((err as Error).message);
      setBusy('');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-lg font-bold">Bookitty</Link>
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h1 className="text-2xl font-bold">Abo erforderlich</h1>
          <p className="mt-2 text-sm text-slate-600">Für diese Firma wird ein aktives Solo-, Team- oder Business-Abo benötigt.</p>
          <div className="mt-5"><CompanySwitcher /></div>
          {!isOwner && <p className="mt-4 text-sm text-slate-600">Bitte wende dich an die Firmeninhaberin oder den Firmeninhaber.</p>}
          {isOwner && !billing && !error && <p className="mt-4 text-sm text-slate-500">Abos werden geladen …</p>}
          {billing && (
            <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
              {Object.entries(billing.plans).filter(([code]) => code !== 'starter').map(([code, plan]) => (
                <div key={code} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold">{plan.name} · CHF {(plan.price / 100).toFixed(2)} / Monat</p>
                    <p className="text-xs text-slate-500">{new Intl.NumberFormat('de-CH').format(plan.monthly_tokens)} KI-Tokens pro Monat</p>
                  </div>
                  <button type="button" disabled={!billing.billingEnabled || Boolean(busy) || billing.hasSubscription}
                    onClick={() => void start('subscription', code)}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                    {busy === code ? 'Weiter …' : 'Abo wählen'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {billing?.portalEnabled && <button type="button" disabled={Boolean(busy)} onClick={() => void start('portal')}
            className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Abo verwalten</button>}
          {billing && !billing.billingEnabled && <p className="mt-4 text-sm text-amber-700">Die Online-Zahlung ist derzeit nicht verfügbar. Bitte kontaktiere den Support.</p>}
          {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
          <div className="mt-8 flex gap-5 text-sm">
            <Link to="/support" className="underline">Support</Link>
            <button type="button" onClick={logout} className="underline">Abmelden</button>
          </div>
        </div>
      </div>
    </main>
  );
}