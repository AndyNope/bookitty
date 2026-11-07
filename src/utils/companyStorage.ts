const LEGACY_OWNER_KEY = 'bookitty.legacyCompanyOwner';

export function companyStorageKey(key: string): string {
  if (!window.location.pathname.startsWith('/app')) return key;
  try {
    const token = sessionStorage.getItem('bookitty.token');
    const part = token?.split('.')[1];
    if (!part) return `${key}.company.guest`;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as { sub?: number | string; company_id?: number | string | null };
    const companyId = Number(payload.company_id ?? payload.sub);
    if (!Number.isSafeInteger(companyId) || companyId <= 0) return `${key}.company.guest`;
    const scope = String(companyId);
    const scopedKey = `${key}.company.${scope}`;
    let legacyOwner = localStorage.getItem(LEGACY_OWNER_KEY);
    if (!legacyOwner) {
      localStorage.setItem(LEGACY_OWNER_KEY, scope);
      legacyOwner = scope;
    }
    const migrationKey = `${scopedKey}.legacyMigrated`;
    if (legacyOwner === scope && localStorage.getItem(migrationKey) !== '1') {
      const legacy = localStorage.getItem(key);
      if (legacy !== null && localStorage.getItem(scopedKey) === null) localStorage.setItem(scopedKey, legacy);
      localStorage.setItem(migrationKey, '1');
    }
    return scopedKey;
  } catch {
    return `${key}.company.guest`;
  }
}