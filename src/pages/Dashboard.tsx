import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import BookingTable from '../components/BookingTable';
import { useBookkeeping } from '../store/BookkeepingContext';

const currency = (value: number, currencyCode: string) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);

const Dashboard = () => {
  const { bookings, documents } = useBookkeeping();
  const income = bookings
    .filter((item) => item.type === 'Einnahme')
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = bookings
    .filter((item) => item.type === 'Ausgabe')
    .reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const primaryCurrency = bookings[0]?.currency ?? 'CHF';
  const openDocs = documents.filter((doc) => doc.status !== 'Gebucht').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Einnahmen"
          value={currency(income, primaryCurrency)}
          helper="MTD"
        />
        <StatCard
          label="Ausgaben"
          value={currency(expenses, primaryCurrency)}
          helper="MTD"
        />
        <StatCard
          label="Ergebnis"
          value={currency(balance, primaryCurrency)}
          helper="Aktueller Saldo"
        />
        <StatCard
          label="Offene Belege"
          value={openDocs.toString()}
          helper="In Prüfung"
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
