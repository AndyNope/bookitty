import Papa from 'papaparse';

/**
 * bankParser.ts – Parses Swiss bank statement files
 * Supports:
 *  • CSV/TSV (PostFinance, Raiffeisen, ZKB, Neon, ZAK – auto-detect)
 *  • camt.054 XML (ISO 20022, used by all Swiss banks)
 *  • MT940 (legacy SWIFT, still used by some cantonal banks)
 */

export type BankTransaction = {
  id: string;
  date: string;      // ISO YYYY-MM-DD
  valuta?: string;   // ISO YYYY-MM-DD
  description: string;
  amount: number;    // positive = Einnahme (credit), negative = Ausgabe (debit)
  currency: string;
  reference?: string; // QR-ref, ESR-ref, or IBAN-ref
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _seq = 0;
function uid() { return `bt-${Date.now()}-${++_seq}`; }

function toISO(raw: string): string {
  const s = raw.trim();
  // DD.MM.YYYY  or DD.MM.YY
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dmy) {
    let yr = parseInt(dmy[3]);
    if (yr < 100) yr += yr < 50 ? 2000 : 1900;
    return `${yr}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  // YYMMDD (MT940 style)
  const ymd6 = s.match(/^(\d{6})$/);
  if (ymd6) {
    const yr = 2000 + parseInt(s.slice(0, 2));
    return `${yr}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
  }
  // Already ISO or close enough
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function parseNum(s: string): number {
  let value = s.replace(/['’`\s]/g, '');
  if (!value) return 0;
  if (value.includes(',') && value.includes('.')) {
    value = value.lastIndexOf(',') > value.lastIndexOf('.')
      ? value.replace(/\./g, '').replace(',', '.')
      : value.replace(/,/g, '');
  } else {
    value = value.replace(',', '.');
  }
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(value)) throw new Error('Ein Betrag im Kontoauszug ist ungültig oder nicht eindeutig.');
  return Number(value);
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

type ColIndices = {
  date: number;
  valuta: number;
  description: number;
  credit: number;  // Gutschrift / Einnahme (positive)
  debit: number;   // Lastschrift / Ausgabe (positive)
  amount: number;  // Combined amount column (may be signed)
  ref: number;
  currency: number;
};

function detectCols(headers: string[]): ColIndices {
  const h = headers.map(s => s.toLowerCase().replace(/[^a-z0-9äöü]/g, ''));
  const idx = (pats: string[]) => h.findIndex(c => pats.some(p => c.includes(p)));
  return {
    date:        Math.max(idx(['completeddate']) >= 0 ? idx(['completeddate']) : idx(['buchungsdatum', 'datum', 'date', 'bdate']), 0),
    valuta:      idx(['valutadatum', 'valuta', 'value']),
    description: idx(['buchungstext', 'text', 'beschreibung', 'description', 'details', 'verwendungszweck', 'info', 'betreff']),
    credit:      idx(['gutschrift', 'credit', 'einnahme', 'eingang', 'haben']),
    debit:       idx(['lastschrift', 'debit', 'ausgabe', 'ausgang', 'soll', 'belastung']),
    amount:      idx(['betrag', 'amount', 'summe', 'umsatz']),
    ref:         idx(['referenz', 'reference', 'ref', 'mitteilung', 'beleg']),
    currency:    idx(['currency', 'währung', 'waehrung', 'devise']),
  };
}

function parseBankCSV(text: string): BankTransaction[] {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error('Die CSV-Datei ist fehlerhaft oder das Trennzeichen wurde nicht erkannt.');
  const rows = parsed.data;
  if (rows.length < 2) return [];

  const firstCells = rows[0];
  const hasHeader = firstCells.some(c => /[a-zA-ZäöüÄÖÜ]/.test(c));

  const headers = hasHeader ? firstCells : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const cols = hasHeader ? detectCols(headers) : {
    date: 0, valuta: -1, description: 1, credit: -1, debit: -1, amount: 2, ref: -1, currency: -1,
  };

  const normalizedHeaders = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const revolutState = normalizedHeaders.indexOf('state');
  const revolutFee = normalizedHeaders.indexOf('fee');
  const isRevolutFormat = normalizedHeaders.includes('starteddate') && normalizedHeaders.includes('completeddate') && revolutState >= 0;

  const result: BankTransaction[] = [];
  for (const cells of dataRows) {
    if (cells.length < 2) continue;
    if (isRevolutFormat && (cells[revolutState] ?? '').trim().toUpperCase() !== 'COMPLETED') continue;
    if (isRevolutFormat && revolutFee >= 0 && parseNum(cells[revolutFee] ?? '') !== 0) {
      throw new Error('Revolut-Exporte mit separaten Gebühren können noch nicht sicher importiert werden. Bitte einen CAMT-Kontoauszug verwenden.');
    }

    const rawDate = cells[cols.date] ?? '';
    const date = toISO(rawDate);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue; // skip non-date rows

    const description = cols.description >= 0 ? (cells[cols.description] ?? '') : cells[1] ?? '';

    let amount = 0;
    if (cols.credit >= 0 || cols.debit >= 0) {
      // Separate credit/debit columns
      const cr = cols.credit >= 0 ? parseNum(cells[cols.credit] ?? '') : 0;
      const dr = cols.debit  >= 0 ? parseNum(cells[cols.debit]  ?? '') : 0;
      amount = cr > 0 ? cr : -Math.abs(dr);
    } else if (cols.amount >= 0) {
      amount = parseNum(cells[cols.amount] ?? '');
    }

    if (amount === 0) continue;

    const currency = cols.currency >= 0 ? (cells[cols.currency] ?? '').trim().toUpperCase() : 'CHF';
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Die Währung einer Transaktion ist ungültig oder fehlt.');
    result.push({
      id: uid(),
      date,
      valuta: cols.valuta >= 0 ? toISO(cells[cols.valuta] ?? '') : undefined,
      description: description.replace(/\s+/g, ' ').trim(),
      amount,
      currency,
      reference: cols.ref >= 0 ? (cells[cols.ref] ?? '').trim() || undefined : undefined,
    });
  }
  return result;
}

// ─── camt.054 XML Parser ──────────────────────────────────────────────────────
function txt(el: Element | null | undefined, tag: string): string {
  return el?.getElementsByTagNameNS('*', tag)[0]?.textContent?.trim() ?? '';
}

function parseCamt054(xml: string): BankTransaction[] {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return [];
  }

  const entries = Array.from(doc.getElementsByTagNameNS('*', 'Ntry'));
  const result: BankTransaction[] = [];

  for (const e of entries) {
    const amtEl   = e.getElementsByTagNameNS('*', 'Amt')[0];
    const raw     = parseNum(amtEl?.textContent ?? '0');
    const ccy     = (amtEl?.getAttribute('Ccy') ?? '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(ccy)) throw new Error('Die Währung einer CAMT-Transaktion ist ungültig oder fehlt.');
    const dir     = txt(e, 'CdtDbtInd');            // CRDT | DBIT
    const status = txt(e, 'Sts');
    if (status && status !== 'BOOK') continue;
    if (dir !== 'CRDT' && dir !== 'DBIT') throw new Error('CAMT-Transaktion ohne gültige Soll-/Haben-Kennzeichnung.');
    const amount  = dir === 'DBIT' ? -Math.abs(raw) : Math.abs(raw);
    const date    = txt(e, 'Dt') || txt(e, 'BookgDt');
    const valuta  = txt(e, 'ValDt') || undefined;

    // Description: try multiple paths
    const desc =
      txt(e, 'AddtlNtryInf') ||
      txt(e, 'AddtlTxInf') ||
      txt(e, 'NtryDtls') ||
      txt(e, 'Ustrd') ||
      `${dir === 'DBIT' ? 'Belastung' : 'Gutschrift'} ${ccy} ${Math.abs(amount).toFixed(2)}`;

    // Reference: QR-ref preferred, then any Ref element
    const ref =
      txt(e, 'Ref') ||
      txt(e, 'EndToEndId') ||
      undefined;

    if (!date || raw === 0) continue;

    result.push({
      id: uid(),
      date: toISO(date),
      valuta: valuta ? toISO(valuta) : undefined,
      description: desc.replace(/\s+/g, ' ').trim(),
      amount,
      currency: ccy,
      reference: ref || undefined,
    });
  }
  return result;
}

// ─── MT940 Parser ─────────────────────────────────────────────────────────────
function parseMT940(text: string): BankTransaction[] {
  const result: BankTransaction[] = [];
  const lines = text.split(/\r?\n/);
  let currentYear = new Date().getFullYear();

  // Find base year from :60F: balance line
  for (const line of lines) {
    const m60 = line.match(/^:60[FC]:[DC](\d{2})(\d{2})(\d{2})/);
    if (m60) {
      currentYear = 2000 + parseInt(m60[1]);
      break;
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // :61: transaction line
    const m61 = line.match(/^:61:(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([CD])R?([A-Z]+)(\d+,\d*)/);
    if (m61) {
      const bookYr = 2000 + parseInt(m61[1]);
      const bookMM = m61[2];
      const bookDD = m61[3];
      const dir    = m61[6]; // C = Credit, D = Debit
      const amtStr = m61[8].replace(',', '.');
      const amount = dir === 'C' ? parseFloat(amtStr) : -parseFloat(amtStr);
      const date   = `${bookYr}-${bookMM}-${bookDD}`;

      // Look ahead for :86: description
      let description = '';
      let ref: string | undefined;
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith(':61:') && !lines[j].startsWith(':62')) {
        if (lines[j].startsWith(':86:')) {
          description = lines[j].slice(4).replace(/^\d{3}/, '').replace(/\//g, ' ').trim();
        } else if (lines[j].match(/^[^:]/)) {
          description += ' ' + lines[j].trim();
        }
        j++;
      }
      description = description.replace(/\s+/g, ' ').trim();

      result.push({
        id: uid(),
        date,
        description: description || (dir === 'C' ? 'Gutschrift' : 'Belastung'),
        amount,
        currency: 'CHF',
        reference: ref,
      });
      i = j;
      continue;
    }
    i++;
  }

  void currentYear; // used indirectly via date construction above
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Auto-detect format and parse bank file → transactions. */
export async function parseBankFile(file: File): Promise<BankTransaction[]> {
  const text = await file.text();
  const name = file.name.toLowerCase();

  // camt.054 / camt.052 / camt.053 XML
  if (name.endsWith('.xml') || text.trimStart().startsWith('<')) {
    if (text.includes('Ntry') || text.includes('BkToCstmr')) {
      return parseCamt054(text);
    }
  }

  // MT940
  if (text.includes(':20:') || text.includes(':60F:') || text.includes(':61:')) {
    return parseMT940(text);
  }

  // Default: CSV / TSV
  return parseBankCSV(text);
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export type MatchConfidence = 'high' | 'medium' | 'none';

export type MatchResult = {
  transactionId: string;
  bookingId: string;
  confidence: MatchConfidence;
  score: number;
};

type MatchableBooking = {
  id: string;
  date: string;
  amount: number;
  description?: string;
  paymentStatus?: string;
  currency?: string;
  type?: 'Einnahme' | 'Ausgabe';
};

/** Score a single (transaction, booking) pair. */
function scoreMatch(tx: BankTransaction, bk: MatchableBooking): number {
  let score = 0;

  if (bk.currency && bk.currency.toUpperCase() !== tx.currency.toUpperCase()) return 0;
  if (bk.type && (tx.amount > 0) !== (bk.type === 'Einnahme')) return 0;

  // ── Amount (mandatory) ──────────────────────────────────────────────────
  const txAmt = Math.abs(tx.amount);
  const bkAmt = Math.abs(bk.amount);
  if (Math.abs(txAmt - bkAmt) < 0.02) score += 50;
  else return 0; // Amount must match

  // ── Date proximity ───────────────────────────────────────────────────────
  const txD = new Date(tx.date).getTime();
  const bkD = new Date(bk.date).getTime();
  const daysDiff = Math.abs((txD - bkD) / 86_400_000);
  if      (daysDiff <= 1) score += 30;
  else if (daysDiff <= 3) score += 20;
  else if (daysDiff <= 7) score += 10;
  else if (daysDiff <= 14) score += 3;

  // ── Description overlap ──────────────────────────────────────────────────
  if (bk.description) {
    const txDesc = tx.description.toLowerCase();
    const bkDesc = bk.description.toLowerCase();
    const words  = bkDesc.split(/\s+/).filter(w => w.length > 3);
    const hits   = words.filter(w => txDesc.includes(w)).length;
    if (words.length > 0) score += Math.round((hits / words.length) * 10);
  }

  return score;
}

/**
 * Auto-match an array of bank transactions against open bookings.
 * Returns only the best match per transaction (no re-use of bookings).
 */
export function autoMatch(
  transactions: BankTransaction[],
  bookings: MatchableBooking[],
): MatchResult[] {
  const usedBookingIds = new Set<string>();
  const results: MatchResult[] = [];

  for (const tx of transactions) {
    let best: { bookingId: string; score: number } | null = null;

    for (const bk of bookings) {
      if (usedBookingIds.has(bk.id)) continue;
      if (bk.paymentStatus === 'Bezahlt') continue;

      const score = scoreMatch(tx, bk);
      if (score > 0 && (!best || score > best.score)) {
        best = { bookingId: bk.id, score };
      }
    }

    if (best && best.score >= 50) {
      usedBookingIds.add(best.bookingId);
      results.push({
        transactionId: tx.id,
        bookingId: best.bookingId,
        confidence: best.score >= 80 ? 'high' : 'medium',
        score: best.score,
      });
    }
  }

  return results;
}
