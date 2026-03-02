export type ParsedRow = {
  code: string;
  name: string;
  debit: number;
  credit: number;
  /** Computed: debit - credit (positive = Aktiven-Saldo, negative = Passiven-Saldo) */
  balance: number;
};

const parseNum = (s: string) =>
  parseFloat(s.replace(/['''`\s]/g, '').replace(',', '.')) || 0;

/**
 * Parses a CSV/TSV export from a Swiss accounting system.
 * Supports ; and , as separators, with or without header row.
 * Returns only rows where `code` is a numeric account number.
 */
export const parseCsv = (text: string): ParsedRow[] => {
  const sep = text.includes(';') ? ';' : '\t';
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const raw = lines[0].split(sep).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  // Detect header row by checking if first cell is numeric (no header) or text (has header)
  const hasHeader = /[a-z]/i.test(raw[0]);
  const headers = hasHeader ? raw : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Column index detection
  const idx = (patterns: string[]) =>
    headers.findIndex((h) => patterns.some((p) => h.includes(p)));

  const codeIdx    = hasHeader ? Math.max(idx(['konto', 'nr.', 'nr ', 'code', 'number']), 0) : 0;
  const nameIdx    = hasHeader ? idx(['bezeichnung', 'name', 'text', 'konto']) : 1;
  const debitIdx   = hasHeader ? idx(['soll', 'debit', 'debito'])             : -1;
  const creditIdx  = hasHeader ? idx(['haben', 'credit', 'credito'])          : -1;
  const balanceIdx = hasHeader ? idx(['saldo', 'balance', 'betrag', 'salto']) : -1;

  return dataLines
    .map((line) => {
      const cols = line.split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
      const code = cols[codeIdx]?.replace(/\D/g, '') ?? '';
      const name = nameIdx >= 0 ? (cols[nameIdx] ?? '') : (cols[1] ?? '');
      const debit   = debitIdx  >= 0 ? parseNum(cols[debitIdx])   : 0;
      const credit  = creditIdx >= 0 ? parseNum(cols[creditIdx])  : 0;
      const balance = balanceIdx >= 0
        ? parseNum(cols[balanceIdx])
        : debit - credit;
      return { code, name, debit, credit, balance };
    })
    .filter((r) => r.code && /^\d{3,5}$/.test(r.code) && (r.debit !== 0 || r.credit !== 0 || r.balance !== 0));
};
