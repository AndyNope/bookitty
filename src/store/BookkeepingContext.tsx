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
import { useAuth } from './AuthContext';
import { api, tokenStore } from '../services/api';

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
  const { user, isLoading: authLoading } = useAuth();
  const isDemo = !user; // true = localStorage mode, false = API mode

  const [bookings,  setBookings]  = useState<Booking[]>(loadBookings);
  const [documents, setDocuments] = useState<DocumentImport[]>(loadDocuments);

  // ── Sync data based on auth state ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve

    if (user) {
      // Logged-in: fetch fresh data from API
      api.bookings.list().then(setBookings).catch(console.error);
      api.documents.list().then(setDocuments).catch(console.error);
    } else {
      // Demo mode: reset to localStorage / initial data
      setBookings(loadBookings());
      setDocuments(loadDocuments());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // ── Persist to localStorage only in demo mode ──────────────────────────────
  useEffect(() => {
    if (tokenStore.get()) return; // logged-in users: don't overwrite localStorage
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    if (tokenStore.get()) return;
    const sanitized = documents.map(({ previewUrl, ...doc }) => doc);
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(sanitized));
  }, [documents]);

  const addBooking = (draft: BookingDraft) => {
    const booking: Booking = { id: createId(), ...draft };
    setBookings((prev) => [booking, ...prev]);
    if (!isDemo) {
      api.bookings.create(booking).catch(console.error);
    }
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
    const blobUrl = URL.createObjectURL(file);

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

    const tempId = createId();
    const docData: DocumentImport = {
      id: tempId,
      fileName: file.name,
      uploadedAt: today,
      status: 'In Prüfung',
      draft,
      originalDraft: { ...draft },
      previewUrl: blobUrl,
      detection,
      templateApplied,
      vendorPattern,
    };

    setDocuments((prev) => [docData, ...prev]);

    if (!isDemo) {
      // Fire-and-forget: upload file → save metadata with permanent URL
      (async () => {
        try {
          const { url } = await api.upload(file);
          const docWithUrl = { ...docData, previewUrl: url };
          await api.documents.create(docWithUrl);
          setDocuments((prev) =>
            prev.map((d) => (d.id === tempId ? { ...d, previewUrl: url } : d)),
          );
        } catch (e) {
          console.error('Document upload failed:', e);
        }
      })();
    }
  };

  const updateDocumentDraft = (id: string, draft: BookingDraft) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, draft } : doc)),
    );
    if (!isDemo) {
      api.documents.update(id, { draft }).catch(console.error);
    }
  };

  const confirmDocument = (id: string) => {
    const doc = documents.find((item) => item.id === id);
    if (!doc) return;

    addBooking(doc.draft);

    const pattern =
      doc.vendorPattern ??
      doc.fileName.replace(/\.[^/.]+$/, '').slice(0, 30).toLowerCase();

    upsertTemplate(pattern, {
      account:       doc.draft.account,
      category:      doc.draft.category,
      vatRate:       doc.draft.vatRate,
      currency:      doc.draft.currency,
      type:          doc.draft.type,
      paymentStatus: doc.draft.paymentStatus,
    });

    setDocuments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Gebucht' } : item,
      ),
    );

    if (!isDemo) {
      api.documents.update(id, { status: 'Gebucht' }).catch(console.error);
      api.templates.upsert(pattern, {
        account: doc.draft.account, category: doc.draft.category,
        vatRate: doc.draft.vatRate, currency: doc.draft.currency,
        type: doc.draft.type, paymentStatus: doc.draft.paymentStatus,
      }).catch(console.error);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((item) => item.id !== id));
    if (!isDemo) {
      api.documents.remove(id).catch(console.error);
    }
  };

  const removeBooking = (id: string) => {
    setBookings((prev) => prev.filter((item) => item.id !== id));
    if (!isDemo) {
      api.bookings.remove(id).catch(console.error);
    }
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
