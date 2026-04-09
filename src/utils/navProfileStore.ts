export type NavProfile = 'starter' | 'rechnungssteller' | 'haendler' | 'arbeitgeber' | 'voll';

export interface ProfileDef {
  label: string;
  description: string;
  /** kittyId list — empty array means ALL pages visible (Volle Übersicht) */
  pages: string[];
}

export const NAV_PROFILES: Record<NavProfile, ProfileDef> = {
  starter: {
    label: 'Starter',
    description: 'Freelancer & Einzelunternehmer',
    pages: ['dashboard', 'buchungen', 'dokumente'],
  },
  rechnungssteller: {
    label: 'Rechnungssteller',
    description: 'Selbständige mit Rechnungsstellung',
    pages: ['dashboard', 'buchungen', 'rechnungen', 'offerten', 'kontakte', 'mwst', 'dokumente'],
  },
  haendler: {
    label: 'Händler',
    description: 'KMU mit Warenhandel',
    pages: ['dashboard', 'buchungen', 'rechnungen', 'offerten', 'kontakte', 'bankabgleich', 'lager', 'import', 'bilanz', 'mwst', 'dokumente', 'jahresabschluss', 'anlagen'],
  },
  arbeitgeber: {
    label: 'Arbeitgeber',
    description: 'Unternehmen mit Angestellten',
    pages: ['dashboard', 'buchungen', 'rechnungen', 'offerten', 'kontakte', 'lohn', 'spesen', 'zeiterfassung', 'bilanz', 'mwst', 'dokumente'],
  },
  voll: {
    label: 'Volle Übersicht',
    description: 'Buchhalter & Admins – alle Seiten sichtbar',
    pages: [], // empty = all visible
  },
};

/** Ordered list of all navigable pages (excluding einstellungen) */
export const ALL_PAGES = [
  'dashboard', 'buchungen', 'rechnungen', 'offerten', 'bankabgleich',
  'kontakte', 'bilanz', 'mwst', 'dokumente', 'lohn', 'jahresabschluss',
  'lager', 'anlagen', 'archiv', 'spesen', 'swiss-gaap-fer',
  'subventionen', 'zeiterfassung', 'import',
] as const;

export const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  buchungen: 'Buchungen',
  rechnungen: 'Rechnungen',
  offerten: 'Offerten',
  bankabgleich: 'Bankabgleich',
  kontakte: 'Kontakte',
  bilanz: 'Bilanz / Erfolgsrechnung',
  mwst: 'MwSt-Abrechnung',
  dokumente: 'Dokumente',
  lohn: 'Lohn',
  jahresabschluss: 'Jahresabschluss',
  lager: 'Lager',
  anlagen: 'Anlagen',
  archiv: 'Archiv',
  spesen: 'Spesen',
  'swiss-gaap-fer': 'Swiss GAAP FER',
  subventionen: 'Subventionen',
  zeiterfassung: 'Zeiterfassung',
  import: 'Import',
};

const PROFILE_KEY = 'bookitty.navProfile';
const HIDDEN_KEY  = 'bookitty.hiddenPages';

export function getNavProfile(): NavProfile {
  const stored = localStorage.getItem(PROFILE_KEY) as NavProfile | null;
  return stored && stored in NAV_PROFILES ? stored : 'voll';
}

export function saveNavProfile(profile: NavProfile): void {
  localStorage.setItem(PROFILE_KEY, profile);
  localStorage.removeItem(HIDDEN_KEY);
  window.dispatchEvent(new Event('bookitty:navprofile'));
}

export function getHiddenPages(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveHiddenPages(pages: string[]): void {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(pages));
  window.dispatchEvent(new Event('bookitty:navprofile'));
}

/** Returns true if a nav item should be shown */
export function isPageVisible(kittyId: string, profile: NavProfile, hiddenPages: string[]): boolean {
  if (hiddenPages.includes(kittyId)) return false;
  const profilePages = NAV_PROFILES[profile].pages;
  if (profilePages.length === 0) return true; // voll = all visible
  return profilePages.includes(kittyId);
}
