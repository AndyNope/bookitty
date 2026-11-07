export const COMPANY_FUNCTIONS = [
  { id: 'buchhaltung', label: 'Buchhaltung und Auswertungen' },
  { id: 'verkauf', label: 'Rechnungen, Offerten und Kontakte' },
  { id: 'belege', label: 'Belege und Archiv' },
  { id: 'personal', label: 'Spesen' },
  { id: 'inventar', label: 'Lager und Anlagen' },
  { id: 'einstellungen', label: 'Firmeneinstellungen' },
  { id: 'kitty', label: 'Kitty' },
] as const;

export type CompanyPermission = typeof COMPANY_FUNCTIONS[number]['id'];

const PAGE_PERMISSIONS: Record<string, CompanyPermission> = {
  buchungen: 'buchhaltung', import: 'buchhaltung', bilanz: 'buchhaltung', mwst: 'buchhaltung',
  bankabgleich: 'buchhaltung', jahresabschluss: 'buchhaltung', 'swiss-gaap-fer': 'buchhaltung', subventionen: 'buchhaltung',
  rechnungen: 'verkauf', offerten: 'verkauf', kontakte: 'verkauf',
  dokumente: 'belege', archiv: 'belege',
  lohn: 'personal', spesen: 'personal', zeiterfassung: 'personal',
  anlagen: 'inventar', lager: 'inventar',
};

export function canAccessPage(page: string, permissions?: CompanyPermission[] | null): boolean {
  if (!permissions || page === '' || page === 'dashboard' || page === 'einstellungen') return true;
  const permission = PAGE_PERMISSIONS[page];
  return !!permission && permissions.includes(permission);
}