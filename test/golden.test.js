import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as api from '../js/main.js';

const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/v0-links.json', import.meta.url), 'utf8'));

test('every assignment fixture round-trips', () => {
  for (const f of fixtures.assignments) {
    const decoded = api.decodeAssignment(f.encoded);
    assert.deepEqual(decoded, { giver: f.giver, receiver: f.receiver, salt: f.salt },
      'failed for giver ' + f.giver);
    assert.equal(api.encodeAssignment({ giver: f.giver, receiver: f.receiver, salt: f.salt }), f.encoded,
      'encoder drifted for giver ' + f.giver);
  }
});

test('every wishlist fixture decrypts with its password', async () => {
  for (const f of fixtures.wishlists) {
    const payload = await api.decodeHints(f.encoded);
    const plain = await api.decompressBytes(api.xorEncrypt(payload, f.password));
    assert.equal(Buffer.from(plain.slice(2)).toString('utf8'), f.plaintext,
      'failed for ' + f.label);
  }
});

// The guess below must not drive the format byte to 0x01: with password 's921er'
// and guess 'zzzzzz' byte 0 becomes 0x09, so decompressBytes returns the raw data
// and this test is deterministic. Changing either string can break that.
test('a wrong password does not yield the plaintext', async () => {
  const f = fixtures.wishlists[0];
  const payload = await api.decodeHints(f.encoded);
  const plain = await api.decompressBytes(api.xorEncrypt(payload, 'zzzzzz'));
  const text = plain ? Buffer.from(plain.slice(2)).toString('utf8') : '';
  assert.notEqual(text, f.plaintext);
});
