import { useState, useEffect } from 'react';
import SectionHeader from '../components/SectionHeader';
import { getCompany, saveCompany, type CompanyProfile } from '../utils/companyStore';

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
  const [form, setForm] = useState<CompanyProfile>(getCompany);
  const [saved, setSaved] = useState(false);

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
    setSaved(true);
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
            {saved ? '✓ Gespeichert' : 'Speichern'}
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-slate-900">Über Bookitty</h3>
        <p className="text-sm text-slate-500">
          Einfach, kostengünstig und dennoch von höchster Qualität — entwickelt für Schweizer KMUs.
          Alle Daten werden lokal in Ihrem Browser gespeichert.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href="mailto:support@bookitty.ch"
            className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            ✉ Kontakt aufnehmen
          </a>
          <a
            href="https://bookitty.bidebliss.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            🌐 Website
          </a>
        </div>
      </div>
    </div>
  );
};

export default Einstellungen;
