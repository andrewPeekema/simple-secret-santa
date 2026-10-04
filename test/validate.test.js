import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidName, getInvalidNameReason, getExclusionPairError } from '../js/validate.js';

test('accepts ordinary and international names', () => {
  for (const n of ['Andrew', 'José', "Mary-Anne O'Brien", 'Bob Jr.']) {
    assert.equal(isValidName(n), true, 'should accept ' + n);
    assert.equal(getInvalidNameReason(n), null);
  }
});

test('rejects empty, overlong, markup and punctuation-only names', () => {
  for (const n of ['', 'A'.repeat(51), 'a&b', 'a<b', 'a>b', '...', 'a\x00b']) {
    assert.equal(isValidName(n), false, 'should reject ' + JSON.stringify(n));
    assert.ok(getInvalidNameReason(n), 'should give a reason for ' + JSON.stringify(n));
  }

  // Truthiness alone cannot tell the seven distinct messages apart: a stub
  // returning one generic string for every rejection passes the loop above.
  // These pin the messages the UI actually shows (js/ui/setup.js surfaces them).
  assert.equal(getInvalidNameReason(''), 'Name cannot be empty');
  assert.equal(getInvalidNameReason('A'.repeat(51)), 'Name must be 50 characters or less');
  assert.equal(getInvalidNameReason('a&b'), "Name cannot contain '&'");
  assert.equal(getInvalidNameReason('...'), 'Name must contain at least one letter or number');
  assert.equal(getInvalidNameReason('a\x00b'), 'Name contains invalid control characters');
});

test('accepts a name at exactly the 50-character limit', () => {
  assert.equal(isValidName('A'.repeat(50)), true);
});

test('rejects the two characters that produce unusable links', () => {
  // '|' is the field separator in the encoded link format and '{' is refused
  // outright by decodeAssignment's guard, so a name containing either produces
  // a link that never decodes. A '|' anywhere, or a '{' at the start of the
  // giver's name, is reported by looksLikeOldLink as an older-version link,
  // sending the recipient back to an organiser who regenerates the identical
  // broken link; a '{' elsewhere instead lands on "Invalid Secret Santa
  // link!". Sub-project 1 pinned this as a KNOWN BUG; these assertions are
  // the inversion that fixes it.
  for (const n of ['Bob|Ann', '{Bob}', 'a|b', 'x{y', 'Ann|', '{']) {
    assert.equal(isValidName(n), false, 'should reject ' + JSON.stringify(n));
  }
  assert.equal(getInvalidNameReason('Bob|Ann'), "Name cannot contain '|'");
  assert.equal(getInvalidNameReason('{Bob}'), "Name cannot contain '{'");
});

const people = ['Alice', 'Bob', 'Carol'];

test('getExclusionPairError rejects a person excluded from themselves', () => {
  assert.equal(getExclusionPairError('Alice', 'Alice', people), "Alice can't be excluded from themselves");
});

test('getExclusionPairError rejects names not in the participant list', () => {
  assert.match(getExclusionPairError('Alice', 'Dave', people), /Dave/);
  assert.match(getExclusionPairError('Dave', 'Alice', people), /Dave/);
});

test('getExclusionPairError accepts a valid pair', () => {
  assert.equal(getExclusionPairError('Alice', 'Bob', people), null);
});

test('getExclusionPairError ignores an incomplete pair', () => {
  assert.equal(getExclusionPairError('', 'Bob', people), null);
  assert.equal(getExclusionPairError('Alice', '', people), null);
  assert.equal(getExclusionPairError('', '', people), null);
});
