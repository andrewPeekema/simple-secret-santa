import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, isValidAssignment, buildAssignment } from '../js/assign.js';

test('shuffle preserves membership and does not mutate', () => {
  const input = ['a', 'b', 'c', 'd', 'e'];
  const out = shuffle(input);
  assert.deepEqual([...out].sort(), [...input].sort());
  assert.deepEqual(input, ['a', 'b', 'c', 'd', 'e'], 'must not mutate its argument');
});

test('isValidAssignment rejects self-assignment and exclusions', () => {
  assert.equal(isValidAssignment(['a', 'b'], ['a', 'b'], {}), false);
  assert.equal(isValidAssignment(['a', 'b'], ['b', 'a'], {}), true);
  assert.equal(isValidAssignment(['a', 'b'], ['b', 'a'], { a: ['b'] }), false);
});

test('nobody ever draws themselves, over many runs', () => {
  const people = ['a', 'b', 'c', 'd', 'e'];
  for (let i = 0; i < 200; i++) {
    const receivers = buildAssignment(people, {});
    assert.ok(receivers, 'should always find an arrangement for 5 unconstrained people');
    people.forEach((p, idx) => assert.notEqual(receivers[idx], p));
  }
});

test('honours exclusions when it succeeds', () => {
  const people = ['a', 'b', 'c', 'd'];
  const exclusions = { a: ['b'], c: ['d'] };
  let succeeded = 0;
  for (let i = 0; i < 100; i++) {
    const receivers = buildAssignment(people, exclusions);
    if (!receivers) continue; // rejection sampling may give up
    succeeded++;
    assert.notEqual(receivers[0], 'b');
    assert.notEqual(receivers[2], 'd');
  }
  // Without this, a buildAssignment that always returned null would pass silently.
  assert.ok(succeeded > 0, 'rejection sampling never succeeded in 100 attempts');
});

test('returns null when no arrangement can exist', () => {
  assert.equal(buildAssignment(['a', 'b'], { a: ['b'], b: ['a'] }), null);
});
