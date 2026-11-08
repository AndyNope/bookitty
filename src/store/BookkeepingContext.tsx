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
import { learnedFields, mergeServerTemplates, upsertTemplate } from '../utils/templateStore';
import { documentIdentityKeys, parseDocumentIdentity } from '../utils/documentIdentity';
import { getCompany, saveCompany } from '../utils/companyStore';
import LogoLoader from '../components/LogoLoader';
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
  ) => Promise<string>;
  updateDocumentDraft: (id: string, draft: BookingDraft, userChanges?: Partial<BookingDraft>) => Promise<void>;
  confirmDocument: (id: string) => Promise<{ learningSaved: boolean }>;
  prepareDocumentLearning: () => Promise<void>;
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
  const [initialLoading, setInitialLoading] = useState(!isDemo);
  const draftWrites = useRef(new Map<string, Promise<void>>());
  const templateWrites = useRef<Promise<void>>(Promise.resolve());
  const learningFailures = useRef(new Set<string>());

  const prepareDocumentLearning = async () => {
    await Promise.all([...draftWrites.current.values()]);
    if (isDemo) return;
    await templateWrites.current.catch(() => {});
    const [templates, company] = await Promise.all([
      api.templates.list(),
      api.company.get().catch(() => null),
    ]);
    mergeServerTemplates(templates);
    if (company && typeof company.name === 'string') saveCompany({ ...getCompany(), ...company });
  };

  const learnDocument = (doc: DocumentImport, fields: Partial<BookingDraft>): Promise<boolean> => {
    const keys = documentIdentityKeys(parseDocumentIdentity(doc.vendorPattern));
    const learned = learnedFields(fields);
    if (!keys.length || !Object.keys(learned).length) return Promise.resolve(false);
    const pending = templateWrites.current.catch(() => {}).then(async () => {
      for (const key of keys) {
        if (!isDemo) await api.templates.upsert(key, learned);
        upsertTemplate(key, learned);
      }
    });
    templateWrites.current = pending;
    return pending.then(() => true);
  };

  // ── Sync data from API when logged in ────────────────────────────────────
  useEffect(() => {
    if (isDemo) return; // demo uses localStorage state
    if (authLoading) return;
    if (user) {
      let active = true;
      const bookingsRequest = api.bookings.list().then((items) => { if (active) setBookings(items); }).catch(console.error);
      const documentsRequest = api.documents.list().then((items) => { if (active) setDocuments(items); }).catch(console.error);
      void Promise.all([bookingsRequest, documentsRequest]).finally(() => { if (active) setInitialLoading(false); });
      return () => { active = false; };
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
    return tempId;
  };

  const updateDocumentDraft = (id: string, draft: BookingDraft, userChanges: Partial<BookingDraft> = {}): Promise<void> => {
    const doc = documents.find((item) => item.id === id);
    const changed: Partial<BookingDraft> = {};
    if (doc && doc.status !== 'Gebucht') {
      for (const key of ['account', 'contraAccount', 'category', 'type', 'vatRate'] as const) {
        if (Object.hasOwn(userChanges, key) && draft[key] !== doc.draft[key]) Object.assign(changed, { [key]: draft[key] });
      }
    }
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, draft } : doc)),
    );
    const previous = draftWrites.current.get(id) ?? Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
      if (!isDemo) await api.documents.update(id, { draft });
      if (doc && Object.keys(changed).length) {
        try {
          if (!await learnDocument(doc, changed)) throw new Error('Keine eindeutige Belegidentität');
          learningFailures.current.delete(id);
        } catch {
          learningFailures.current.add(id);
          throw new Error('Der Entwurf wurde gespeichert, aber die Lernregel konnte nicht gespeichert werden.');
        }
      }
    });
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

    setDocuments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Gebucht' } : item,
      ),
    );

    return { learningSaved: !learningFailures.current.has(id) };
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
      prepareDocumentLearning,
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
      {initialLoading && <LogoLoader text="Firmendaten werden geladen…" />}
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
