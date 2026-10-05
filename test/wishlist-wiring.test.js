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

const TITLE = '<summary><h2 class="section-title">Shorten a link <span class="optional">(optional)</span></h2></summary>';
const DESCRIPTION = 'Paste a link to get a shorter one for your wishlist. Product links from Amazon, Etsy, eBay, Walmart, Target and Best Buy are cut down to just the product; other links only lose their tracking tags.';

// Slices `function renderShortener` up to the next top-level export or function.
function rendererText() {
  const start = source.indexOf('\nfunction renderShortener(');
  assert.notEqual(start, -1, 'renderShortener not found');
  const ends = ['\nexport ', '\nfunction ']
    .map(s => source.indexOf(s, start + 1))
    .filter(i => i !== -1);
  return source.slice(start, ends.length ? Math.min(...ends) : source.length);
}

test('REQ-SSS-0003.5: the section is a closed <details class="tool"> between Generate and Back', () => {
  const body = functionText('showCreateHints');
  assert.ok(body.includes('<details class="tool">'));
  assert.ok(!body.includes('<details class="tool" open'));
  assert.ok(!body.includes('<details open'));
  const generate = body.indexOf('onclick="generateHintLink()"');
  const details = body.indexOf('<details class="tool">');
  const nav = body.indexOf('class="nav"');
  assert.ok(generate !== -1 && generate < details && details < nav, 'order must be Generate, section, Back');
});

test('REQ-SSS-0003.6: the section has its four fields and wires the input listener', () => {
  const body = functionText('showCreateHints');
  for (const id of ['shortenIn', 'shortenOut', 'shortenResult', 'shortenNote']) {
    assert.ok(body.includes(`id="${id}"`), `missing id="${id}"`);
  }
  assert.ok(body.includes("getElementById('shortenIn').addEventListener('input', renderShortener)"));
});

test('REQ-SSS-0007.1: the title and description are verbatim', () => {
  const body = functionText('showCreateHints');
  assert.ok(body.includes(TITLE), 'title');
  assert.ok(body.includes(DESCRIPTION), 'description');
});

test('REQ-SSS-0003.8: renderShortener calls shortenLink and never touches hintsText', () => {
  const body = rendererText();
  assert.ok(body.includes('shortenLink('));
  assert.ok(!body.includes('hintsText'));
});

test('REQ-SSS-0003.7: renderShortener carries both notes verbatim', () => {
  const body = rendererText();
  assert.ok(body.includes('Paste one full link, starting with http.'));
  assert.ok(body.includes('That link is already as short as it gets.'));
});

test('REQ-SSS-0003.6: renderShortener writes through .value and .textContent, never innerHTML', () => {
  assert.ok(!rendererText().includes('innerHTML'));
});
