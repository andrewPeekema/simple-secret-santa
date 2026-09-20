import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simpleHash, crc16, xorEncrypt, xorDecrypt, makeSalt } from '../js/secret.js';

const enc = (s) => new TextEncoder().encode(s);

test('simpleHash reproduces the known fixture password', () => {
  const pw = simpleHash('pair-Kathryn-k7f3m2p9q1x4c').padStart(6, '0').substring(0, 6);
  assert.equal(pw, 's921er');
});

test('crc16 is stable and detects a single-character change', () => {
  const a = crc16(enc('wool socks'));
  assert.equal(a, crc16(enc('wool socks')), 'must be deterministic');
  assert.notEqual(a, crc16(enc('wool socky')));
  assert.ok(a >= 0 && a <= 0xFFFF, 'must fit in 16 bits');
  assert.equal(crc16(enc('123456789')), 0x29B1,
    'must remain CRC-16/CCITT-FALSE: 0x29B1 is that algorithm\'s published check value');
});

test('xor is symmetric and leaves length unchanged', () => {
  const plain = enc('gift ideas');
  const cipher = xorEncrypt(plain, 'abc123');
  assert.equal(cipher.length, plain.length);
  assert.notDeepEqual(cipher, plain);
  assert.deepEqual(xorDecrypt(cipher, 'abc123'), plain);
  const other = xorEncrypt(plain, 'zzzzzz');
  assert.notDeepEqual(other, cipher, 'a different key must produce different ciphertext');
  assert.notDeepEqual(xorDecrypt(cipher, 'zzzzzz'), plain, 'the wrong key must not recover the plaintext');
});

test('makeSalt returns exactly four characters from [0-9a-z]', () => {
  for (let i = 0; i < 2000; i++) {
    const s = makeSalt();
    assert.equal(s.length, 4, 'wrong length: ' + JSON.stringify(s));
    assert.match(s, /^[0-9a-z]{4}$/, 'out-of-alphabet salt: ' + JSON.stringify(s));
  }
});

test('makeSalt is actually random, not a constant', () => {
  // Without this, `return 'aaaa'` passes the length-and-alphabet test above.
  // The bar is high on purpose: drawing 200 times from 36^4 = 1,679,616 values
  // yields ~0.012 expected collisions, so a healthy generator returns ~200
  // distinct. A generator restricted to a small pool fails here — 1,000
  // possible values would average ~181, and 100 would average ~87.
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(makeSalt());
  assert.ok(seen.size > 190, 'expected ~200 distinct salts, got ' + seen.size);
});
