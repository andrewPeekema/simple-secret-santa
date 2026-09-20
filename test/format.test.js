import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeAssignment, decodeAssignment, looksLikeOldLink } from '../js/format.js';

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
