export type ParsedRow = {
  code: string;
  name: string;
  debit: number;
  credit: number;
  /** Positive = Aktiven-Saldo, negative = Passiven-Saldo */
  balance: number;
};

/** Column index mapping: -1 means «not present in file» */
export type ColMap = {
  codeIdx: number;
  nameIdx: number;
  debitIdx: number;
  creditIdx: number;
  balanceIdx: number;
};

const parseNum = (s: string) =>
  parseFloat(s.replace(/['''`\s]/g, '').replace(',', '.')) || 0;

const idxOf = (headers: string[], patterns: string[]) =>
  headers.findIndex((h) => patterns.some((p) => h.includes(p)));

/** Detect separator, split into lines and extract original-case headers. */
export const detectSeparatorAndHeader = (text: string) => {
  const sep = text.includes(';') ? ';' : '\t';
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstCells =
    lines[0]?.split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim()) ?? [];
  const hasHeader = firstCells.some((c) => /[a-zA-Z]/.test(c));
  const headers = hasHeader ? firstCells : [];
  return { sep, lines, headers, hasHeader };
};

/** Auto-detect column roles from header names. */
export const detectColumns = (headers: string[]): ColMap => {
  if (!headers.length) {
    // No header row: use sensible positional defaults
    return { codeIdx: 0, nameIdx: 1, debitIdx: 2, creditIdx: 3, balanceIdx: -1 };
  }
  const h = headers.map((s) => s.toLowerCase().trim());
  return {
    codeIdx:    Math.max(idxOf(h, ['konto', 'nr.', 'nr ', 'code', 'number', 'kto']), 0),
    nameIdx:    idxOf(h, ['bezeichnung', 'name', 'text', 'beschreibung']),
    debitIdx:   idxOf(h, ['soll', 'debit', 'debito']),
    creditIdx:  idxOf(h, ['haben', 'credit', 'credito']),
    balanceIdx: idxOf(h, ['saldo', 'balance', 'betrag', 'salto', 'total']),
  };
};

/** Parse data lines with an explicit column map (allows user corrections). */
export const parseWithColMap = (
  lines: string[],
  sep: string,
  colMap: ColMap,
  hasHeader: boolean,
): ParsedRow[] => {
  const { codeIdx, nameIdx, debitIdx, creditIdx, balanceIdx } = colMap;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines
    .map((line) => {
      const cols = line.split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim());
      const code    = cols[codeIdx]?.replace(/\D/g, '') ?? '';
      const name    = nameIdx    >= 0 ? (cols[nameIdx]    ?? '') : (cols[1] ?? '');
      const debit   = debitIdx   >= 0 ? parseNum(cols[debitIdx])   : 0;
      const credit  = creditIdx  >= 0 ? parseNum(cols[creditIdx])  : 0;
      const balance = balanceIdx >= 0 ? parseNum(cols[balanceIdx]) : debit - credit;
      return { code, name, debit, credit, balance };
    })
    .filter(
      (r) =>
        r.code &&
        /^\d{3,5}$/.test(r.code) &&
        (r.debit !== 0 || r.credit !== 0 || r.balance !== 0),
    );
};

/**
 * Convenience: parse full CSV text with auto-detection.
 * Kept for backward compatibility.
 */
export const parseCsv = (text: string): ParsedRow[] => {
  const { sep, lines, headers, hasHeader } = detectSeparatorAndHeader(text);
  return parseWithColMap(lines, sep, detectColumns(headers), hasHeader);
};
