import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadV0 } from './harness-v0.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/v0-links.json', import.meta.url), 'utf8'));
const api = await loadV0();

test('decodeHints returns raw bytes, with no legacy wrapper', async () => {
  const result = await api.decodeHints(fixtures.wishlists[0].encoded);
  assert.ok(result instanceof Uint8Array, 'expected a Uint8Array, got ' + typeof result);
});

test('the #hints- route is gone from the source', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes("hash.startsWith('hints-')"), 'legacy #hints- route still present');
  assert.ok(!html.includes("encoded.startsWith('JTdC')"), 'legacy JTdC branch still present');
});

test('legacy assignment formats no longer decode', () => {
  assert.equal(api.decodeAssignment(fixtures.legacy.pipe4Field), null, 'four-field pipe');
  assert.equal(api.decodeAssignment(fixtures.legacy.jsonFormat), null, 'bare JSON');
  assert.equal(api.decodeAssignment(fixtures.legacy.urlEncodedJson), null, 'url-encoded JSON');
});

test('legacyDecode is gone from the source', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('function legacyDecode'), 'legacyDecode still present');
});

test('legacy password fallbacks are gone, transcription leniency is kept', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes("text.startsWith('VALID:')"), 'VALID: prefix still present');
  assert.ok(!html.includes('.isLegacy'), 'isLegacy branch still present');
  assert.ok(!html.includes("enteredPassword.startsWith('0')"), 'zero-stripping still present');
  assert.equal(html.split('enteredPassword.length === 5').length - 1, 1,
    'the five-character transcription retry must remain, exactly once');
});

test('legacy links are recognised as old rather than merely invalid', () => {
  assert.equal(api.looksLikeOldLink(fixtures.legacy.pipe4Field), true, 'four-field pipe');
  assert.equal(api.looksLikeOldLink(fixtures.legacy.jsonFormat), true, 'bare JSON');
  assert.equal(api.looksLikeOldLink(fixtures.legacy.urlEncodedJson), true, 'url-encoded JSON');
  assert.equal(api.looksLikeOldLink('not-a-link-at-all'), false, 'genuine rubbish');
});
