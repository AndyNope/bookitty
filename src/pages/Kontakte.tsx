import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';
import NotificationModal from '../components/NotificationModal';
import { api } from '../services/api';
import type { Contact, ContactType } from '../types';

// ─── localStorage helpers (Demo-Modus) ───────────────────────────────────────
const STORAGE_KEY = 'bookitty.contacts';

const DEMO_CONTACTS: Contact[] = [
  { id: 'demo-1', type: 'Kunde',     name: 'Müller GmbH',         company: 'Müller GmbH',         email: 'info@mueller-gmbh.ch',  phone: '+41 44 123 45 67', street: 'Bahnhofstrasse 12', zip: '8001', city: 'Zürich',  country: 'CH', uid: 'CHE-123.456.789', iban: 'CH56 0483 5012 3456 7800 9' },
  { id: 'demo-2', type: 'Lieferant', name: 'Bürobedarf AG',        company: 'Bürobedarf AG',        email: 'bestellung@buero.ch',   phone: '+41 31 234 56 78', street: 'Industrieweg 5',    zip: '3000', city: 'Bern',    country: 'CH', iban: 'CH93 0076 2011 6238 5295 7' },
  { id: 'demo-3', type: 'Kunde',     name: 'Tech Startup Zürich',  company: 'Tech Startup AG',      email: 'billing@techstart.ch',  phone: '+41 44 987 65 43', street: 'Technopark 1',      zip: '8005', city: 'Zürich',  country: 'CH' },
  { id: 'demo-4', type: 'Lieferant', name: 'Swisscom AG',          company: 'Swisscom AG',          email: 'rechnung@swisscom.ch',  phone: '+41 800 800 800',  street: 'Alte Tiefenaustrasse 6', zip: '3048', city: 'Worblaufen', country: 'CH', uid: 'CHE-999.999.999' },
  { id: 'demo-5', type: 'Beides',    name: 'Design Studio Basel',  company: 'Design Studio GmbH',  email: 'hello@designstudio.ch', phone: '+41 61 345 67 89', street: 'Freie Strasse 10',  zip: '4001', city: 'Basel',   country: 'CH' },
];

function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Contact[];
  } catch { /* ignore */ }
  // seed demo data on first load
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_CONTACTS));
  return DEMO_CONTACTS;
}

function saveContacts(contacts: Contact[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<ContactType, string> = {
  Kunde:     'bg-teal-100 text-teal-800',
  Lieferant: 'bg-slate-100 text-slate-700',
  Beides:    'bg-violet-100 text-violet-800',
};

const EMPTY_FORM: Omit<Contact, 'id'> = {
  type: 'Kunde', name: '', company: '', email: '', phone: '',
  street: '', zip: '', city: '', country: 'CH', uid: '', iban: '', notes: '',
};

// ─── FormField helper ─────────────────────────────────────────────────────────
const Field = ({
  label, value, onChange, placeholder, type = 'text', half = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; half?: boolean;
}) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
    />
  </div>
);

// ─── Contact modal ────────────────────────────────────────────────────────────
const ContactModal = ({
  contact, onSave, onClose,
}: {
  contact: Partial<Contact> | null;
  onSave: (c: Omit<Contact, 'id'>, id?: string) => void;
  onClose: () => void;
}) => {
  const isEdit = !!contact?.id;
  const [form, setForm] = useState<Omit<Contact, 'id'>>({ ...EMPTY_FORM, ...contact });

  const set = (field: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form, contact?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 p-6">
            {/* Type */}
            <div className="col-span-2">
              <label className="mb-2 block text-xs font-medium text-slate-600">Typ</label>
              <div className="flex gap-2">
                {(['Kunde', 'Lieferant', 'Beides'] as ContactType[]).map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => setForm(prev => ({ ...prev, type: t }))}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.type === t
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Name / Kontaktperson *" value={form.name} onChange={set('name')} placeholder="Max Mustermann" />
            <Field label="Firma" value={form.company ?? ''} onChange={set('company')} placeholder="Mustermann GmbH" />
            <Field label="E-Mail" value={form.email ?? ''} onChange={set('email')} placeholder="info@firma.ch" type="email" />
            <Field label="Telefon" value={form.phone ?? ''} onChange={set('phone')} placeholder="+41 44 123 45 67" />
            <Field label="Strasse" value={form.street ?? ''} onChange={set('street')} placeholder="Musterstrasse 1" />
            <Field label="PLZ" value={form.zip ?? ''} onChange={set('zip')} placeholder="8001" half />
            <Field label="Ort" value={form.city ?? ''} onChange={set('city')} placeholder="Zürich" half />
            <Field label="Land" value={form.country} onChange={set('country')} placeholder="CH" half />
            <Field label="UID / MWST-Nr." value={form.uid ?? ''} onChange={set('uid')} placeholder="CHE-123.456.789" />
            <Field label="IBAN" value={form.iban ?? ''} onChange={set('iban')} placeholder="CH56 0483 5012 3456 7800 9" />

            {/* Notes */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Notizen</label>
              <textarea
                value={form.notes ?? ''}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Zahlungsziel 30 Tage, Kontaktperson: Frau Müller …"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button" onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!form.name.trim()}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete confirm dialog ─────────────────────────────────────────────────────
const DeleteDialog = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
      <h3 className="mb-2 text-base font-semibold text-slate-800">Kontakt löschen</h3>
      <p className="mb-6 text-sm text-slate-500">
        Möchtest du <span className="font-medium text-slate-700">«{name}»</span> wirklich löschen?
        Diese Aktion kann nicht rückgängig gemacht werden.
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Abbrechen</button>
        <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Löschen</button>
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Kontakte() {
  const location  = useLocation();
  const isDemo    = location.pathname.startsWith('/demo');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search,   setSearch]   = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'Alle'>('Alle');
  const [modal,    setModal]    = useState<'add' | 'edit' | null>(null);
  const [editing,  setEditing]  = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContacts(loadContacts());
    } else {
      api.contacts.list().then(setContacts).catch(() =>
        setNotification({ type: 'error', title: 'Fehler', message: 'Kontakte konnten nicht geladen werden.' })
      );
    }
  }, [isDemo]);

  // ── Persist demo ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) saveContacts(contacts);
  }, [contacts, isDemo]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(c => {
      const matchType = filterType === 'Alle' || c.type === filterType;
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [contacts, search, filterType]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     contacts.length,
    kunden:    contacts.filter(c => c.type === 'Kunde' || c.type === 'Beides').length,
    lieferanten: contacts.filter(c => c.type === 'Lieferant' || c.type === 'Beides').length,
  }), [contacts]);

  // ── CRUD actions ──────────────────────────────────────────────────────────
  const handleSave = async (form: Omit<Contact, 'id'>, id?: string) => {
    if (id) {
      // Edit
      const updated = { ...form, id };
      setContacts(prev => prev.map(c => c.id === id ? updated : c));
      if (!isDemo) {
        try {
          await api.contacts.update(updated);
          setNotification({ type: 'success', title: 'Gespeichert', message: `${form.name} wurde aktualisiert.` });
        } catch {
          setNotification({ type: 'error', title: 'Fehler', message: 'Speichern fehlgeschlagen.' });
        }
      } else {
        setNotification({ type: 'success', title: 'Gespeichert', message: `${form.name} wurde aktualisiert.` });
      }
    } else {
      // Create
      const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const created: Contact = { ...form, id: newId };
      setContacts(prev => [created, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      if (!isDemo) {
        try {
          await api.contacts.create(created);
          setNotification({ type: 'success', title: 'Erstellt', message: `${form.name} wurde hinzugefügt.` });
        } catch {
          setNotification({ type: 'error', title: 'Fehler', message: 'Erstellen fehlgeschlagen.' });
        }
      } else {
        setNotification({ type: 'success', title: 'Erstellt', message: `${form.name} wurde hinzugefügt.` });
      }
    }
    setModal(null);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const name = deleting.name;
    setContacts(prev => prev.filter(c => c.id !== deleting.id));
    if (!isDemo) {
      try {
        await api.contacts.remove(deleting.id);
      } catch { /* state already updated */ }
    }
    setDeleting(null);
    setNotification({ type: 'success', title: 'Gelöscht', message: `${name} wurde entfernt.` });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Kontakte"
        subtitle={`${stats.total} Einträge · ${stats.kunden} Kunden · ${stats.lieferanten} Lieferanten`}
        action={
          <button
            onClick={() => { setEditing(null); setModal('add'); }}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Neuer Kontakt
          </button>
        }
      />

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Gesamt',      value: stats.total,       color: 'text-slate-800' },
          { label: 'Kunden',      value: stats.kunden,      color: 'text-teal-600' },
          { label: 'Lieferanten', value: stats.lieferanten, color: 'text-slate-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, Firma, E-Mail oder Ort suchen …"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
        <div className="flex gap-2">
          {(['Alle', 'Kunde', 'Lieferant', 'Beides'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterType === t
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contact list ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">
            {search || filterType !== 'Alle' ? 'Keine Treffer' : 'Noch keine Kontakte'}
          </p>
          {!search && filterType === 'Alle' && (
            <button
              onClick={() => { setEditing(null); setModal('add'); }}
              className="mt-3 text-sm text-slate-500 underline hover:text-slate-700"
            >
              Ersten Kontakt anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Name / Firma</th>
                <th className="px-4 py-3 text-left">Typ</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">E-Mail</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Ort</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">IBAN</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{c.name}</div>
                    {c.company && c.company !== c.name && (
                      <div className="text-xs text-slate-400">{c.company}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[c.type]}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:text-slate-800 hover:underline">{c.email}</a>
                    ) : '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                    {c.city ? `${c.zip ? c.zip + ' ' : ''}${c.city}` : '—'}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-slate-400 lg:table-cell">
                    {c.iban ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        title="Bearbeiten"
                        onClick={() => { setEditing(c); setModal('edit'); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        title="Löschen"
                        onClick={() => setDeleting(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {(modal === 'add' || modal === 'edit') && (
        <ContactModal
          contact={modal === 'edit' ? editing : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setEditing(null); }}
        />
      )}

      {deleting && (
        <DeleteDialog
          name={deleting.name}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}

      {notification && (
        <NotificationModal
          open
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
