export type BookingType = 'Einnahme' | 'Ausgabe';
export type PaymentStatus = 'Offen' | 'Bezahlt';

export type InvoiceStatus = 'Entwurf' | 'Versendet' | 'Bezahlt' | 'Überfällig' | 'Storniert';
export type OfferStatus  = 'Entwurf' | 'Versendet' | 'Angenommen' | 'Abgelehnt' | 'Abgelaufen';
export type ContactType = 'Kunde' | 'Lieferant' | 'Beides';

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

export type Invoice = {
  id: string;
  number: string;           // z. B. RE-2026-001
  date: string;             // ISO-Datum
  dueDate: string;          // ISO-Datum
  status: InvoiceStatus;
  contactId?: string;       // Referenz auf Contact
  contactName: string;
  contactCompany?: string;
  contactStreet?: string;
  contactZip?: string;
  contactCity?: string;
  contactCountry: string;
  contactEmail?: string;
  iban?: string;            // eigenes IBAN für QR-Rechnung
  reference?: string;       // QR-Referenz (optional)
  items: InvoiceLineItem[];
  currency: string;
  notes?: string;
  // Mahnung
  mahnungLevel?: 1 | 2 | 3;   // zuletzt versandte Mahnstufe
  mahnungDate?: string;         // Datum der letzten Mahnung (ISO)
  // Berechnete Felder (client-side)
  subtotal?: number;
  vatTotal?: number;
  total?: number;
};

export type Offer = {
  id: string;
  number: string;           // z. B. AN-2026-001
  date: string;             // ISO-Datum
  validUntil: string;       // Gültig bis (ISO-Datum)
  status: OfferStatus;
  contactId?: string;
  contactName: string;
  contactCompany?: string;
  contactStreet?: string;
  contactZip?: string;
  contactCity?: string;
  contactCountry: string;
  contactEmail?: string;
  items: InvoiceLineItem[];
  currency: string;
  notes?: string;
  convertedToInvoiceId?: string; // wenn umgewandelt
};

export type Contact = {
  id: string;
  type: ContactType;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  country: string;
  uid?: string;
  iban?: string;
  notes?: string;
};

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
