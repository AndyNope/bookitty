import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { File } from 'node:buffer';
import test from 'node:test';
import { documentFingerprint, documentIdentityKeys, encodeDocumentIdentity, parseDocumentIdentity } from '../src/utils/documentIdentity';
import { findTemplate, getTemplates, learnedFields, mergeServerTemplates, upsertTemplate } from '../src/utils/templateStore';
import { parseSwissQr } from '../src/utils/swissQr';

const values = new Map<string, string>();
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
}, configurable: true });
Object.defineProperty(globalThis, 'window', { value: { location: { pathname: '/demo' }, dispatchEvent: () => true }, configurable: true });

test('identical file contents keep the same identity after a filename change', async () => {
  const first = await documentFingerprint(new File(['invoice'], 'first.pdf') as globalThis.File);
  const second = await documentFingerprint(new File(['invoice'], 'renamed.pdf') as globalThis.File);
  const other = await documentFingerprint(new File(['another invoice'], 'first.pdf') as globalThis.File);
  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.deepEqual(parseDocumentIdentity(encodeDocumentIdentity({ fingerprint: first, vendor: 'lieferant ag' })), { fingerprint: first, vendor: 'lieferant ag' });
});

test('exact file rules win, supplier rules apply to other invoices, and filenames are not used as identities', () => {
  values.clear();
  const fingerprint = 'a'.repeat(64);
  upsertTemplate(`vendor:lieferant ag`, { contraAccount: '2000 Kreditoren' });
  upsertTemplate(`sha256:${fingerprint}`, { contraAccount: '1020 Bank' });
  assert.equal(findTemplate('changed.pdf', '', { fingerprint, vendor: 'lieferant ag' })?.draft.contraAccount, '1020 Bank');
  assert.equal(findTemplate('different.pdf', '', { fingerprint: 'b'.repeat(64), vendor: 'lieferant ag' })?.draft.contraAccount, '2000 Kreditoren');
  assert.equal(findTemplate('lieferant ag.pdf', '', { fingerprint: 'b'.repeat(64) }), undefined);
  assert.deepEqual(documentIdentityKeys({ fingerprint, vendor: 'lieferant ag' }), [`sha256:${fingerprint}`, 'vendor:lieferant ag']);
});

test('individual invoice data is not learned and server rules replace stale cached rules', () => {
  values.clear();
  assert.deepEqual(learnedFields({ account: '4400 Aufwand', amount: 99, date: '2026-01-01', paymentStatus: 'Bezahlt', currency: 'EUR' }), { account: '4400 Aufwand' });
  upsertTemplate('vendor:alte regel', { account: '4000 Aufwand' });
  mergeServerTemplates({ 'vendor:neue regel': { account: '4400 Aufwand' } });
  assert.deepEqual(getTemplates().map((rule) => rule.pattern), ['vendor:neue regel']);
});

test('Swiss QR fields preserve an empty amount and reject malformed payloads', () => {
  const lines = Array.from({ length: 31 }, () => '');
  lines[0] = 'SPC'; lines[1] = '0200'; lines[2] = '1'; lines[19] = 'CHF'; lines[30] = 'EPD';
  assert.deepEqual(parseSwissQr(lines.join('\n')), { amount: 0, currency: 'CHF' });
  lines[18] = '111.00';
  assert.deepEqual(parseSwissQr(lines.join('\r\n')), { amount: 111, currency: 'CHF' });
  lines[18] = '123,45';
  assert.equal(parseSwissQr(lines.join('\n')), null);
  lines[18] = '111.00'; lines[30] = '';
  assert.equal(parseSwissQr(lines.join('\n')), null);
  assert.equal(parseSwissQr('SPC\n0200\n1'), null);
});