export type DocumentIdentity = { fingerprint?: string; vendor?: string };

export const documentFingerprint = async (file: File): Promise<string | undefined> => {
  if (!globalThis.crypto?.subtle) return undefined;
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const encodeDocumentIdentity = (identity: DocumentIdentity): string | undefined => {
  if (!identity.fingerprint && !identity.vendor) return undefined;
  return JSON.stringify(identity);
};

export const parseDocumentIdentity = (value?: string | null): DocumentIdentity => {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      const identity = parsed as Record<string, unknown>;
      return {
        fingerprint: typeof identity.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(identity.fingerprint) ? identity.fingerprint : undefined,
        vendor: typeof identity.vendor === 'string' ? identity.vendor : undefined,
      };
    }
  } catch {
    return { vendor: value };
  }
  return {};
};

export const documentIdentityKeys = (identity: DocumentIdentity): string[] => [
  ...(identity.fingerprint ? [`sha256:${identity.fingerprint}`] : []),
  ...(identity.vendor ? [`vendor:${identity.vendor}`] : []),
];