import type { BookingDraft } from '../types';

export type KittySuggestion = {
  message: string;
  suggestedAccount?: string;
  suggestedContraAccount?: string;
  confidence: 'high' | 'medium';
};

// ── Rule definition ────────────────────────────────────────────────────────
type Rule = {
  /** Keywords that must appear in the description (case-insensitive, partial match) */
  keywords: string[];
  /** Booking type filter (omit = both) */
  type?: 'Einnahme' | 'Ausgabe';
  /**
   * Check: return true when the current draft looks wrong for this rule.
   * If this returns true the suggestion is shown.
   */
  isWrong: (d: BookingDraft) => boolean;
  suggestedAccount?: string;
  suggestedContraAccount?: string;
  message: string;
  confidence: 'high' | 'medium';
};

/** True when the account/contra code does NOT start with any of the given prefixes */
const notIn = (field: string, ...prefixes: string[]) =>
  !prefixes.some((p) => field.trimStart().startsWith(p));

/** Extract numeric part of an account string like "6000 Mietaufwand" → "6000" */
const code = (s: string) => s.split(' ')[0] ?? '';

const RULES: Rule[] = [
  // ── Miete / Raumkosten ──────────────────────────────────────────────────
  {
    keywords: ['miete', 'mietkosten', 'mietaufwand', 'büromiete', 'lagermiete'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '60'),
    suggestedAccount: '6000 Mietaufwand',
    message: 'Für Mietkosten ist Konto **6000 Mietaufwand** (Klasse 6) üblicher als ein Aktivkonto.',
    confidence: 'high',
  },
  // ── Büromaterial ────────────────────────────────────────────────────────
  {
    keywords: ['büromaterial', 'bürobedarf', 'papier', 'drucker', 'toner', 'kugelschreiber'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '66'),
    suggestedAccount: '6600 Büromaterial und Drucksachen',
    message: 'Büromaterial wird üblicherweise auf **6600 Büromaterial und Drucksachen** gebucht.',
    confidence: 'high',
  },
  // ── Telefon / Kommunikation ────────────────────────────────────────────
  {
    keywords: ['telefon', 'handy', 'mobiltelefon', 'internet', 'hosting', 'telefonkosten'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '652', '653'),
    suggestedAccount: '6520 Telefon und Internet',
    message: 'Telefon-/Internetkosten gehören auf **6520 Telefon und Internet**.',
    confidence: 'high',
  },
  // ── Fahrzeug / Benzin ────────────────────────────────────────────────────
  {
    keywords: ['benzin', 'treibstoff', 'tankstelle', 'diesel', 'fahrzeug', 'auto', 'parkplatz', 'autobahnvignette'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '630', '631', '632'),
    suggestedAccount: '6300 Fahrzeugaufwand',
    message: 'Fahrzeug-/Treibstoffkosten werden typisch auf **6300 Fahrzeugaufwand** gebucht.',
    confidence: 'high',
  },
  // ── Reisekosten ─────────────────────────────────────────────────────────
  {
    keywords: ['reise', 'reisekosten', 'hotel', 'flug', 'bahn', 'spesen', 'übernachtung', 'zug'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '670', '671', '672'),
    suggestedAccount: '6700 Reise- und Repräsentationsaufwand',
    message: 'Reisekosten und Spesen gehören auf **6700 Reise- und Repräsentationsaufwand**.',
    confidence: 'high',
  },
  // ── Werbung / Marketing ─────────────────────────────────────────────────
  {
    keywords: ['werbung', 'marketing', 'inserat', 'anzeige', 'kampagne', 'werbematerial', 'flyer'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '680', '681', '682'),
    suggestedAccount: '6800 Werbeaufwand',
    message: 'Werbeausgaben bucht man auf **6800 Werbeaufwand**.',
    confidence: 'high',
  },
  // ── Beratung / Honorar ──────────────────────────────────────────────────
  {
    keywords: ['beratung', 'honorar', 'consulting', 'rechtsberatung', 'steuerberatung', 'anwaltskosten', 'treuhänder', 'treuhand'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '683', '684', '689'),
    suggestedAccount: '6830 Beratungs- und Prüfungsaufwand',
    message: 'Beratungshonorare und Treuhänderkosten werden auf **6830 Beratungs- und Prüfungsaufwand** gebucht.',
    confidence: 'high',
  },
  // ── IT / Software ───────────────────────────────────────────────────────
  {
    keywords: ['software', 'lizenz', 'it', 'cloud', 'saas', 'abonnement', 'subscription', 'adobe', 'microsoft', 'google workspace'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '666', '667'),
    suggestedAccount: '6660 IT-Aufwand (Hard-/Software)',
    message: 'IT- und Softwarekosten gehören auf **6660 IT-Aufwand (Hard-/Software)**.',
    confidence: 'high',
  },
  // ── Versicherung ────────────────────────────────────────────────────────
  {
    keywords: ['versicherung', 'prämie', 'haftpflicht', 'betriebsversicherung'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '690', '691'),
    suggestedAccount: '6900 Versicherungsaufwand',
    message: 'Versicherungsprämien werden auf **6900 Versicherungsaufwand** gebucht.',
    confidence: 'high',
  },
  // ── Strom / Energie ─────────────────────────────────────────────────────
  {
    keywords: ['strom', 'energie', 'elektrizität', 'heizung', 'wasser', 'nebenkosten'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '605', '606'),
    suggestedAccount: '6050 Energie und Wasser',
    message: 'Strom- und Energiekosten bucht man auf **6050 Energie und Wasser**.',
    confidence: 'high',
  },
  // ── Lohn / Gehalt ────────────────────────────────────────────────────────
  {
    keywords: ['lohn', 'gehalt', 'salär', 'löhne', 'personalkosten'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '500', '501', '502'),
    suggestedAccount: '5000 Lohnaufwand',
    message: 'Lohnzahlungen werden auf **5000 Lohnaufwand** (Klasse 5 Personalaufwand) gebucht.',
    confidence: 'high',
  },
  // ── Weiterbildung ────────────────────────────────────────────────────────
  {
    keywords: ['weiterbildung', 'kurs', 'schulung', 'seminar', 'training'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '672', '673'),
    suggestedAccount: '6720 Weiterbildungsaufwand',
    message: 'Schulungen und Kurse gehören auf **6720 Weiterbildungsaufwand**.',
    confidence: 'high',
  },
  // ── Bankgebühren ────────────────────────────────────────────────────────
  {
    keywords: ['bankgebühr', 'kontogebühr', 'bankspesen', 'postgebühr', 'bankzins'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '694', '695'),
    suggestedAccount: '6940 Bankspesen und Zinsen',
    message: 'Bankgebühren und -spesen werden auf **6940 Bankspesen und Zinsen** gebucht.',
    confidence: 'high',
  },
  // ── Warenaufwand / Einkauf ───────────────────────────────────────────────
  {
    keywords: ['warenaufwand', 'wareneinkauf', 'einkauf', 'material', 'rohstoff', 'handelswaren'],
    type: 'Ausgabe',
    isWrong: (d) => notIn(code(d.account), '400', '401', '402', '403'),
    suggestedAccount: '4000 Warenaufwand',
    message: 'Warenaufwand und Einkäufe werden auf **4000 Warenaufwand** (Klasse 4) gebucht.',
    confidence: 'high',
  },

  // ── EINNAHMEN ────────────────────────────────────────────────────────────
  {
    keywords: ['umsatz', 'erlös', 'faktura', 'rechnung', 'dienstleistung', 'leistung', 'verkauf'],
    type: 'Einnahme',
    isWrong: (d) => notIn(code(d.contraAccount), '30', '31', '32'),
    suggestedContraAccount: '3000 Umsatzerlöse',
    message: 'Umsatzerlöse aus Lieferungen und Leistungen gehören auf **3000 Umsatzerlöse** (Klasse 3).',
    confidence: 'high',
  },
  {
    keywords: ['zins', 'zinsen', 'kapitalzins', 'bankkonto'],
    type: 'Einnahme',
    isWrong: (d) => notIn(code(d.contraAccount), '390', '391', '900'),
    suggestedContraAccount: '3900 Zinsertrag',
    message: 'Zinserträge werden auf **3900 Zinsertrag** oder **9000 Finanzertrag** verbucht.',
    confidence: 'medium',
  },

  // ── GEFAHREN-CHECK: Aktivkonto bei Ausgabe ───────────────────────────────
  {
    keywords: [], // applies to all descriptions
    type: 'Ausgabe',
    isWrong: (d) =>
      d.description.trim().length > 3 &&
      notIn(code(d.account), '4', '5', '6', '7', '8') &&
      !notIn(code(d.account), '1', '2'),  // Account ist 1xxx/2xxx
    message: 'Das Soll-Konto liegt in Klasse 1 oder 2 (Bilanzkonten). Für Aufwand-Buchungen werden üblicherweise **Klasse 4–6** verwendet.',
    confidence: 'medium',
  },

  // ── GEFAHREN-CHECK: Aufwandskonto bei Einnahme ───────────────────────────
  {
    keywords: [],
    type: 'Einnahme',
    isWrong: (d) =>
      d.description.trim().length > 3 &&
      notIn(code(d.contraAccount), '3', '9') &&
      !notIn(code(d.contraAccount), '4', '5', '6'),  // Gegenkonto ist 4-6xxx
    message: 'Das Haben-Konto liegt in Klasse 4–6 (Aufwandskonten). Bei Einnahmen wird **Klasse 3** (Ertragskonten) erwartet.',
    confidence: 'medium',
  },
];

// ── Match helper ───────────────────────────────────────────────────────────
const matchesKeywords = (description: string, keywords: string[]) => {
  if (keywords.length === 0) return true; // wildcard rule
  const lower = description.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
};

// ── Main export ────────────────────────────────────────────────────────────
/**
 * Analyse a BookingDraft and return a Kitty suggestion if something looks off.
 * Returns null if everything seems correct or the description is too short.
 */
export const suggestForDraft = (draft: BookingDraft): KittySuggestion | null => {
  if (draft.description.trim().length < 4) return null;

  // Find first matching rule (high confidence first)
  const sorted = [...RULES].sort((a, b) =>
    a.confidence === b.confidence ? 0 : a.confidence === 'high' ? -1 : 1,
  );

  for (const rule of sorted) {
    if (rule.type && rule.type !== draft.type) continue;
    if (!matchesKeywords(draft.description, rule.keywords)) continue;
    if (!rule.isWrong(draft)) continue;

    return {
      message: rule.message,
      suggestedAccount: rule.suggestedAccount,
      suggestedContraAccount: rule.suggestedContraAccount,
      confidence: rule.confidence,
    };
  }

  return null;
};
