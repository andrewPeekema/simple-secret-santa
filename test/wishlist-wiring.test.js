import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Wiring guard for the wishlist URL cleanup (spec
// docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §3, §5.2).
// There are no DOM tests in this repo; this reads the source as text.
const source = await readFile(new URL('../js/ui/wishlist.js', import.meta.url), 'utf8');

function functionText(name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} not found`);
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test('wishlist.js imports tidyUrls from ../urls.js', () => {
  assert.match(source, /^import \{ tidyUrls \} from '\.\.\/urls\.js';$/m);
});

test('generateHintLink tidies the text before encoding it', () => {
  const body = functionText('generateHintLink');
  const tidy = body.indexOf('tidyUrls(');
  const encode = body.indexOf('encodeHints(');
  assert.notEqual(tidy, -1, 'generateHintLink never calls tidyUrls(');
  assert.notEqual(encode, -1, 'generateHintLink never calls encodeHints(');
  assert.ok(tidy < encode, 'tidyUrls( must come before encodeHints(');
  assert.match(body, /encodeHints\(tidy\.text,/, 'encodeHints must receive the cleaned text');
});
