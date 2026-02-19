import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { BookingDraft } from '../types';
import { accounts, formatAccount, getCategoryLabel } from '../data/chAccounts';

GlobalWorkerOptions.workerSrc = pdfWorker;

const currencyToNumber = (value: string) => {
  const cleaned = value.replace(/[^0-9,.-]/g, '');
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findCurrency = (text: string) => {
  if (/[€]|\bEUR\b/i.test(text)) return 'EUR';
  if (/\bCHF\b|SFr|Fr\./i.test(text)) return 'CHF';
  if (/\bUSD\b|\$/.test(text)) return 'USD';
  if (/\bGBP\b|£/.test(text)) return 'GBP';
  return 'CHF';
};

const detectPaymentStatus = (text: string) => {
  if (/zahlung geleistet|zahlung erhalten|bezahlt|paid|payment received|quittung/i.test(text)) {
    return 'Bezahlt';
  }
  if (/offener betrag\s*(chf|eur|usd|gbp)?\s*0([.,]00)?/i.test(text)) {
    return 'Bezahlt';
  }
  return 'Offen';
};

const accountKeywordMap: Array<{ keywords: RegExp; accountCode: string }> = [
  { keywords: /(miete|mietzins|raumaufwand|büro|office rent)/i, accountCode: '6000' },
  { keywords: /(leasing|fahrzeugleasing|miete fahrzeug|car lease)/i, accountCode: '6260' },
  { keywords: /(fahrzeug|transport|lieferung|versand|porto)/i, accountCode: '6200' },
  { keywords: /(software|lizenz|cloud|saas|hosting|webhosting|domain|it|informatik)/i, accountCode: '6570' },
  { keywords: /(werbung|marketing|anzeige|kampagne|seo|ads)/i, accountCode: '6600' },
  { keywords: /(versicherung|prämie|police)/i, accountCode: '6300' },
  { keywords: /(energie|strom|gas|entsorgung)/i, accountCode: '6400' },
  { keywords: /(beratung|dienstleistung|consulting|projekt)/i, accountCode: '4400' },
  { keywords: /(handel|waren|material|rohstoff|einkauf)/i, accountCode: '4200' },
  { keywords: /(lohn|gehalt|salär)/i, accountCode: '5000' },
  { keywords: /(bank|zins|gebühr|kreditkarte|kartenkommission)/i, accountCode: '6900' },
];

const pickAccountFromText = (text: string) => {
  const match = accountKeywordMap.find((rule) => rule.keywords.test(text));
  if (!match) return undefined;
  return accounts.find((account) => account.code === match.accountCode);
};

const getDefaultVatRate = (currency: string) => {
  if (currency === 'CHF') return 7.7;
  if (currency === 'EUR') return 19;
  return 0;
};

const findDate = (text: string) => {
  const matches = text.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (!matches) return undefined;
  const [, day, month, year] = matches;
  return `${year}-${month}-${day}`;
};

const amountPatterns = [
  /Rechnungsbetrag\s*:?\s*(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
  /Gesamtbetrag\s+(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
  /Gesamt\s*:?\s*(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
  /Brutto\s*:?\s*(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
  /Endbetrag\s*:?\s*(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
  /Total\s+(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
  /Rechnungstotal\s*(?:inkl\.?\s*MWST)?\s*(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
];

const extractAmountFromLine = (line: string) => {
  for (const pattern of amountPatterns) {
    const match = line.match(pattern);
    if (match?.[3]) return currencyToNumber(match[3]);
    if (match?.[1]) return currencyToNumber(match[1]);
  }
  return undefined;
};

const findAmount = (text: string) => {
  const lines = text.split(/\n|\r/).map((line) => line.trim());

  for (const line of lines) {
    const value = extractAmountFromLine(line);
    if (value !== undefined) return value;
  }

  // Multi-line: "Gesamtbetrag CHF" on one line, "523.50" on the next
  for (let i = 0; i < lines.length - 1; i++) {
    if (/gesamtbetrag|rechnungstotal/i.test(lines[i])) {
      const nextAmount = lines[i + 1]?.match(/^([0-9]+[.,][0-9]{2})$/);
      if (nextAmount) return currencyToNumber(nextAmount[1]);
    }
  }

  // "CHF 523.50" standalone (e.g. from the QR Zahlteil section OCR)
  const currencyPriceValues = Array.from(
    text.matchAll(/\b(?:CHF|EUR|USD|GBP)\s+([1-9][0-9]*[.,][0-9]{2})\b/g),
  )
    .map((m) => currencyToNumber(m[1]))
    .filter((v) => v >= 1);
  if (currencyPriceValues.length) return Math.max(...currencyPriceValues);

  const allValues = Array.from(
    text.matchAll(/([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))\s*€?/g),
  )
    .map((match) => currencyToNumber(match[1]))
    .filter((value) => value >= 1);

  if (!allValues.length) return undefined;
  return Math.max(...allValues);
};

const findVat = (text: string) => {
  // Keyword before rate: "MwSt 8.1%" or "USt. 19%"
  const m1 = text.match(/(MwSt|USt)\.?\s*([0-9]{1,2}(?:[.,][0-9]{1,2})?)\s*%/i);
  if (m1?.[2]) return Number(m1[2].replace(',', '.'));
  // Rate before keyword: "8.1% MWST" or "19% USt."
  const m2 = text.match(/([0-9]{1,2}(?:[.,][0-9]{1,2})?)\s*%\s*(?:MwSt|USt|MWST)/i);
  if (m2?.[1]) return Number(m2[1].replace(',', '.'));
  return undefined;
};

const findVatAmount = (text: string) => {
  // Specific Swiss format: "davon 8.1% MWST CHF 13.40" (search full text first)
  const davon = text.match(
    /davon\s+[0-9.,]+\s*%\s*(?:MwSt|USt|MWST)\s*(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})/i,
  );
  if (davon?.[1]) return currencyToNumber(davon[1]);

  const lines = text.split(/\n|\r/).map((line) => line.trim());
  const patterns = [
    /(MwSt|USt)\.?\s*Betrag\s*:?\s*([0-9.,]+)\s*€?/i,
    /(MwSt|USt)\s*:?\s*([0-9.,]+)\s*€?/i,
    /Umsatzsteuer\s*:?\s*([0-9.,]+)\s*€?/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[2]) return currencyToNumber(match[2]);
    }
    if (/%/.test(line) && /(MwSt|USt|MWST)/i.test(line)) {
      // Look for amount directly following currency symbol after MWST keyword
      const near = line.match(
        /(?:MwSt|USt|MWST)\s*(?:CHF|EUR|USD|GBP)?\s*([0-9]+[.,][0-9]{2})\b/i,
      );
      if (near?.[1]) return currencyToNumber(near[1]);
      // Fallback: all decimal amounts on this line; avoid the total by taking the smallest >= 1
      const values = Array.from(
        line.matchAll(/([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))/g),
      )
        .map((m) => currencyToNumber(m[1]))
        .filter((v) => v >= 1);
      if (values.length) return Math.min(...values);
    }
  }

  return undefined;
};

const findDescription = (text: string) => {
  // "Rechnungs-Nr. 818623" or "Rechnungsnummer 818623"
  const m1 = text.match(
    /Rechnungs?[-\s]?(?:Nr\.?|No\.?|nummer)[:\s]+([A-Za-z0-9-]+)/i,
  );
  if (m1?.[1]) return `Rechnung ${m1[1]}`;
  // "Rechnung Nr. 5" or "Invoice 42" (but avoid matching short words)
  const m2 = text.match(/(Rechnung|Invoice)\s*(?:Nr\.?|No\.?)?\s*([A-Za-z0-9-]{2,})/i);
  if (m2?.[2] && !/inkl|total|netto|brutto/i.test(m2[2])) return `Rechnung ${m2[2]}`;
  return undefined;
};

/**
 * Extract the vendor/sender company name from invoice text.
 * Looks for legal-form suffixes (GmbH, AG, SA, KG, Inc, Ltd, …) and returns
 * a normalised lowercase slug suitable as a template pattern key.
 */
export const findVendorName = (text: string): string | undefined => {
  // Match lines that contain a legal-form indicator
  const match = text.match(
    /^(.{2,60}?\b(?:GmbH|AG|SA|Sàrl|KG|OHG|GbR|Inc\.?|Ltd\.?|Corp\.?|S\.A\.|S\.r\.l\.))\b/im,
  );
  if (!match?.[1]) return undefined;
  // Normalise: lowercase, keep alphanumeric + space, trim
  return match[1]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüéàè ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
};

export const parseTextToDraft = (text: string, fallbackName: string): BookingDraft => {
  const today = new Date().toISOString().split('T')[0];
  const date = findDate(text) ?? today;
  const amount = findAmount(text) ?? 0;
  const vatAmount = findVatAmount(text);
  const detectedVatRate = findVat(text);
  const hasVatKeyword = /(MwSt|USt|Umsatzsteuer)/i.test(text);
  const currency = findCurrency(text);
  const vatRate =
    detectedVatRate ?? (hasVatKeyword ? getDefaultVatRate(currency) : 0);
  const hasNetto = /netto/i.test(text);
  const inferredVatAmount =
    vatAmount === undefined && vatRate > 0 && amount > 0
      ? Number(
          (
            hasNetto
              ? (amount * vatRate) / 100
              : (amount * vatRate) / (100 + vatRate)
          ).toFixed(2),
        )
      : vatAmount;
  const description = findDescription(text) ?? `Rechnung ${fallbackName}`;
  const paymentStatus = detectPaymentStatus(text);
  const matchedAccount = pickAccountFromText(text);
  const account = matchedAccount
    ? formatAccount(matchedAccount)
    : formatAccount({
        code: '4400',
        name: 'Aufwand für bezogene Dienstleistungen',
        categoryCode: '4',
      });
  const category = matchedAccount
    ? getCategoryLabel(matchedAccount.categoryCode)
    : getCategoryLabel('4');

  return {
    date,
    description,
    account,
    category,
    amount,
    vatAmount: inferredVatAmount,
    vatRate,
    currency,
    paymentStatus,
    type: 'Ausgabe',
  };
};

export const extractPdfText = async (file: File) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const strings = (content.items as Array<{ str?: string }>).map(
      (item) => item.str ?? '',
    );
    pageTexts.push(strings.join(' '));
  }

  return pageTexts.join('\n');
};

type TextBlock = {
  str: string;
  x: number;
  y: number;
};

export const extractPdfTextBlocks = async (file: File) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const blocks: TextBlock[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str?: string; transform?: number[] }>;
    items.forEach((item) => {
      if (!item.str || !item.transform) return;
      const [, , , , x, y] = item.transform;
      blocks.push({ str: item.str, x, y });
    });
  }

  return blocks;
};

const groupLines = (blocks: TextBlock[]) => {
  const buckets = new Map<number, TextBlock[]>();
  blocks.forEach((block) => {
    const key = Math.round(block.y / 2) * 2;
    const line = buckets.get(key) ?? [];
    line.push(block);
    buckets.set(key, line);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, lineBlocks]) =>
      lineBlocks.sort((a, b) => a.x - b.x).map((item) => item.str).join(' '),
    );
};

const extractLastAmount = (line: string) => {
  const values = Array.from(
    line.matchAll(/([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))/g),
  ).map((match) => currencyToNumber(match[1]));
  return values.length ? values[values.length - 1] : undefined;
};

export const parseBlocksToDraft = (
  blocks: TextBlock[],
  fallbackName: string,
): BookingDraft => {
  const lines = groupLines(blocks);
  const text = lines.join('\n');

  let netAmount: number | undefined;
  let grossAmount: number | undefined;
  let vatAmount: number | undefined;
  let vatRate: number | undefined;

  lines.forEach((line) => {
    const lowered = line.toLowerCase();
    if (/netto/.test(lowered)) {
      netAmount = extractLastAmount(line) ?? netAmount;
    }
    if (/end(summe)?|brutto|gesamtbetrag|rechnungsbetrag|rechnungstotal/.test(lowered)) {
      const candidate = extractLastAmount(line);
      if (candidate !== undefined) {
        grossAmount =
          grossAmount !== undefined ? Math.max(grossAmount, candidate) : candidate;
      }
    }
    if (/(mwst|ust|umsatzsteuer)/.test(lowered)) {
      vatAmount = extractLastAmount(line) ?? vatAmount;
      const rateMatch = line.match(/([0-9]{1,2}(?:[.,][0-9]{1,2})?)\s*%/);
      if (rateMatch?.[1]) vatRate = Number(rateMatch[1].replace(',', '.'));
    }
  });

  const parsed = parseTextToDraft(text, fallbackName);
  const amount = netAmount ?? grossAmount ?? parsed.amount ?? 0;
  const rate = vatRate ?? parsed.vatRate;
  const hasNetto = netAmount !== undefined || /netto/i.test(text);
  const inferredVatAmount =
    vatAmount ??
    (rate > 0 && amount > 0
      ? Number(
          (
            hasNetto
              ? (amount * rate) / 100
              : (amount * rate) / (100 + rate)
          ).toFixed(2),
        )
      : undefined);

  return {
    ...parsed,
    amount,
    vatRate: rate,
    vatAmount: inferredVatAmount,
  };
};
