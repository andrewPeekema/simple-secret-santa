import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Wiring guard for the shorten-a-link tool (spec
// docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §2, §4, §6.2).
// There are no DOM tests in this repo; this reads the source as text.
const source = await readFile(new URL('../js/ui/wishlist.js', import.meta.url), 'utf8');

// Slices from `export function NAME` or `export async function NAME` to the next top-level export.
function functionText(name) {
  const m = new RegExp(`export (?:async )?function ${name}\\b`).exec(source);
  assert.ok(m, `${name} not found`);
  const next = source.indexOf('\nexport ', m.index + 1);
  return source.slice(m.index, next === -1 ? source.length : next);
}

test('REQ-SSS-0003.4: wishlist.js imports shortenLink and nothing from ../urls.js', () => {
  assert.match(source, /^import \{ shortenLink \} from '\.\.\/shorten\.js';$/m);
  assert.doesNotMatch(source, /^import .* from '\.\.\/urls\.js';$/m);
});

test('REQ-SSS-0003.4: generateHintLink encodes the trimmed text as typed', () => {
  const body = functionText('generateHintLink');
  assert.ok(body.includes('encodeHints(hintsText,'), 'encodeHints must receive hintsText');
  for (const banned of ['tidyUrls(', 'tidyUrl(', 'shortenLink(', 'shortenIn', 'Shortened']) {
    assert.ok(!body.includes(banned), `generateHintLink must not contain ${banned}`);
  }
});
