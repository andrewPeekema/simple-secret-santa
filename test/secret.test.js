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
});

test('xor is symmetric and leaves length unchanged', () => {
  const plain = enc('gift ideas');
  const cipher = xorEncrypt(plain, 'abc123');
  assert.equal(cipher.length, plain.length);
  assert.notDeepEqual(cipher, plain);
  assert.deepEqual(xorDecrypt(cipher, 'abc123'), plain);
});
