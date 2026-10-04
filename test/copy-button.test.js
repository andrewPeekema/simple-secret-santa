import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { copyToClipboard } from '../js/ui/dom.js';

// copyToClipboard (visual-system spec §6): the copied state is a label and a
// class, never an inline colour, and the button always returns to its own label.
function fakeButton(label) {
  const classes = new Set();
  return {
    textContent: label,
    style: {},
    classList: {
      add: name => { classes.add(name); },
      remove: name => { classes.delete(name); },
      contains: name => classes.has(name),
    },
  };
}

const realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
let writes;

beforeEach(() => {
  writes = [];
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async text => { writes.push(text); } } },
  });
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  mock.timers.reset();
  Object.defineProperty(globalThis, 'navigator', realNavigator);
});

test('copying shows "✓ Copied" by class for two seconds, then restores the label', async () => {
  const button = fakeButton('Copy link');
  await copyToClipboard('https://example.test/#abc', button);
  assert.deepEqual(writes, ['https://example.test/#abc']);
  assert.equal(button.textContent, '✓ Copied');
  assert.ok(button.classList.contains('is-copied'));
  mock.timers.tick(1999);
  assert.equal(button.textContent, '✓ Copied');
  mock.timers.tick(1);
  assert.equal(button.textContent, 'Copy link');
  assert.ok(!button.classList.contains('is-copied'));
  assert.deepEqual(button.style, {}, 'no inline style is written');
});

test('a second press while "✓ Copied" shows copies again and still restores the label', async () => {
  const button = fakeButton('Copy all links');
  await copyToClipboard('first', button);
  mock.timers.tick(500);
  await copyToClipboard('second', button);
  assert.deepEqual(writes, ['first', 'second']);
  mock.timers.tick(1500);
  assert.equal(button.textContent, 'Copy all links');
  assert.ok(!button.classList.contains('is-copied'));
  mock.timers.tick(5000);
  assert.equal(button.textContent, 'Copy all links');
});
