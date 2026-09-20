import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidName, getInvalidNameReason } from '../js/validate.js';

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
  // These pin the messages the UI actually shows (js/main.js surfaces them).
  assert.equal(getInvalidNameReason(''), 'Name cannot be empty');
  assert.equal(getInvalidNameReason('A'.repeat(51)), 'Name must be 50 characters or less');
  assert.equal(getInvalidNameReason('a&b'), "Name cannot contain '&'");
  assert.equal(getInvalidNameReason('...'), 'Name must contain at least one letter or number');
  assert.equal(getInvalidNameReason('a\x00b'), 'Name contains invalid control characters');
});

test('accepts a name at exactly the 50-character limit', () => {
  assert.equal(isValidName('A'.repeat(50)), true);
});

test('KNOWN BUG: the pipe separator is still accepted (fixed in sub-project 2)', () => {
  // '|' is the field separator in the encoded link format, so a name like
  // 'Bob|Ann' decodes into the wrong fields. Accepting it is a latent bug, not
  // a design choice — this test pins today's behaviour so sub-project 2 can
  // invert the assertion in the same commit that fixes it. Do not delete.
  assert.equal(isValidName('Bob|Ann'), true);
});
