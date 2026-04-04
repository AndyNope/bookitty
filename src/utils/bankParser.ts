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
  return parseFloat(
    s.replace(/['''`\s]/g, '').replace(',', '.')
  ) || 0;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

/**
 * Detect the separator (;  ,  \t) most likely used in a CSV string.
 */
function detectSep(firstLine: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function splitCSV(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === sep && !inQ) { result.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

type ColIndices = {
  date: number;
  valuta: number;
  description: number;
  credit: number;  // Gutschrift / Einnahme (positive)
  debit: number;   // Lastschrift / Ausgabe (positive)
  amount: number;  // Combined amount column (may be signed)
  ref: number;
};

function detectCols(headers: string[]): ColIndices {
  const h = headers.map(s => s.toLowerCase().replace(/[^a-z0-9äöü]/g, ''));
  const idx = (pats: string[]) => h.findIndex(c => pats.some(p => c.includes(p)));
  return {
    date:        Math.max(idx(['buchungsdatum', 'datum', 'date', 'bdate']), 0),
    valuta:      idx(['valutadatum', 'valuta', 'value']),
    description: idx(['buchungstext', 'text', 'beschreibung', 'description', 'details', 'verwendungszweck', 'info', 'betreff']),
    credit:      idx(['gutschrift', 'credit', 'einnahme', 'eingang', 'haben']),
    debit:       idx(['lastschrift', 'debit', 'ausgabe', 'ausgang', 'soll', 'belastung']),
    amount:      idx(['betrag', 'amount', 'summe', 'umsatz']),
    ref:         idx(['referenz', 'reference', 'ref', 'mitteilung', 'beleg']),
  };
}

function parseBankCSV(text: string): BankTransaction[] {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);
  const firstCells = splitCSV(lines[0], sep);
  const hasHeader = firstCells.some(c => /[a-zA-ZäöüÄÖÜ]/.test(c));

  const headers = hasHeader ? firstCells : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const cols = hasHeader ? detectCols(headers) : {
    date: 0, valuta: -1, description: 1, credit: -1, debit: -1, amount: 2, ref: -1,
  };

  const result: BankTransaction[] = [];
  for (const line of dataLines) {
    const cells = splitCSV(line, sep);
    if (cells.length < 2) continue;

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

    result.push({
      id: uid(),
      date,
      valuta: cols.valuta >= 0 ? toISO(cells[cols.valuta] ?? '') : undefined,
      description: description.replace(/\s+/g, ' ').trim(),
      amount,
      currency: 'CHF',
      reference: cols.ref >= 0 ? (cells[cols.ref] ?? '').trim() || undefined : undefined,
    });
  }
  return result;
}

// ─── camt.054 XML Parser ──────────────────────────────────────────────────────
function txt(el: Element | null | undefined, tag: string): string {
  return el?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

function parseCamt054(xml: string): BankTransaction[] {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return [];
  }

  const entries = Array.from(doc.getElementsByTagName('Ntry'));
  const result: BankTransaction[] = [];

  for (const e of entries) {
    const amtEl   = e.getElementsByTagName('Amt')[0];
    const raw     = parseNum(amtEl?.textContent ?? '0');
    const ccy     = amtEl?.getAttribute('Ccy') ?? 'CHF';
    const dir     = txt(e, 'CdtDbtInd');            // CRDT | DBIT
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
};

/** Score a single (transaction, booking) pair. */
function scoreMatch(tx: BankTransaction, bk: MatchableBooking): number {
  let score = 0;

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
