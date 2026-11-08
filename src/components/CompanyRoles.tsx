import { useState } from 'react';
import { api, type CompanyRole } from '../services/api';
import { COMPANY_FUNCTIONS, type CompanyPermission } from '../utils/companyPermissions';
import { LoadingIndicator } from './LogoLoader';

export default function CompanyRoles({ roles, onChange }: { roles: CompanyRole[]; onChange: (roles: CompanyRole[]) => void }) {
  const [id, setId] = useState<number | undefined>();
  const [name, setName] = useState('');
  const [baseRole, setBaseRole] = useState<'buchhalter' | 'readonly'>('buchhalter');
  const [permissions, setPermissions] = useState<CompanyPermission[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setId(undefined); setName(''); setBaseRole('buchhalter'); setPermissions([]); };
  const refresh = async () => {
    onChange(await api.roles.list());
    window.dispatchEvent(new Event('bookitty:company-activity'));
  };
  const save = async () => {
    setBusy(true); setError('');
    try { await api.roles.save({ id, name: name.trim(), baseRole, permissions }); await refresh(); reset(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  const remove = async (role: CompanyRole) => {
    if (!window.confirm(`Rolle „${role.name}“ löschen?`)) return;
    setBusy(true); setError('');
    try { await api.roles.remove(role.id); await refresh(); if (id === role.id) reset(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Firmenrollen</h3>
      <div className="mt-3 divide-y divide-slate-100">
        {roles.map((role) => <div key={role.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
          <div className="min-w-0 flex-1"><span className="font-medium text-slate-800">{role.name}</span><span className="ml-2 text-xs text-slate-500">{role.baseRole === 'readonly' ? 'Nur Lesen' : 'Lesen und Schreiben'}</span></div>
          <button type="button" className="text-xs text-slate-600 underline" onClick={() => { setId(role.id); setName(role.name); setBaseRole(role.baseRole); setPermissions(role.permissions); setError(''); }}>Bearbeiten</button>
          <button type="button" className="text-xs text-red-700 underline" disabled={busy} onClick={() => void remove(role)}>Löschen</button>
        </div>)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">Rollenname
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900" />
        </label>
        <label className="text-sm text-slate-600">Zugriffsart
          <select value={baseRole} onChange={(event) => setBaseRole(event.target.value as 'buchhalter' | 'readonly')} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
            <option value="buchhalter">Lesen und Schreiben</option><option value="readonly">Nur Lesen</option>
          </select>
        </label>
      </div>
      <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium text-slate-700">Funktionszugänge</legend>
        {COMPANY_FUNCTIONS.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" disabled={item.id === 'inventar' && !permissions.includes(item.id)} checked={permissions.includes(item.id)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id))} />
          {item.label}
        </label>)}
      </fieldset>
      <p className="mt-2 text-xs text-slate-500">Lohn, Lager, Anlagen und Zeiterfassung sind derzeit nur für den Firmeninhaber verfügbar.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {busy && <div className="mt-3"><LoadingIndicator text="Rollen werden aktualisiert…" size="small" /></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !name.trim()} onClick={() => void save()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{id ? 'Rolle speichern' : 'Rolle erstellen'}</button>
        {id && <button type="button" onClick={reset} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700">Abbrechen</button>}
      </div>
    </section>
  );
}