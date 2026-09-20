import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simpleHash, crc16, xorEncrypt, xorDecrypt } from '../js/secret.js';

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
