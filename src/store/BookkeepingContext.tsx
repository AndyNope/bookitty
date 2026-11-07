import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Booking, BookingDraft, DocumentImport } from '../types';
import { initialBookings, initialDocuments } from '../data/mock';
import { upsertTemplate } from '../utils/templateStore';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { completeOnboardingTask, getOnboardingScope } from '../utils/onboardingProgress';

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
  addBooking: (draft: BookingDraft) => Promise<void>;
  addBookings: (drafts: BookingDraft[]) => Promise<void>;
  addDocument: (
    file: File,
    draftOverride?: BookingDraft,
    detection?: string,
    templateApplied?: boolean,
    vendorPattern?: string,
    isDirectUpload?: boolean,
  ) => Promise<void>;
  updateDocumentDraft: (id: string, draft: BookingDraft) => Promise<void>;
  confirmDocument: (id: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  removeBooking: (id: string) => Promise<void>;
  updateBooking: (id: string, draft: BookingDraft) => Promise<void>;
};

const BookkeepingContext = createContext<BookkeepingContextValue | undefined>(
  undefined,
);

export const BookkeepingProvider = ({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) => {
  const { user, isLoading: authLoading } = useAuth();

  const [bookings,  setBookings]  = useState<Booking[]>(() =>
    isDemo ? loadBookings() : []
  );
  const [documents, setDocuments] = useState<DocumentImport[]>(() =>
    isDemo ? loadDocuments() : []
  );
  const draftWrites = useRef(new Map<string, Promise<void>>());

  // ── Sync data from API when logged in ────────────────────────────────────
  useEffect(() => {
    if (isDemo) return; // demo uses localStorage state
    if (authLoading) return;
    if (user) {
      api.bookings.list().then(setBookings).catch(console.error);
      api.documents.list().then(setDocuments).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, user?.id, authLoading]);

  // ── Persist to localStorage in demo mode only ────────────────────────────
  useEffect(() => {
    if (!isDemo) return;
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }, [bookings, isDemo]);

  useEffect(() => {
    if (!isDemo) return;
    const sanitized = documents.map(({ previewUrl, ...doc }) => doc);
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(sanitized));
  }, [documents, isDemo]);

  const addBooking = async (draft: BookingDraft) => {
    const booking: Booking = { id: createId(), ...draft };
    if (!isDemo) await api.bookings.create(booking);
    setBookings((prev) => [booking, ...prev]);
    const onboardingScope = getOnboardingScope(user?.id, isDemo);
    if (onboardingScope) completeOnboardingTask('booking', onboardingScope);
  };

  const addBookings = async (drafts: BookingDraft[]) => {
    if (!drafts.length) return;
    const entries = drafts.map((draft) => ({ id: createId(), ...draft }));
    if (!isDemo) await api.bookings.createBatch(entries);
    setBookings((prev) => [...entries.reverse(), ...prev]);
    const onboardingScope = getOnboardingScope(user?.id, isDemo);
    if (onboardingScope) completeOnboardingTask('booking', onboardingScope);
  };

  const addDocument = async (
    file: File,
    draftOverride?: BookingDraft,
    detection?: string,
    templateApplied?: boolean,
    vendorPattern?: string,
    isDirectUpload = false,
  ) => {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const today = new Date().toISOString().split('T')[0];

    const draft: BookingDraft = draftOverride ?? {
      date: today,
      description: `Rechnung ${baseName}`,
      account: 'Bürobedarf',
      contraAccount: '2000 VLL Kreditoren',
      category: 'Bürobedarf',
      amount: 0,
      vatRate: 0,
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
      previewUrl: isDemo ? URL.createObjectURL(file) : undefined,
      detection,
      templateApplied,
      vendorPattern,
    };

    const onboardingScope = getOnboardingScope(user?.id, isDemo);
    if (!isDemo) {
      const { url } = await api.upload(file);
      docData.previewUrl = url;
      await api.documents.create(docData);
    }
    setDocuments((prev) => [docData, ...prev]);
    if (isDirectUpload && onboardingScope) completeOnboardingTask('document', onboardingScope);
  };

  const updateDocumentDraft = (id: string, draft: BookingDraft): Promise<void> => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, draft } : doc)),
    );
    if (isDemo) return Promise.resolve();
    const previous = draftWrites.current.get(id) ?? Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => { await api.documents.update(id, { draft }); });
    draftWrites.current.set(id, pending);
    void pending.then(
      () => { if (draftWrites.current.get(id) === pending) draftWrites.current.delete(id); },
      () => { if (draftWrites.current.get(id) === pending) draftWrites.current.delete(id); },
    );
    return pending;
  };

  const confirmDocument = async (id: string) => {
    const doc = documents.find((item) => item.id === id);
    if (!doc) throw new Error('Beleg nicht gefunden.');

    const booking: Booking = { id: createId(), ...doc.draft, pdfUrl: doc.previewUrl };
    if (!isDemo) {
      await draftWrites.current.get(id)?.catch(() => {});
      await api.documents.confirm(id, booking.id, doc.draft);
    }
    setBookings((prev) => [booking, ...prev]);
    const onboardingScope = getOnboardingScope(user?.id, isDemo);
    if (onboardingScope) completeOnboardingTask('booking', onboardingScope);

    const pattern =
      doc.vendorPattern ??
      doc.fileName.replace(/\.[^/.]+$/, '').slice(0, 30).toLowerCase();

    try {
      upsertTemplate(pattern, {
        account:       doc.draft.account,
        contraAccount: doc.draft.contraAccount,
        category:      doc.draft.category,
        vatRate:       doc.draft.vatRate,
        currency:      doc.draft.currency,
        type:          doc.draft.type,
        paymentStatus: doc.draft.paymentStatus,
      });
    } catch (error) {
      console.error('Belegvorlage konnte nicht lokal gespeichert werden:', error);
    }

    setDocuments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Gebucht' } : item,
      ),
    );

    if (!isDemo) {
      api.templates.upsert(pattern, {
        account: doc.draft.account, contraAccount: doc.draft.contraAccount,
        category: doc.draft.category,
        vatRate: doc.draft.vatRate, currency: doc.draft.currency,
        type: doc.draft.type, paymentStatus: doc.draft.paymentStatus,
      }).catch(console.error);
    }
  };

  const removeDocument = async (id: string) => {
    if (!isDemo) await api.documents.remove(id);
    setDocuments((prev) => prev.filter((item) => item.id !== id));
  };

  const removeBooking = async (id: string) => {
    if (!isDemo) await api.bookings.remove(id);
    setBookings((prev) => prev.filter((item) => item.id !== id));
  };

  const updateBooking = async (id: string, draft: BookingDraft) => {
    if (!isDemo) await api.bookings.update(id, draft);
    setBookings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...draft } : item)),
    );
  };

  const value = useMemo(
    () => ({
      bookings,
      documents,
      addBooking,
      addBookings,
      addDocument,
      updateDocumentDraft,
      confirmDocument,
      removeDocument,
      removeBooking,
      updateBooking,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookings, documents],
  );

  return (
    <BookkeepingContext.Provider value={value}>
      {children}
    </BookkeepingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBookkeeping = () => {
  const ctx = useContext(BookkeepingContext);
  if (!ctx) {
    throw new Error('useBookkeeping must be used within BookkeepingProvider');
  }
  return ctx;
};
