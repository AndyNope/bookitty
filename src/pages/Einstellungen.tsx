import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';
import { getCompany, saveCompany, type CompanyProfile } from '../utils/companyStore';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import { accounts as STD_ACCOUNTS, accountCategories, formatAccount } from '../data/chAccounts';
import { useAccounts } from '../hooks/useAccounts';
import NotificationModal from '../components/NotificationModal';
import type { TeamMember, UserRole } from '../types';
import {
  getNavProfile, saveNavProfile, getHiddenPages, saveHiddenPages,
  NAV_PROFILES, ALL_PAGES, PAGE_LABELS, isPageVisible, type NavProfile,
} from '../utils/navProfileStore';

type ImapConfig = {
  host: string;
  port: string;
  username: string;
  password: string;
  ssl: boolean;
  folder: string;
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <label className="flex flex-col gap-1 text-sm text-slate-600">
    {label}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-0.5 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
    />
  </label>
);

const Einstellungen = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');
  const isAdmin = !isDemo && user?.role === 'admin';

  const [form, setForm] = useState<CompanyProfile>(getCompany);
  const [saved, setSaved] = useState(false);

  const [imap, setImap] = useState<ImapConfig>({ host: '', port: '993', username: '', password: '', ssl: true, folder: 'INBOX' });
  const [imapSaved, setImapSaved] = useState(false);
  const [imapError, setImapError] = useState('');

  // Custom accounts
  const { customAccounts, upsert: upsertAccount, remove: removeAccount } = useAccounts();
  const [acctForm, setAcctForm] = useState({ code: '', name: '', categoryCode: '3' });
  const [acctError, setAcctError] = useState('');

  // Team management
  const [team,           setTeam]          = useState<TeamMember[]>([]);
  const [inviteEmail,    setInviteEmail]   = useState('');
  const [inviteRole,     setInviteRole]    = useState<UserRole>('buchhalter');
  const [teamLoading,    setTeamLoading]   = useState(false);
  const [teamError,      setTeamError]     = useState('');

  // Treuhänder management
  const [treuEmail,      setTreuEmail]     = useState('');
  const [treuDays,       setTreuDays]      = useState(30);
  const [treuLoading,    setTreuLoading]   = useState(false);
  const [treuError,      setTreuError]     = useState('');

  // Nav profile
  const [navProfile, setNavProfile] = useState<NavProfile>(getNavProfile);
  const [hiddenPages, setHiddenPages] = useState<string[]>(getHiddenPages);

  const handleProfileChange = (profile: NavProfile) => {
    if (hiddenPages.length > 0 && !confirm('Deine manuellen Seiteneinstellungen werden zurückgesetzt. Profil trotzdem wechseln?')) return;
    saveNavProfile(profile);
    setNavProfile(profile);
    setHiddenPages([]);
  };

  const handleTogglePage = (kittyId: string, currentlyVisible: boolean) => {
    const newHidden = currentlyVisible
      ? [...hiddenPages, kittyId]
      : hiddenPages.filter((id) => id !== kittyId);
    setHiddenPages(newHidden);
    saveHiddenPages(newHidden);
  };

  const [notify, setNotify] = useState<{ open: boolean; type: 'success' | 'error'; title: string; message: string }>({
    open: false, type: 'success', title: '', message: '',
  });
  const showNotify = (type: 'success' | 'error', title: string, message: string) =>
    setNotify({ open: true, type, title, message });

  // Load team members (admin only, not demo)
  useEffect(() => {
    if (!isAdmin) return;
    api.team.list().then(setTeam).catch(() => {});
  }, [isAdmin]);

  const handleInvite = async () => {
    setTeamError('');
    if (!inviteEmail.trim()) { setTeamError('E-Mail-Adresse erforderlich'); return; }
    setTeamLoading(true);
    try {
      await api.team.invite(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      showNotify('success', 'Einladung versendet', `Einladung an ${inviteEmail} wurde gesendet.`);
      api.team.list().then(setTeam).catch(() => {});
    } catch (e: unknown) {
      setTeamError((e as Error).message ?? 'Fehler beim Einladen');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleRoleChange = async (id: number, role: UserRole) => {
    await api.team.updateRole(id, role).catch(() => {});
    setTeam(prev => prev.map(m => m.id === id ? { ...m, role } : m));
  };

  const handleRemoveMember = async (id: number, name: string) => {
    if (!confirm(`${name} wirklich aus dem Team entfernen?`)) return;
    await api.team.remove(id).catch(() => {});
    setTeam(prev => prev.filter(m => m.id !== id));
    showNotify('success', 'Entfernt', `${name} wurde aus dem Team entfernt.`);
  };

  const handleTreuInvite = async () => {
    setTreuError('');
    if (!treuEmail.trim()) { setTreuError('E-Mail-Adresse erforderlich'); return; }
    setTreuLoading(true);
    try {
      await api.team.invite(treuEmail.trim(), 'readonly', treuDays);
      setTreuEmail('');
      showNotify('success', 'Treuhänder eingeladen', `Zeitlich begrenzter Zugang (${treuDays} Tage) wurde an ${treuEmail} gesendet.`);
      api.team.list().then(setTeam).catch(() => {});
    } catch (e: unknown) {
      setTreuError((e as Error).message ?? 'Fehler beim Einladen');
    } finally {
      setTreuLoading(false);
    }
  };

  // Load IMAP config from API when logged in
  useEffect(() => {
    if (!user) return;
    api.imap.get().then((d) => {
      if (d && d.host) {
        setImap({
          host:     d.host ?? '',
          port:     String(d.port ?? 993),
          username: d.username ?? '',
          password: '••••••••',
          ssl:      d.ssl !== false,
          folder:   d.folder ?? 'INBOX',
        });
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleImapSave = () => {
    setImapError('');
    api.imap.save({ ...imap, port: Number(imap.port) })
      .then(() => {
        setImapSaved(true);
        setTimeout(() => setImapSaved(false), 2000);
        showNotify('success', 'E-Mail-Empfang gespeichert', 'Die IMAP-Verbindung wurde erfolgreich gespeichert.');
      })
      .catch((e: Error) => {
        setImapError(e.message);
        showNotify('error', 'Speichern fehlgeschlagen', e.message);
      });
  };

  // Load company profile from API when logged in
  useEffect(() => {
    if (!user) return;
    api.company.get().then((data) => {
      if (data && Object.keys(data).length > 0) {
        const profile = data as unknown as CompanyProfile;
        setForm(profile);
        saveCompany(profile); // keep localStorage in sync
      }
    }).catch(() => {/* ignore */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  const patch = (key: keyof CompanyProfile) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = () => {
    saveCompany(form);
    if (user) {
      api.company.save(form).catch(console.error);
    }
    setSaved(true);
    showNotify('success', 'Einstellungen gespeichert', 'Das Unternehmensprofil wurde erfolgreich gespeichert.');
  };

  const handleUpsertAccount = () => {
    const code = acctForm.code.trim();
    const name = acctForm.name.trim();
    if (!code || !name) { setAcctError('Kontonummer und Name sind Pflichtfelder.'); return; }
    if (!/^\d+$/.test(code)) { setAcctError('Kontonummer darf nur Ziffern enthalten.'); return; }
    upsertAccount({ code, name, categoryCode: acctForm.categoryCode });
    setAcctForm({ code: '', name: '', categoryCode: '3' });
    setAcctError('');
    showNotify('success', 'Konto gespeichert', `Konto ${code} „${name}“ wurde erfolgreich gespeichert.`);
  };

  return (
    <div className="space-y-6">
      <NotificationModal
        open={notify.open}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((n) => ({ ...n, open: false }))}
      />
      <SectionHeader
        title="Einstellungen"
        subtitle="Unternehmensprofil hinterlegen – wird zur Erkennung eigener Rechnungen verwendet."
        action={
          <button
            type="button"
            onClick={handleSave}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              saved ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {saved ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Gespeichert
              </span>
            ) : 'Speichern'}
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Unternehmensprofil</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Firmenname" value={form.name} onChange={patch('name')} placeholder="Muster GmbH" />
          <Field label="MwSt-Nr. / UID" value={form.vatId} onChange={patch('vatId')} placeholder="CHE-123.456.789 MWST" />
          <Field label="Strasse & Hausnummer" value={form.street} onChange={patch('street')} placeholder="Musterstrasse 1" />
          <Field label="PLZ & Ort" value={form.city} onChange={patch('city')} placeholder="8001 Zürich" />
          <Field label="E-Mail" value={form.email} onChange={patch('email')} placeholder="info@firma.ch" type="email" />
          <Field label="Telefon" value={form.phone} onChange={patch('phone')} placeholder="+41 44 000 00 00" />
          <Field label="IBAN" value={form.iban} onChange={patch('iban')} placeholder="CH56 0483 5012 3456 7800 9" />
        </div>
        {form.name && (
          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-semibold">Aktiv: {form.name}</p>
            <p className="mt-0.5 text-xs text-emerald-600">
              Eingehende PDFs mit diesem Namen werden automatisch als <strong>Einnahme</strong> erkannt.
            </p>
          </div>
        )}
      </div>

      {/* ── IMAP settings – only shown when logged in ── */}
      {user && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">E-Mail-Postfach (IMAP)</h3>
            <button
              type="button"
              onClick={handleImapSave}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                imapSaved ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {imapSaved ? '✓ Gespeichert' : 'Speichern'}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Verbinde dein Postfach, damit Bookitty automatisch Rechnungs-E-Mails abruft und als Belege importiert.
          </p>
          {imapError && (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{imapError}</p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="IMAP-Server (optional)" value={imap.host} onChange={(v) => setImap((p) => ({ ...p, host: v }))} placeholder="mail.andynope.com" />
              <p className="mt-1 text-xs text-slate-400">Leer lassen → wird automatisch als <span className="font-mono">mail.&lt;domain&gt;</span> aus dem Benutzernamen abgeleitet.</p>
            </div>
            <Field label="Port" value={imap.port} onChange={(v) => setImap((p) => ({ ...p, port: v }))} placeholder="993" />
            <Field label="Benutzername / E-Mail" value={imap.username} onChange={(v) => setImap((p) => ({ ...p, username: v }))} placeholder="rechnung@firma.ch" />
            <Field label="Passwort" value={imap.password} onChange={(v) => setImap((p) => ({ ...p, password: v }))} type="password" />
            <Field label="Ordner" value={imap.folder} onChange={(v) => setImap((p) => ({ ...p, folder: v }))} placeholder="INBOX" />
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              SSL/TLS
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={imap.ssl}
                  onChange={(e) => setImap((p) => ({ ...p, ssl: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-slate-700">SSL aktiviert (empfohlen)</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* ── Eigene Kontenbezeichnungen ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Eigene Kontenbezeichnungen</h3>
        <p className="mt-1 text-xs text-slate-500">
          Passe bestehende Kontonamen an oder füge neue Konten hinzu. Deine Anpassungen werden
          in allen Buchungsformularen und Auswertungen verwendet.
        </p>

        {/* Existing custom accounts */}
        {customAccounts.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
            {customAccounts
              .slice()
              .sort((a, b) => Number(a.code) - Number(b.code))
              .map((acct) => {
                const std = STD_ACCOUNTS.find((s) => s.code === acct.code);
                return (
                  <li key={acct.code} className="flex items-start justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        <span className="font-mono text-slate-500 mr-1">{acct.code}</span>
                        {acct.name}
                      </p>
                      {std ? (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Überschreibt Standard: «{std.name}»
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-600 mt-0.5">Eigenes Konto</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAccount(acct.code)}
                      className="shrink-0 text-xs font-semibold text-rose-500 hover:text-rose-700"
                    >
                      Entfernen
                    </button>
                  </li>
                );
              })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Noch keine eigenen Konten angelegt. Füge unten ein Konto hinzu.
          </p>
        )}

        {/* Add / override form */}
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Konto hinzufügen / überschreiben
          </p>
          {acctError && (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{acctError}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-[100px_1fr_1fr_auto]">
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Kontonr.
              <input
                type="text"
                inputMode="numeric"
                value={acctForm.code}
                onChange={(e) => {
                  const code = e.target.value.replace(/\D/g, '');
                  // Auto-suggest category based on first digit
                  const catCode = code[0] ?? '3';
                  const validCat = accountCategories.some((c) => c.code === catCode) ? catCode : '3';
                  setAcctForm((p) => ({ ...p, code, categoryCode: validCat }));
                }}
                placeholder="3400"
                className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 focus:border-slate-400 focus:outline-none"
              />
              {acctForm.code && STD_ACCOUNTS.find((s) => s.code === acctForm.code) && (
                <span className="text-[10px] text-amber-600">
                  Überschreibt: «{STD_ACCOUNTS.find((s) => s.code === acctForm.code)!.name}»
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Kontoname
              <input
                type="text"
                value={acctForm.name}
                onChange={(e) => setAcctForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="z.B. Beratungshonorar"
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Kategorie
              <select
                value={acctForm.categoryCode}
                onChange={(e) => setAcctForm((p) => ({ ...p, categoryCode: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              >
                {accountCategories.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} – {c.name.slice(0, 30)}{c.name.length > 30 ? '…' : ''}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleUpsertAccount}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Speichern
              </button>
            </div>
          </div>
          {/* Preview of what the merged list looks like for this code */}
          {acctForm.code && acctForm.name && (
            <p className="mt-2 text-xs text-slate-400">
              Vorschau: <span className="font-mono text-slate-600">
                {formatAccount({ code: acctForm.code, name: acctForm.name, categoryCode: acctForm.categoryCode })}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Team-Verwaltung (nur Admin, kein Demo) ─────────────────── */}
      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Team-Verwaltung</h3>

          {/* Member list */}
          <div className="mb-6 divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
            {team.length === 0 ? (
              <p className="px-4 py-5 text-sm text-slate-400">Noch keine Teammitglieder. Lade jetzt erste Personen ein.</p>
            ) : team.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {member.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{member.name}</div>
                  <div className="text-xs text-slate-400 truncate">{member.email}</div>
                </div>
                {member.is_owner ? (
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">Admin</span>
                ) : (
                  <>
                    <select value={member.role} onChange={e => handleRoleChange(member.id, e.target.value as UserRole)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-slate-400">
                      <option value="buchhalter">Buchhalter</option>
                      <option value="readonly">Nur-Lesen</option>
                    </select>
                    <button onClick={() => handleRemoveMember(member.id, member.name)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Invite form */}
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">Neues Mitglied einladen</p>
            <div className="flex flex-wrap gap-3">
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="name@firma.ch" type="email"
                className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400">
                <option value="buchhalter">Buchhalter</option>
                <option value="readonly">Nur-Lesen</option>
              </select>
              <button onClick={handleInvite} disabled={teamLoading}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40">
                {teamLoading
                  ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  : <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                }
                Einladen
              </button>
            </div>
            {teamError && <p className="mt-2 text-xs text-red-600">{teamError}</p>}
            <p className="mt-2 text-xs text-slate-400">
              Der Einladungslink ist 7 Tage gültig. Rollen: <strong>Buchhalter</strong> = lesen + schreiben, <strong>Nur-Lesen</strong> = keine Änderungen.
            </p>
          </div>
        </div>
      )}

      {/* ── Treuhänder-Zugang (nur Admin, kein Demo) ───────────────── */}
      {isAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
            </svg>
            <h3 className="text-base font-semibold text-amber-900">Treuhänder-Zugang</h3>
          </div>
          <p className="mb-4 text-sm text-amber-700">
            Erteile externen Steuerberatern oder Treuhändern zeitlich begrenzten Nur-Lesen-Zugriff auf Ihre Buchhaltungsdaten.
          </p>

          {/* Trustee list */}
          {team.filter(m => !m.is_owner && m.access_expires_at).length > 0 && (
            <div className="mb-5 divide-y divide-amber-100 rounded-xl border border-amber-200 bg-white overflow-hidden">
              {team.filter(m => !m.is_owner && m.access_expires_at).map(member => {
                const expired = member.access_expires_at ? new Date(member.access_expires_at) < new Date() : false;
                return (
                  <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                      {member.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{member.name}</div>
                      <div className="text-xs text-slate-400 truncate">{member.email}</div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${expired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {expired ? 'Abgelaufen' : `bis ${new Date(member.access_expires_at!).toLocaleDateString('de-CH')}`}
                    </span>
                    <button onClick={() => handleRemoveMember(member.id, member.name)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Zugang entziehen">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Invite trustee */}
          <div>
            <p className="mb-3 text-sm font-medium text-amber-800">Treuhänder einladen</p>
            <div className="flex flex-wrap gap-3 items-end">
              <input value={treuEmail} onChange={e => setTreuEmail(e.target.value)}
                placeholder="treuhänder@kanzlei.ch" type="email"
                className="flex-1 min-w-48 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400" />
              <div className="flex gap-1.5">
                {[30, 60, 90].map(d => (
                  <button key={d} onClick={() => setTreuDays(d)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${treuDays === d ? 'bg-amber-600 text-white' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}>
                    {d}&nbsp;Tage
                  </button>
                ))}
              </div>
              <button onClick={handleTreuInvite} disabled={treuLoading}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40">
                {treuLoading
                  ? <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  : <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                }
                Zugang gewähren
              </button>
            </div>
            {treuError && <p className="mt-2 text-xs text-red-600">{treuError}</p>}
            <p className="mt-2 text-xs text-amber-700">
              Der Treuhänder erhält Nur-Lesen-Zugriff. Nach Ablauf der Frist wird der Zugang automatisch gesperrt.
            </p>
          </div>
        </div>
      )}

      {/* ── Navigation anpassen ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-1 text-base font-semibold text-slate-900">Navigation anpassen</h3>
        <p className="mb-5 text-xs text-slate-500">
          Wähle ein Profil, um nur die relevanten Seiten anzuzeigen. Du kannst danach einzelne Seiten manuell ein- oder ausblenden.
        </p>

        {/* Profile cards */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(NAV_PROFILES) as [NavProfile, typeof NAV_PROFILES[NavProfile]][]).map(([key, profile]) => {
            const isActive = navProfile === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleProfileChange(key)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-2xl">{profile.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{profile.label}</p>
                  <p className={`text-xs leading-tight mt-0.5 ${
                    isActive ? 'text-slate-400' : 'text-slate-500'
                  }`}>{profile.description}</p>
                </div>
                {isActive && (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Manual page toggles */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Seiten manuell ein-/ausblenden</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_PAGES.map((kittyId) => {
              const label = PAGE_LABELS[kittyId];
              const profilePages = NAV_PROFILES[navProfile].pages;
              const inProfile = profilePages.length === 0 || profilePages.includes(kittyId);
              const visible = isPageVisible(kittyId, navProfile, hiddenPages);
              return (
                <div
                  key={kittyId}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                    !inProfile ? 'border-slate-100 bg-slate-50 opacity-50' : 'border-slate-200'
                  }`}
                >
                  <span className="text-sm text-slate-700">{label}</span>
                  <div className="flex items-center gap-2">
                    {!inProfile && (
                      <span className="text-[10px] text-slate-400">Nicht im Profil</span>
                    )}
                    <button
                      type="button"
                      disabled={!inProfile}
                      onClick={() => inProfile && handleTogglePage(kittyId, visible)}
                      title={visible ? 'Ausblenden' : 'Einblenden'}
                      className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed ${
                        visible ? 'bg-slate-900' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          visible ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {hiddenPages.length > 0 && (
            <button
              type="button"
              onClick={() => { setHiddenPages([]); saveHiddenPages([]); }}
              className="mt-3 text-xs text-slate-500 underline hover:text-slate-800"
            >
              Alle manuellen Einstellungen zurücksetzen
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-slate-900">Über Bookitty</h3>        <p className="text-sm text-slate-500">
          Einfach, kostengünstig und dennoch von höchster Qualität — entwickelt für Schweizer KMUs.
          Alle Daten werden lokal in Ihrem Browser gespeichert.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href="mailto:support@bookitty.ch"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-9.75 6.75L2.25 6.75" />
            </svg>
            Kontakt aufnehmen
          </a>
          <a
            href="https://bookitty.bidebliss.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            Website
          </a>
        </div>
      </div>
    </div>
  );
};

export default Einstellungen;
