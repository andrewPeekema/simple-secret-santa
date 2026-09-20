import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeAssignment, decodeAssignment, looksLikeOldLink, encodeHints, decodeHints } from '../js/format.js';
import { makeSalt, simpleHash, xorDecrypt } from '../js/secret.js';
import { decompressBytes } from '../js/compress.js';

test('assignment round-trips, including awkward names', () => {
  for (const [giver, receiver] of [
    ['Andrew', 'Kathryn'],
    ["Mary-Anne O'Brien", 'Bob Jr.'],
    ['A'.repeat(50), 'B'],
  ]) {
    const data = { giver, receiver, salt: 'k7f3m2p9q1x4c' };
    assert.deepEqual(decodeAssignment(encodeAssignment(data)), data, 'failed for ' + giver);
  }
});

test('rubbish decodes to null rather than throwing', () => {
  assert.equal(decodeAssignment('not-valid-at-all'), null);
  assert.equal(decodeAssignment(''), null);
});

test('looksLikeOldLink distinguishes outdated links from rubbish', () => {
  assert.equal(looksLikeOldLink('not-a-link-at-all'), false);
});

test('a 4-character salt round-trips: encode -> decode -> password -> wishlist', async () => {
  const salt = makeSalt();
  assert.equal(salt.length, 4);

  const data = { giver: 'Andrew', receiver: 'Kathryn', salt };
  const decoded = decodeAssignment(encodeAssignment(data));
  assert.deepEqual(decoded, data, 'assignment must survive the shorter salt');

  // The password Andrew is shown for Kathryn's wishlist, derived exactly as
  // js/ui/reveal.js derives it.
  const password = simpleHash('pair-' + decoded.receiver + '-' + decoded.salt)
    .padStart(6, '0').substring(0, 6);
  assert.equal(password.length, 6, 'a shorter salt must not shorten the password');

  const plaintext = 'Wool socks size 10, dark chocolate';
  const bytes = await decodeHints(await encodeHints(plaintext, password));
  const plain = await decompressBytes(xorDecrypt(bytes, password));
  assert.equal(Buffer.from(plain.slice(2)).toString('utf8'), plaintext,
    'the password derived from a 4-character salt must open the wishlist');
});
