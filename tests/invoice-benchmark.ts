import { createServer, type Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import type { BookingDraft } from '../src/types';

type Expected = Partial<Pick<BookingDraft, 'date' | 'amount' | 'currency' | 'vatRate' | 'vatAmount' | 'paymentStatus'>>;
type Fixture = { id: string; text: string; expected: Expected };

const syntheticFixtures: Fixture[] = [
  { id: 'ch-standard', text: 'Rechnungsdatum 15.01.2026\nRechnungsbetrag CHF 108.10\n8.1% MWST CHF 8.10', expected: { date: '2026-01-15', amount: 108.1, currency: 'CHF', vatRate: 8.1, vatAmount: 8.1, paymentStatus: 'Offen' } },
  { id: 'unpaid', text: 'Rechnung 101\nUnbezahlt\nTotal CHF 99.00', expected: { amount: 99, currency: 'CHF', paymentStatus: 'Offen' } },
  { id: 'not-paid', text: 'Noch nicht bezahlt\nGesamtbetrag CHF 120.00', expected: { amount: 120, paymentStatus: 'Offen' } },
  { id: 'paid', text: 'Zahlung erhalten\nTotal CHF 50.00', expected: { amount: 50, currency: 'CHF', paymentStatus: 'Bezahlt' } },
  { id: 'vat-amount-no-rate', text: 'Netto CHF 100.00\nMWST CHF 8.10\nTotal CHF 108.10', expected: { amount: 108.1, currency: 'CHF', vatRate: 8.1, vatAmount: 8.1 } },
  { id: 'vat-reduced', text: 'Nettobetrag CHF 100.00\nMWST 2.6% CHF 2.60\nTotal CHF 102.60', expected: { amount: 102.6, currency: 'CHF', vatRate: 2.6, vatAmount: 2.6 } },
  { id: 'currency-context', text: 'Preise in EUR möglich\nTotal CHF 100.00', expected: { amount: 100, currency: 'CHF' } },
  { id: 'eur-total', text: 'Rechnungsbetrag EUR 75.50', expected: { amount: 75.5, currency: 'EUR' } },
  { id: 'jpy-code', text: 'Invoice\nTotal JPY 125.00', expected: { amount: 125, currency: 'JPY' } },
  { id: 'cad-code', text: 'Amount due 120.00 CAD', expected: { amount: 120, currency: 'CAD' } },
  { id: 'invoice-date', text: 'Lieferdatum 01.01.2026\nRechnungsdatum 15.01.2026\nTotal CHF 50.00', expected: { date: '2026-01-15', amount: 50 } },
  { id: 'due-date-first', text: 'Fällig bis 31.03.2026\nDatum der Rechnung 14.03.2026\nTotal CHF 70.00', expected: { date: '2026-03-14', amount: 70 } },
  { id: 'discounted-total', text: 'Listenpreis CHF 999.00\nNach Rabatt zahlbar CHF 99.00', expected: { amount: 99, currency: 'CHF' } },
  { id: 'swiss-grouping', text: "Rechnungsdatum 03.02.2026\nTotal CHF 1'234.50", expected: { date: '2026-02-03', amount: 1234.5, currency: 'CHF' } },
  { id: 'french-total', text: 'Date de facture 05.04.2026\nTotal à payer CHF 92.30', expected: { date: '2026-04-05', amount: 92.3, currency: 'CHF' } },
  { id: 'italian-total', text: 'Data fattura 06.04.2026\nTotale da pagare CHF 89.20', expected: { date: '2026-04-06', amount: 89.2, currency: 'CHF' } },
  { id: 'rounding', text: 'Betrag netto CHF 100.00\n8.1% MWST CHF 8.10\nGesamttotal CHF 108.10', expected: { amount: 108.1, vatRate: 8.1, vatAmount: 8.1 } },
];

const dataIndex = process.argv.indexOf('--data');
if (dataIndex >= 0 && !process.argv[dataIndex + 1]) throw new Error('Nach --data wird der Pfad zur JSON-Datei benötigt.');
const isExternal = dataIndex >= 0;
const readData = async (path: string) => {
  if (path !== '-' && path !== '/dev/stdin') return readFile(path, 'utf8');
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};
const data: unknown = isExternal ? JSON.parse(await readData(process.argv[dataIndex + 1])) : syntheticFixtures;
if (!Array.isArray(data) || !data.length) throw new Error('Die Testdaten müssen eine nicht leere JSON-Liste sein.');
const allowedFields = new Set(['date', 'amount', 'currency', 'vatRate', 'vatAmount', 'paymentStatus']);
const fixtures: Fixture[] = data.map((item, index) => {
  if (!item || typeof item !== 'object' || typeof item.text !== 'string' || !item.expected || typeof item.expected !== 'object' || Array.isArray(item.expected)) {
    throw new Error(`Ungültiger Testfall ${index + 1}.`);
  }
  if (!Object.keys(item.expected).length || Object.keys(item.expected).some((field) => !allowedFields.has(field))) {
    throw new Error(`Ungültige Sollfelder in Testfall ${index + 1}.`);
  }
  return { id: isExternal ? `Fall-${index + 1}` : item.id, text: item.text, expected: item.expected };
});

const pdfStub: Plugin = {
  name: 'invoice-benchmark-pdf-stub',
  enforce: 'pre',
  resolveId(id) {
    if (id === 'pdfjs-dist') return '\0benchmark-pdf';
    if (id.startsWith('pdfjs-dist/build/pdf.worker')) return '\0benchmark-worker';
    return undefined;
  },
  load(id) {
    if (id === '\0benchmark-pdf') return 'export const GlobalWorkerOptions = {}; export function getDocument() { throw new Error("PDF not available in text benchmark"); }';
    if (id === '\0benchmark-worker') return 'export default "";';
    return undefined;
  },
};

const server = await createServer({ configFile: false, plugins: [pdfStub], ssr: { noExternal: ['pdfjs-dist'] }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { parseTextToDraft } = await server.ssrLoadModule('/src/utils/documentParser.ts') as {
    parseTextToDraft: (text: string, fallback: string) => BookingDraft;
  };
  const fields: Record<string, { correct: number; total: number }> = {};
  let exact = 0;
  const regressionFailures: string[] = [];
  for (const fixture of fixtures) {
    const result = parseTextToDraft(fixture.text, fixture.id);
    const errors: string[] = [];
    for (const [field, expected] of Object.entries(fixture.expected)) {
      fields[field] ??= { correct: 0, total: 0 };
      fields[field].total++;
      const actual = result[field as keyof BookingDraft];
      const equal = typeof expected === 'number' && typeof actual === 'number'
        ? Math.abs(expected - actual) < 0.005
        : actual === expected;
      if (equal) fields[field].correct++;
      else errors.push(field);
    }
    if (!errors.length) exact++;
    else {
      console.log(`${fixture.id}: ${errors.join(', ')}`);
      if (['unpaid', 'not-paid', 'paid', 'vat-reduced', 'currency-context', 'jpy-code', 'cad-code'].includes(fixture.id)) regressionFailures.push(fixture.id);
    }
  }
  console.log(`\n${isExternal ? 'Textbeispiele' : 'Synthetische Textbeispiele'}: ${exact}/${fixtures.length} vollständig korrekt`);
  for (const [field, score] of Object.entries(fields)) console.log(`${field}: ${score.correct}/${score.total}`);
  console.log('Nur Parser-Test, kein vollständiger PDF-/OCR-Test; Aussagekraft hängt von der Stichprobe ab.');
  if (!isExternal && process.argv.includes('--check') && regressionFailures.length) process.exitCode = 1;
} finally {
  await server.close();
}