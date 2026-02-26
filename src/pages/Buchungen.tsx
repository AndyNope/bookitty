import { useState } from 'react';
import BookingForm from '../components/BookingForm';
import BookingTable from '../components/BookingTable';
import SectionHeader from '../components/SectionHeader';
import { useBookkeeping } from '../store/BookkeepingContext';

const Buchungen = () => {
  const { bookings, addBooking, removeBooking } = useBookkeeping();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = (draft: Parameters<typeof addBooking>[0]) => {
    addBooking(draft);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Buchungen"
        subtitle="Erfassen, prüfen und verwalten Sie alle Buchungen."
        action={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Neue Buchung
          </button>
        }
      />
      <BookingTable bookings={bookings} onDelete={removeBooking} />

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-2xl">
            <BookingForm
              onSubmit={handleSubmit}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Buchungen;
