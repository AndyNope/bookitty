export type BookingType = 'Einnahme' | 'Ausgabe';
export type PaymentStatus = 'Offen' | 'Bezahlt';

export type Booking = {
  id: string;
  date: string;
  description: string;
  account: string;
  /** Gegenkonto (Soll/Haben – double-entry contra account) */
  contraAccount: string;
  category: string;
  amount: number;
  vatAmount?: number;
  vatRate: number;
  currency: string;
  paymentStatus: PaymentStatus;
  type: BookingType;
  /** Link to the original PDF/image document */
  pdfUrl?: string;
  /** Zahlungsfälligkeit (ISO-Datum YYYY-MM-DD) – nur bei offenen Buchungen */
  dueDate?: string;
};

export type BookingDraft = Omit<Booking, 'id'> & { id?: string };

export type DocumentStatus = 'Neu' | 'In Prüfung' | 'Gebucht';

export type DocumentImport = {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: DocumentStatus;
  draft: BookingDraft;
  originalDraft?: BookingDraft;
  previewUrl?: string;
  detection?: string;
  templateApplied?: boolean;
  vendorPattern?: string;
};
