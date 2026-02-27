export type ParsedAttachment = {
  filename: string;
  mimeType: string;
  data: Uint8Array;
};

export type ParsedEmail = {
  subject: string;
  from: string;
  date: string;
  textBody: string;
  attachments: ParsedAttachment[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const base64ToBytes = (b64: string): Uint8Array => {
  const clean = b64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const decodeQP = (text: string): string =>
  text
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

const decodeEncodedWord = (header: string): string =>
  header.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, encoded) => {
    try {
      if (enc.toUpperCase() === 'B') {
        return new TextDecoder(charset).decode(base64ToBytes(encoded));
      }
      return decodeQP(encoded.replace(/_/g, ' '));
    } catch {
      return encoded;
    }
  });

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ─── Header parser ────────────────────────────────────────────────────────────

const parseHeaders = (raw: string): Record<string, string> => {
  const headers: Record<string, string> = {};
  // Unfold headers (continuation lines start with whitespace)
  const lines = raw.replace(/\r?\n([ \t]+)/g, ' ').split(/\r?\n/);
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!headers[key]) headers[key] = value; // first occurrence wins
  }
  return headers;
};

// ─── MIME part processor ──────────────────────────────────────────────────────

const processPart = (
  rawPart: string,
  result: ParsedEmail,
): void => {
  const normalized = rawPart.replace(/\r\n/g, '\n');
  const split = normalized.indexOf('\n\n');
  if (split === -1) return;

  const headers = parseHeaders(normalized.slice(0, split));
  const body = normalized.slice(split + 2);
  const ct = headers['content-type'] ?? 'text/plain';
  const enc = (headers['content-transfer-encoding'] ?? '').toLowerCase();

  // Recurse into nested multipart
  if (ct.startsWith('multipart/')) {
    const bm = ct.match(/boundary=["']?([^"';\s]+)["']?/i);
    if (bm) parseParts(body, bm[1], result);
    return;
  }

  // Text body (plain only, skip HTML)
  if (ct.startsWith('text/plain') && !result.textBody) {
    let decoded = body;
    if (enc === 'base64') {
      try { decoded = new TextDecoder().decode(base64ToBytes(body)); } catch { /* */ }
    } else if (enc === 'quoted-printable') {
      decoded = decodeQP(body);
    }
    result.textBody = decoded.trim();
    return;
  }

  // PDF attachments
  const isPdf =
    ct.includes('pdf') ||
    (ct.includes('application/octet-stream') &&
      (headers['content-disposition'] ?? '').toLowerCase().includes('.pdf'));
  if (isPdf && enc === 'base64') {
    const disp = headers['content-disposition'] ?? ct;
    const nm = disp.match(/filename=["']?([^"';\s]+)["']?/i);
    const filename = decodeEncodedWord(nm?.[1] ?? 'rechnung.pdf');
    try {
      result.attachments.push({ filename, mimeType: 'application/pdf', data: base64ToBytes(body) });
    } catch { /* skip corrupt */ }
  }
};

const parseParts = (body: string, boundary: string, result: ParsedEmail): void => {
  const rx = new RegExp(`--${escapeRx(boundary)}(?:--)?`, 'g');
  const pieces = body.split(rx);
  for (const piece of pieces) {
    if (!piece.trim() || piece.trim() === '--') continue;
    processPart(piece, result);
  }
};

// ─── Main export ──────────────────────────────────────────────────────────────

export const parseEml = (raw: string): ParsedEmail => {
  const result: ParsedEmail = { subject: '', from: '', date: '', textBody: '', attachments: [] };
  const normalized = raw.replace(/\r\n/g, '\n');
  const split = normalized.indexOf('\n\n');
  if (split === -1) return result;

  const headers = parseHeaders(normalized.slice(0, split));
  const body = normalized.slice(split + 2);

  result.subject = decodeEncodedWord(headers['subject'] ?? '');
  result.from = decodeEncodedWord(headers['from'] ?? '');
  result.date = headers['date'] ?? '';

  const ct = headers['content-type'] ?? 'text/plain';

  if (ct.startsWith('multipart/')) {
    const bm = ct.match(/boundary=["']?([^"';\s]+)["']?/i);
    if (bm) parseParts(body, bm[1], result);
  } else {
    // Simple single-part email
    const enc = (headers['content-transfer-encoding'] ?? '').toLowerCase();
    let decoded = body;
    if (enc === 'base64') {
      try { decoded = new TextDecoder().decode(base64ToBytes(body)); } catch { /* */ }
    } else if (enc === 'quoted-printable') {
      decoded = decodeQP(body);
    }
    result.textBody = decoded.trim();
  }

  return result;
};
