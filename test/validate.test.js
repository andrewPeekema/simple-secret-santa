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
});

test('accepts a name at exactly the 50-character limit', () => {
  assert.equal(isValidName('A'.repeat(50)), true);
});

test('KNOWN BUG: the pipe separator is still accepted (fixed in sub-project 2)', () => {
  assert.equal(isValidName('Bob|Ann'), true);
});
