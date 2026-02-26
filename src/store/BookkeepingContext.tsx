import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { Booking, BookingDraft, DocumentImport } from '../types';
import { initialBookings, initialDocuments } from '../data/mock';
import { upsertTemplate } from '../utils/templateStore';

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;

const BOOKINGS_KEY = 'bookitty.bookings';
const DOCUMENTS_KEY = 'bookitty.documents';

const normalizeDraft = (draft: BookingDraft): BookingDraft => ({
  ...draft,
  currency: draft.currency ?? 'CHF',
  paymentStatus: draft.paymentStatus ?? 'Offen',
  vatRate: draft.vatRate ?? 0,
  vatAmount: draft.vatAmount,
  contraAccount:
    draft.contraAccount ??
    (draft.paymentStatus === 'Bezahlt' ? '1020 Bankguthaben' : '2000 VLL Kreditoren'),
});

const normalizeBooking = (booking: Booking): Booking => ({
  ...booking,
  currency: booking.currency ?? 'CHF',
  paymentStatus: booking.paymentStatus ?? 'Offen',
  vatRate: booking.vatRate ?? 0,
  vatAmount: booking.vatAmount,
  contraAccount:
    booking.contraAccount ??
    (booking.paymentStatus === 'Bezahlt' ? '1020 Bankguthaben' : '2000 VLL Kreditoren'),
});

const loadBookings = () => {
  if (typeof window === 'undefined') return initialBookings;
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return initialBookings;
    const parsed = JSON.parse(raw) as Booking[];
    return parsed.map(normalizeBooking);
  } catch {
    return initialBookings;
  }
};

const loadDocuments = () => {
  if (typeof window === 'undefined') return initialDocuments;
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return initialDocuments;
    const parsed = JSON.parse(raw) as DocumentImport[];
    return parsed.map((doc) => ({
      ...doc,
      previewUrl: undefined,
      draft: normalizeDraft(doc.draft),
    }));
  } catch {
    return initialDocuments;
  }
};

type BookkeepingContextValue = {
  bookings: Booking[];
  documents: DocumentImport[];
  addBooking: (draft: BookingDraft) => void;
  addDocument: (
    file: File,
    draftOverride?: BookingDraft,
    detection?: string,
    templateApplied?: boolean,
    vendorPattern?: string,
  ) => void;
  updateDocumentDraft: (id: string, draft: BookingDraft) => void;
  confirmDocument: (id: string) => void;
  removeDocument: (id: string) => void;
  removeBooking: (id: string) => void;
};

const BookkeepingContext = createContext<BookkeepingContextValue | undefined>(
  undefined,
);

export const BookkeepingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>(loadBookings);
  const [documents, setDocuments] = useState<DocumentImport[]>(loadDocuments);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sanitized = documents.map(({ previewUrl, ...doc }) => doc);
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(sanitized));
  }, [documents]);

  const addBooking = (draft: BookingDraft) => {
    setBookings((prev) => [
      {
        id: createId(),
        ...draft,
      },
      ...prev,
    ]);
  };

  const addDocument = (
    file: File,
    draftOverride?: BookingDraft,
    detection?: string,
    templateApplied?: boolean,
    vendorPattern?: string,
  ) => {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const today = new Date().toISOString().split('T')[0];
    const previewUrl = URL.createObjectURL(file);

    const draft: BookingDraft = draftOverride ?? {
      date: today,
      description: `Rechnung ${baseName}`,
      account: 'Bürobedarf',
      contraAccount: '2000 VLL Kreditoren',
      category: 'Bürobedarf',
      amount: Number((Math.random() * 400 + 80).toFixed(2)),
      vatRate: 19,
      currency: 'CHF',
      paymentStatus: 'Offen',
      type: 'Ausgabe',
    };

    setDocuments((prev) => [
      {
        id: createId(),
        fileName: file.name,
        uploadedAt: today,
        status: 'In Prüfung',
        draft,
        originalDraft: { ...draft },
        previewUrl,
        detection,
        templateApplied,
        vendorPattern,
      },
      ...prev,
    ]);
  };

  const updateDocumentDraft = (id: string, draft: BookingDraft) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, draft } : doc)),
    );
  };

  const confirmDocument = (id: string) => {
    const doc = documents.find((item) => item.id === id);
    if (!doc) return;

    addBooking(doc.draft);

    // Auto-learn: save stable fields as a vendor template so next invoice
    // from the same sender is pre-filled correctly
    const pattern =
      doc.vendorPattern ??
      doc.fileName.replace(/\.[^/.]+$/, '').slice(0, 30).toLowerCase();
    upsertTemplate(pattern, {
      account: doc.draft.account,
      category: doc.draft.category,
      vatRate: doc.draft.vatRate,
      currency: doc.draft.currency,
      type: doc.draft.type,
      paymentStatus: doc.draft.paymentStatus,
    });

    setDocuments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Gebucht' } : item,
      ),
    );
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((item) => item.id !== id));
  };

  const removeBooking = (id: string) => {
    setBookings((prev) => prev.filter((item) => item.id !== id));
  };

  const value = useMemo(
    () => ({
      bookings,
      documents,
      addBooking,
      addDocument,
      updateDocumentDraft,
      confirmDocument,
      removeDocument,
      removeBooking,
    }),
    [bookings, documents],
  );

  return (
    <BookkeepingContext.Provider value={value}>
      {children}
    </BookkeepingContext.Provider>
  );
};

export const useBookkeeping = () => {
  const ctx = useContext(BookkeepingContext);
  if (!ctx) {
    throw new Error('useBookkeeping must be used within BookkeepingProvider');
  }
  return ctx;
};
