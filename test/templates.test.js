import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// Text guards over the markup — index.html and every template under js/ui/ —
// for REQ-SSS-0010.2 and the visual-system spec
// (docs/superpowers/specs/2026-10-04-visual-system-design.html, §3, §7, §8.1).
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

const uiFiles = (await readdir(new URL('js/ui/', root)))
  .filter(name => name.endsWith('.js'))
  .sort()
  .map(name => 'js/ui/' + name);
const FILES = ['index.html', ...uiFiles];
const sources = new Map(await Promise.all(FILES.map(async file => [file, await read(file)])));
const css = (await read('css/styles.css')).replace(/\/\*[\s\S]*?\*\//g, '');

const COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(/i;

// Spec §3.4's removed boxes, plus the old button and header classes that
// §3.2 and §5 replace.
const REMOVED = [
  'exclusions-section', 'link-item', 'reveal-box', 'hints-box', 'hint-link-display',
  'info-box', 'success', 'success-banner', 'error', 'warning',
  'container', 'title-stars', 'subtitle', 'how-it-works', 'how-it-works-content',
  'help-text', 'reveal-name', 'remove-btn', 'remove-exclusion-btn', 'copy-btn',
  'add-exclusion-btn', 'create-hints-btn',
];

// Classes that exist for JS to select on, not for styling.
const JS_HOOKS = new Set(['person-name', 'person1-select', 'person2-select']);

// Class tokens from class="…" attributes, className = '…' assignments and
// classList.add/remove/toggle('…') calls. Prose, comments and variable names
// are not matched.
function classTokens(text) {
  const tokens = new Set();
  const patterns = [
    /\bclass\s*=\s*(["'])(.*?)\1/g,
    /\bclassName\s*=\s*(["'])(.*?)\1/g,
    /\bclassList\.(?:add|remove|toggle)\(\s*(["'])(.*?)\1/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      for (const token of m[2].split(/\s+/)) if (token) tokens.add(token);
    }
  }
  return tokens;
}

const styled = token => new RegExp(`\\.${token}(?![\\w-])`).test(css);

for (const [file, text] of sources) {
  test(`${file}: the only inline style is display: none`, () => {
    for (const m of text.matchAll(/\bstyle\s*=\s*(["'])(.*?)\1/g)) {
      assert.match(m[2].trim(), /^display:\s*none;?$/, `${file}: style="${m[2]}"`);
    }
  });

  test(`${file}: no colour literal (REQ-SSS-0010.2)`, () => {
    const m = text.match(COLOUR);
    assert.equal(m, null, `${file}: colour literal ${m && m[0]}`);
  });

  test(`${file}: no removed class names`, () => {
    const used = classTokens(text);
    for (const name of REMOVED) assert.ok(!used.has(name), `${file}: class "${name}" is removed`);
  });

  test(`${file}: every class it uses is styled`, () => {
    for (const token of classTokens(text)) {
      if (JS_HOOKS.has(token)) continue;
      assert.ok(styled(token), `${file}: .${token} has no rule in css/styles.css`);
    }
  });
}

test('every class the stylesheet styles is used by the markup (no dead CSS)', () => {
  const used = new Set();
  for (const text of sources.values()) for (const token of classTokens(text)) used.add(token);
  const selectors = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));
  for (const name of selectors) assert.ok(used.has(name), `.${name} is styled but never used`);
});

test('index.html loads only Libre Baskerville 400 and DM Sans 400 and 500', () => {
  const html = sources.get('index.html');
  const hrefs = [...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]*)"/g)]
    .map(m => m[1].replace(/&amp;/g, '&'));
  assert.equal(hrefs.length, 1, 'expected exactly one Google Fonts stylesheet');
  assert.deepEqual(new URL(hrefs[0]).searchParams.getAll('family'),
    ['Libre Baskerville:wght@400', 'DM Sans:wght@400;500']);
});

// Depth at which each id'd <div> opens, counting as a browser does: a stray
// </div> at depth 0 is ignored. HTML comments are removed first.
function openingDepths(html) {
  const depths = {};
  let depth = 0;
  const markup = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of markup.matchAll(/<div\b([^>]*)>|<\/div>/g)) {
    if (m[0] === '</div>') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    const id = /\bid="([^"]+)"/.exec(m[1]);
    if (id) depths[id[1]] = depth;
    depth++;
  }
  return depths;
}

test('index.html: overlays at body level, #results beside #setupSection', () => {
  const depths = openingDepths(sources.get('index.html'));
  assert.equal(depths.mainContainer, 0, '#mainContainer');
  assert.equal(depths.setupSection, 1, '#setupSection is a child of #mainContainer');
  assert.equal(depths.results, 1, '#results is a child of #mainContainer, not of #setupSection');
  for (const id of ['revealSection', 'hintsSection', 'viewHintsSection']) {
    assert.equal(depths[id], 0, `#${id} must stay outside #mainContainer`);
  }
});
