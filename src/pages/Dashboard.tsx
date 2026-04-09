import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import BookingTable from '../components/BookingTable';
import { useBookkeeping } from '../store/BookkeepingContext';
import { useLocation } from 'react-router-dom';

const currency = (value: number, currencyCode: string) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);

const Dashboard = () => {
  const { bookings, documents } = useBookkeeping();
  const location = useLocation();
  const base = location.pathname.startsWith('/demo') ? '/demo' : '/app';
  const income = bookings
    .filter((item) => item.type === 'Einnahme')
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = bookings
    .filter((item) => item.type === 'Ausgabe')
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const primaryCurrency = bookings[0]?.currency ?? 'CHF';
  const openDocs = documents.filter((doc) => doc.status !== 'Gebucht').length;

  // Überfällige offene Buchungen
  const today = new Date().toISOString().split('T')[0];
  const overdueBookings = bookings.filter(
    (b) => b.paymentStatus === 'Offen' && b.dueDate && b.dueDate < today,
  );
  const overdueSum = overdueBookings.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Einnahmen"
          value={currency(income, primaryCurrency)}
          helper="MTD"
          to={`${base}/buchungen?type=Einnahme`}
        />
        <StatCard
          label="Ausgaben"
          value={currency(expenses, primaryCurrency)}
          helper="MTD"
          to={`${base}/buchungen?type=Ausgabe`}
        />
        <StatCard
          label="Ergebnis"
          value={currency(balance, primaryCurrency)}
          helper="Aktueller Saldo"
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
          value={overdueBookings.length.toString()}
          helper={overdueBookings.length > 0 ? currency(overdueSum, primaryCurrency) + ' ausstehend' : 'Alles im grünen Bereich'}
          to={`${base}/buchungen?filter=overdue`}
        />
      </div>

      <SectionHeader
        title="Letzte Buchungen"
        subtitle="Überblick über aktuelle Buchungsvorgänge."
      />
      <BookingTable bookings={bookings.slice(0, 6)} />
    </div>
  );
};

export default Dashboard;
