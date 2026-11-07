import { useEffect, useState } from 'react';
import { api, type CompanyActivity as Activity } from '../services/api';

const labels: Record<string, string> = {
  invitation_created: 'Einladung erstellt',
  invitation_accepted: 'Einladung angenommen',
  member_role_changed: 'Mitgliedsrolle geändert',
  member_removed: 'Zugang entzogen',
  role_created: 'Rolle erstellt',
  role_changed: 'Rolle geändert',
  role_removed: 'Rolle gelöscht',
  company_switched: 'Firma geöffnet',
  booking_created: 'Buchung erstellt',
  booking_changed: 'Buchung geändert',
  booking_deleted: 'Buchung gelöscht',
  document_booked: 'Beleg gebucht',
  invoice_created: 'Rechnung erstellt',
  invoice_changed: 'Rechnung geändert',
  invoice_deleted: 'Rechnung gelöscht',
  invoice_sent: 'Rechnung versendet',
  invoice_reminder: 'Mahnung versendet',
  invoice_status_unlocked: 'Rechnungsstatus entsperrt',
  two_factor_enabled: '2FA aktiviert',
  two_factor_disabled: '2FA deaktiviert',
};

export default function CompanyActivity() {
  const [events, setEvents] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => api.activity.list().then(setEvents).catch((err: Error) => setError(err.message));
    void refresh();
    window.addEventListener('bookitty:company-activity', refresh);
    return () => window.removeEventListener('bookitty:company-activity', refresh);
  }, []);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Zugriffsprotokoll</h3>
      <p className="mt-1 text-xs text-slate-500">Zugänge, Rollen, Firmenwechsel sowie Buchungen und Kundenrechnungen.</p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : events.length === 0 ?
        <p className="mt-3 text-sm text-slate-500">Noch keine Einträge.</p> :
        <ul className="mt-3 divide-y divide-slate-100">{events.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-1 py-2 text-sm">
          <span className="break-words text-slate-800">{labels[event.action] ?? event.action} · {event.actorName}{event.targetId && <span className="ml-2 font-mono text-xs text-slate-400">#{event.targetId}</span>}</span>
          <time className="text-xs text-slate-500">{event.createdAt}</time>
        </li>)}</ul>}
    </section>
  );
}