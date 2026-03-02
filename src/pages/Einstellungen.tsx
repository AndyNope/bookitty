import { useState, useEffect } from 'react';
import SectionHeader from '../components/SectionHeader';
import { getCompany, saveCompany, type CompanyProfile } from '../utils/companyStore';
import { useAuth } from '../store/AuthContext';
import { api } from '../services/api';
import { accounts as STD_ACCOUNTS, accountCategories, formatAccount } from '../data/chAccounts';
import { useAccounts } from '../hooks/useAccounts';

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
  const [form, setForm] = useState<CompanyProfile>(getCompany);
  const [saved, setSaved] = useState(false);

  const [imap, setImap] = useState<ImapConfig>({ host: '', port: '993', username: '', password: '', ssl: true, folder: 'INBOX' });
  const [imapSaved, setImapSaved] = useState(false);
  const [imapError, setImapError] = useState('');

  // Custom accounts
  const { customAccounts, upsert: upsertAccount, remove: removeAccount } = useAccounts();
  const [acctForm, setAcctForm] = useState({ code: '', name: '', categoryCode: '3' });
  const [acctError, setAcctError] = useState('');

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
  }, [user?.id]);

  const handleImapSave = () => {
    setImapError('');
    api.imap.save({ ...imap, port: Number(imap.port) })
      .then(() => { setImapSaved(true); setTimeout(() => setImapSaved(false), 2000); })
      .catch((e: Error) => setImapError(e.message));
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
  };

  const handleUpsertAccount = () => {
    const code = acctForm.code.trim();
    const name = acctForm.name.trim();
    if (!code || !name) { setAcctError('Kontonummer und Name sind Pflichtfelder.'); return; }
    if (!/^\d+$/.test(code)) { setAcctError('Kontonummer darf nur Ziffern enthalten.'); return; }
    upsertAccount({ code, name, categoryCode: acctForm.categoryCode });
    setAcctForm({ code: '', name: '', categoryCode: '3' });
    setAcctError('');
  };

  return (
    <div className="space-y-6">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-slate-900">Über Bookitty</h3>
        <p className="text-sm text-slate-500">
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
