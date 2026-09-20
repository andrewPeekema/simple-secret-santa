import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes } from '../js/codec.js';

test('utf8 round-trips, including non-ASCII', () => {
  for (const s of ['Andrew', 'José', 'Zoë', "Mary-Anne O'Brien", 'hello']) {
    assert.equal(bytesToUtf8(utf8ToBytes(s)), s);
  }
});

test('base64url output is url-safe and unpadded', () => {
  const bytes = new Uint8Array([251, 255, 190, 0, 1, 2]);
  const encoded = bytesToUrlSafeBase64(bytes);
  assert.ok(!/[+/=]/.test(encoded), 'found +, / or = in ' + encoded);
});

test('base64url round-trips arbitrary bytes at every length mod 3', () => {
  for (let n = 0; n < 12; n++) {
    const bytes = new Uint8Array(Array.from({ length: n }, (_, i) => (i * 37) % 256));
    assert.deepEqual(urlSafeBase64ToBytes(bytesToUrlSafeBase64(bytes)), bytes, 'length ' + n);
  }
});
