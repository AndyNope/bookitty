/**
 * Swiss QR-Rechnung PDF-Export
 * Erzeugt eine professionelle Rechnung mit Swiss QR-Code (SPC-Standard)
 * inkl. Trennlinie, Empfangsschein und Zahlungsschein.
 */
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { Invoice, InvoiceLineItem } from '../types';
import { getCompany } from './companyStore';

// ─── Calculations ─────────────────────────────────────────────────────────────
export function calcInvoiceTotals(items: InvoiceLineItem[]) {
  let subtotal = 0;
  let vatTotal = 0;
  const vatMap: Record<number, number> = {};

  for (const item of items) {
    const lineNet = item.quantity * item.unitPrice;
    const lineVat = lineNet * (item.vatRate / 100);
    subtotal += lineNet;
    vatTotal += lineVat;
    vatMap[item.vatRate] = (vatMap[item.vatRate] ?? 0) + lineVat;
  }

  return { subtotal, vatTotal, total: subtotal + vatTotal, vatMap };
}

// ─── Swiss QR payload (SPC standard) ─────────────────────────────────────────
function buildSpcPayload(inv: Invoice, total: number, companyIban: string): string {
  const iban = (inv.iban ?? companyIban ?? '').replace(/\s+/g, '');
  const amt  = total.toFixed(2);
  const ccy  = inv.currency || 'CHF';
  const company = getCompany();

  // Creditor (uns)
  const creditorName    = company.name || 'Bookitty';
  const creditorStreet  = company.street ?? '';
  const creditorCity    = company.city ?? '';
  const creditorCountry = 'CH';

  // Debtor (Kunde)
  const debtorName    = inv.contactName;
  const debtorStreet  = inv.contactStreet ?? '';
  const debtorCity    = `${inv.contactZip ?? ''} ${inv.contactCity ?? ''}`.trim();
  const debtorCountry = inv.contactCountry || 'CH';

  const ref    = inv.reference ?? '';
  const refType = ref ? 'NON' : 'NON'; // QRR only if 27-digit ref, else NON
  const info   = `Rechnung ${inv.number}`;

  // SPC v2.0 payload – each field on new line
  const lines = [
    'SPC',           // Qrtype
    '0200',          // Version
    '1',             // Coding
    iban,            // IBAN
    'S',             // Creditor AddressType
    creditorName,
    creditorStreet,
    '',              // Building number (separate field)
    creditorCity,
    creditorCountry,
    '',              // Ultimate creditor
    '', '', '', '', '', '',
    amt,
    ccy,
    'S',             // Debtor AddressType
    debtorName,
    debtorStreet,
    '',
    debtorCity,
    debtorCountry,
    refType,         // RmtInf / Ref type
    ref,             // Reference
    info,            // Additional info
    'EPD',           // Trailing EPD
  ];

  return lines.join('\n');
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
export async function exportInvoicePDF(inv: Invoice): Promise<void> {
  const company = getCompany();
  const { subtotal, total, vatMap } = calcInvoiceTotals(inv.items);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const PAGE_W = 210;
  const MARGIN = 20;
  const RIGHT  = PAGE_W - MARGIN;
  const COL2   = 120; // right-aligned column

  let y = 20;

  // ── Helper fns ──────────────────────────────────────────────────────────────
  const text  = (t: string, x: number, yy: number, opts?: Parameters<typeof doc.text>[3]) =>
    doc.text(t, x, yy, opts);
  const line  = (x1: number, y1: number, x2: number, y2: number) =>
    doc.line(x1, y1, x2, y2);
  const setFont = (style: 'normal' | 'bold', size: number) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };
  const setColor = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);

  // ── Company header (top-left) ────────────────────────────────────────────
  setFont('bold', 11);
  setColor(22, 25, 43);
  text(company.name || 'Mein Unternehmen', MARGIN, y);
  y += 5;
  setFont('normal', 9);
  setColor(80, 80, 80);
  if (company.street) { text(company.street, MARGIN, y); y += 4.5; }
  if (company.city)   { text(company.city,   MARGIN, y); y += 4.5; }
  if (company.email)  { text(company.email,  MARGIN, y); y += 4.5; }
  if (company.vatId) { text(`MWST: ${company.vatId}`, MARGIN, y); y += 4.5; }

  // ── Recipient address (right of header) ─────────────────────────────────
  let ry = 20;
  setFont('normal', 9);
  setColor(40, 40, 40);
  if (inv.contactCompany) { text(inv.contactCompany, COL2, ry); ry += 5; }
  text(inv.contactName, COL2, ry); ry += 5;
  if (inv.contactStreet)  { text(inv.contactStreet,  COL2, ry); ry += 5; }
  if (inv.contactZip || inv.contactCity) {
    text(`${inv.contactZip ?? ''} ${inv.contactCity ?? ''}`.trim(), COL2, ry); ry += 5;
  }
  text(inv.contactCountry, COL2, ry);

  // ── Invoice title ────────────────────────────────────────────────────────
  y = Math.max(y, ry) + 14;
  setFont('bold', 16);
  setColor(22, 25, 43);
  text('Rechnung', MARGIN, y);

  y += 7;
  setFont('normal', 9);
  setColor(80, 80, 80);
  text(`Rechnungsnr.:  ${inv.number}`,      MARGIN, y); y += 5;
  text(`Datum:         ${formatDate(inv.date)}`, MARGIN, y); y += 5;
  text(`Zahlbar bis:   ${formatDate(inv.dueDate)}`, MARGIN, y); y += 8;

  // ── Line items table header ──────────────────────────────────────────────
  doc.setFillColor(240, 235, 229);
  doc.rect(MARGIN, y, RIGHT - MARGIN, 7, 'F');
  setFont('bold', 8);
  setColor(22, 25, 43);
  text('Beschreibung',  MARGIN + 2, y + 5);
  text('Menge',         112, y + 5, { align: 'right' });
  text('Einheit',       120, y + 5);
  text('Preis',         152, y + 5, { align: 'right' });
  text('MwSt.',         165, y + 5, { align: 'right' });
  text('Betrag',        RIGHT - 1, y + 5, { align: 'right' });
  y += 9;

  // ── Line items ───────────────────────────────────────────────────────────
  setFont('normal', 8);
  for (const [i, item] of inv.items.entries()) {
    const net = item.quantity * item.unitPrice;
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(MARGIN, y - 4.5, RIGHT - MARGIN, 7, 'F');
    }
    setColor(40, 40, 40);
    text(item.description,                    MARGIN + 2, y);
    text(String(item.quantity),               112, y, { align: 'right' });
    text(item.unit || 'Stk.',                 122, y);
    text(fmtCHF(item.unitPrice),              152, y, { align: 'right' });
    text(`${item.vatRate}%`,                  165, y, { align: 'right' });
    text(fmtCHF(net),                         RIGHT - 1, y, { align: 'right' });
    y += 7;
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  y += 4;
  doc.setDrawColor(200, 200, 200);
  line(COL2, y, RIGHT, y);
  y += 5;

  setFont('normal', 9);
  setColor(80, 80, 80);
  text('Nettobetrag', COL2, y);
  text(fmtCHF(subtotal), RIGHT - 1, y, { align: 'right' });
  y += 5;

  for (const [rate, amt] of Object.entries(vatMap)) {
    text(`MwSt. ${rate}%`, COL2, y);
    text(fmtCHF(amt), RIGHT - 1, y, { align: 'right' });
    y += 5;
  }

  line(COL2, y, RIGHT, y);
  y += 6;
  setFont('bold', 11);
  setColor(22, 25, 43);
  text(`Total ${inv.currency}`, COL2, y);
  text(fmtCHF(total), RIGHT - 1, y, { align: 'right' });
  y += 8;

  // ── IBAN ─────────────────────────────────────────────────────────────────
  const payIban = (inv.iban ?? company.iban ?? '').replace(/\s+/g, '');
  if (payIban) {
    setFont('normal', 9);
    setColor(80, 80, 80);
    text(`Bitte überweisen an IBAN: ${formatIBAN(payIban)}`, MARGIN, y);
    y += 5;
  }

  // ── Notes ────────────────────────────────────────────────────────────────
  if (inv.notes) {
    y += 3;
    setFont('normal', 8.5);
    setColor(90, 90, 90);
    const noteLines = doc.splitTextToSize(inv.notes, RIGHT - MARGIN);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 5;
  }

  // ── Swiss QR-Rechnung section (bottom ~105mm) ────────────────────────────
  // Only generate if IBAN is present
  if (payIban) {
    await addSwissQR(doc, inv, total, payIban);
  }

  doc.save(`Rechnung-${inv.number}.pdf`);
}

// ─── Swiss QR section on last page ───────────────────────────────────────────
async function addSwissQR(doc: jsPDF, inv: Invoice, total: number, iban: string) {
  const company = getCompany();
  // Swiss QR is always at bottom of last page, requires scissor line at y=197mm from top
  // Section starts at y=197mm: Trennlinie, then Empfangsschein (62mm wide) + Zahlungsschein (148mm)
  const QR_Y = 197; // mm from top

  // Scissor line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(0, QR_Y, 210, QR_Y);
  // scissors icon (text approximation)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('✂', 1, QR_Y - 0.5);

  // ── Empfangsschein (left, 62mm) ──────────────────────────────────────────
  const ES_X  = 0;
  const ES_W  = 62;
  let ey = QR_Y + 7;

  const esText = (t: string, x: number, yy: number, opts?: Parameters<typeof doc.text>[3]) =>
    doc.text(t, ES_X + x, yy, opts);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  esText('Empfangsschein', 5, ey); ey += 7;

  // Konto/Zahlbar an
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  esText('Konto / Zahlbar an', 5, ey); ey += 3.5;
  doc.setFont('helvetica', 'normal');
  esText(formatIBAN(iban), 5, ey); ey += 3.5;
  esText(company.name || '', 5, ey); ey += 3.5;
  if (company.street) { esText(company.street, 5, ey); ey += 3.5; }
  if (company.city)   { esText(company.city,   5, ey); ey += 3.5; }
  ey += 3;

  doc.setFont('helvetica', 'bold');
  esText('Zahlbar durch', 5, ey); ey += 3.5;
  doc.setFont('helvetica', 'normal');
  esText(inv.contactName, 5, ey); ey += 3.5;
  if (inv.contactStreet) { esText(inv.contactStreet, 5, ey); ey += 3.5; }
  if (inv.contactCity)   { esText(`${inv.contactZip ?? ''} ${inv.contactCity ?? ''}`.trim(), 5, ey); ey += 3.5; }

  // Amount
  const amtY = QR_Y + 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  esText('Währung', 5, amtY);
  esText('Betrag', 20, amtY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  esText(inv.currency || 'CHF', 5, amtY + 4);
  esText(total.toFixed(2), 20, amtY + 4);

  // Trennlinie links (vertikal zwischen Empfangsschein und Zahlungsschein)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(ES_W, QR_Y, ES_W, 297);

  // ── Zahlungsschein (right, 148mm) ─────────────────────────────────────────
  const ZS_X  = ES_W;
  let zy = QR_Y + 7;

  const zsText = (t: string, x: number, yy: number, opts?: Parameters<typeof doc.text>[3]) =>
    doc.text(t, ZS_X + x, yy, opts);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  zsText('Zahlteil', 5, zy); zy += 7;

  // Generate QR code as data URL
  const payload = buildSpcPayload(inv, total, iban);
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  // QR image 46x46mm at left of Zahlungsschein
  const QR_SIZE = 46;
  doc.addImage(qrDataUrl, 'PNG', ZS_X + 5, zy, QR_SIZE, QR_SIZE);

  // Swiss cross in QR center (7x7mm white square, 4.2x4.2mm red cross)
  const cx = ZS_X + 5 + QR_SIZE / 2;
  const cy = zy + QR_SIZE / 2;
  doc.setFillColor(255, 255, 255);
  doc.rect(cx - 3.5, cy - 3.5, 7, 7, 'F');
  doc.setFillColor(220, 0, 0);
  doc.rect(cx - 0.7, cy - 3, 1.4, 6, 'F');
  doc.rect(cx - 3, cy - 0.7, 6, 1.4, 'F');

  // Currency + Amount (below QR)
  const qrBottom = zy + QR_SIZE + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  zsText('Währung', 5, qrBottom);
  zsText('Betrag',  30, qrBottom);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  zsText(inv.currency || 'CHF', 5, qrBottom + 5);
  zsText(total.toFixed(2), 30, qrBottom + 5);

  // Creditor info (right side of QR section)
  const INFO_X = 58;
  let infoY = QR_Y + 7;
  doc.setFontSize(8);

  doc.setFont('helvetica', 'bold');
  zsText('Konto / Zahlbar an', INFO_X, infoY); infoY += 4;
  doc.setFont('helvetica', 'normal');
  zsText(formatIBAN(iban), INFO_X, infoY); infoY += 4;
  zsText(company.name || '', INFO_X, infoY); infoY += 4;
  if (company.street) { zsText(company.street, INFO_X, infoY); infoY += 4; }
  if (company.city)   { zsText(company.city,   INFO_X, infoY); infoY += 4; }
  infoY += 3;

  if (inv.reference) {
    doc.setFont('helvetica', 'bold');
    zsText('Referenz', INFO_X, infoY); infoY += 4;
    doc.setFont('helvetica', 'normal');
    zsText(inv.reference, INFO_X, infoY); infoY += 4;
    infoY += 3;
  }

  doc.setFont('helvetica', 'bold');
  zsText('Zusätzliche Informationen', INFO_X, infoY); infoY += 4;
  doc.setFont('helvetica', 'normal');
  zsText(`Rechnung ${inv.number}`, INFO_X, infoY); infoY += 6;

  doc.setFont('helvetica', 'bold');
  zsText('Zahlbar durch', INFO_X, infoY); infoY += 4;
  doc.setFont('helvetica', 'normal');
  zsText(inv.contactName, INFO_X, infoY); infoY += 4;
  if (inv.contactStreet) { zsText(inv.contactStreet, INFO_X, infoY); infoY += 4; }
  if (inv.contactCity) {
    zsText(`${inv.contactZip ?? ''} ${inv.contactCity ?? ''}`.trim(), INFO_X, infoY);
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────
function fmtCHF(n: number): string {
  return n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function formatIBAN(iban: string): string {
  const raw = iban.replace(/\s+/g, '');
  return raw.replace(/(.{4})/g, '$1 ').trim();
}
