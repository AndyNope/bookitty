import { useEffect, useState } from 'react';
import { api, tokenStore, type CompanyMembership } from '../services/api';
import { useAuth } from '../store/AuthContext';
import { LoadingIndicator } from './LogoLoader';

export default function CompanySwitcher() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api.companies.list().then(setCompanies).catch((err: Error) => setError(err.message));
  }, [user]);

  const switchCompany = async (companyId: number) => {
    setBusy(true); setError('');
    try {
      const { token } = await api.companies.switch(companyId);
      tokenStore.set(token);
      window.location.assign('/app');
    } catch (err) {
      setError((err as Error).message || 'Firma konnte nicht gewechselt werden.');
      setBusy(false);
    }
  };

  if (!user || (companies.length < 2 && !error)) return null;
  return (
    <div className="min-w-0 px-3 pb-3">
      {companies.length > 1 && <label className="block text-xs font-medium text-slate-500">
        Aktive Firma
        <select aria-label="Aktive Firma" value={user.company_id ?? user.id} disabled={busy}
          onChange={(event) => void switchCompany(Number(event.target.value))}
          className="mt-1 block w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50">
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>}
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
      {busy && <div className="mt-2"><LoadingIndicator text="Firma wird gewechselt…" size="small" /></div>}
    </div>
  );
}