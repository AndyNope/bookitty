import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import BookingTable from '../components/BookingTable';
import { useBookkeeping } from '../store/BookkeepingContext';
import { Link, useLocation } from 'react-router-dom';
import { dashboardMetrics } from '../utils/dashboardMetrics';

const currency = (value: number, currencyCode: string) =>
  new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);

const Dashboard = () => {
  const { bookings, documents } = useBookkeeping();
  const location = useLocation();
  const base = location.pathname.startsWith('/demo') ? '/demo' : '/app';
  const today = new Date().toISOString().slice(0, 10);
  const metrics = dashboardMetrics(bookings, today);
  const balance = metrics.income - metrics.expenses;
  const openDocs = documents.filter((doc) => doc.status !== 'Gebucht').length;
  const dateLabel = (date: string) => new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  const periodLabel = `${dateLabel(metrics.yearStart)} bis ${dateLabel(today)}`;
  const ytdLabel = `Jan–${metrics.months.at(-1)?.label ?? 'Jan'} ${metrics.year} · CHF`;
  const monthlyScale = Math.max(1, ...metrics.months.flatMap((month) => [month.income, month.expenses]));
  const overdueLabel = metrics.overdueAmount !== null && metrics.overdueCurrencies.length === 1
    ? `${currency(metrics.overdueAmount, metrics.overdueCurrencies[0])} ausstehend`
    : metrics.overdue.length ? `${metrics.overdueCurrencies.join(' / ')} · getrennt` : 'Alles im grünen Bereich';

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        subtitle={`Finanzüberblick · ${periodLabel} · CHF`}
        action={<Link to={`${base}/bilanz`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Finanzberichte</Link>}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          label="Einnahmen"
          value={currency(metrics.income, 'CHF')}
          helper={ytdLabel}
          to={`${base}/buchungen?type=Einnahme`}
        />
        <StatCard
          label="Ausgaben"
          value={currency(metrics.expenses, 'CHF')}
          helper={ytdLabel}
          to={`${base}/buchungen?type=Ausgabe`}
        />
        <StatCard
          label="Ergebnis"
          value={currency(balance, 'CHF')}
          helper={ytdLabel}
          to={`${base}/bilanz`}
        />
        <StatCard
          label="Offene Belege"
          value={openDocs.toString()}
          helper="In Prüfung"
          to={`${base}/dokumente`}
        />
        <StatCard
          label="Überfällige Zahlungen"
          value={metrics.overdue.length.toString()}
          helper={overdueLabel}
          to={`${base}/buchungen?filter=overdue`}
        />
      </div>

      {metrics.hasForeign && <p className="-mt-3 text-xs text-amber-800">Fremdwährungsbuchungen sind in den CHF-Kennzahlen nicht enthalten.</p>}

      <section aria-label={`Monatliche Erträge und Aufwendungen ${metrics.year}`} className="rounded-lg border border-slate-200 bg-white px-4 py-4 sm:px-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Monatlicher Verlauf</h2>
            <p className="mt-1 text-xs text-slate-500">Ertrag und Aufwand in CHF · {metrics.year}</p>
          </div>
          <div className="flex gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />Ertrag</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-600" />Aufwand</span>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-1 sm:gap-x-2">
          {metrics.months.map((month) => (
            <div key={month.label} className="min-w-0 text-center" role="img" aria-label={`${month.label}: Ertrag ${currency(month.income, 'CHF')}, Aufwand ${currency(month.expenses, 'CHF')}`}>
              <div className="flex h-16 items-end justify-center gap-0.5 border-b border-slate-200 pb-1" title={`${month.label}: Ertrag ${currency(month.income, 'CHF')} · Aufwand ${currency(month.expenses, 'CHF')}`}>
                <div className="w-1.5 rounded-t-sm bg-emerald-600 sm:w-3" style={{ height: `${Math.min(100, Math.max(month.income > 0 ? 3 : 0, month.income / monthlyScale * 100))}%` }} />
                <div className="w-1.5 rounded-t-sm bg-rose-600 sm:w-3" style={{ height: `${Math.min(100, Math.max(month.expenses > 0 ? 3 : 0, month.expenses / monthlyScale * 100))}%` }} />
              </div>
              <span className="mt-1 block truncate text-[10px] capitalize text-slate-500">{month.label}</span>
            </div>
          ))}
        </div>
      </section>

      <SectionHeader
        title="Letzte Buchungen"
        subtitle="Zuletzt erfasste Buchungen in Originalwährung."
      />
      <BookingTable bookings={bookings.slice(0, 6)} />
    </div>
  );
};

export default Dashboard;
