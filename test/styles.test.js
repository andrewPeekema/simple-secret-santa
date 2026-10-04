import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Text guards over the stylesheet: REQ-SSS-0010 and the visual-system spec
// (docs/superpowers/specs/2026-10-04-visual-system-design.html, §2, §3, §8.1).
const raw = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '');
const css = stripComments(raw);

const rootStart = raw.indexOf(':root {');
const rootEnd = raw.indexOf('}', rootStart);
const rootBlock = raw.slice(rootStart, rootEnd + 1);
const outsideRoot = stripComments(raw.slice(0, rootStart) + raw.slice(rootEnd + 1));

test('the stylesheet has a :root block', () => {
  assert.ok(rootStart >= 0 && rootEnd > rootStart, 'no ":root {" block found');
});

test('each custom property is defined once (REQ-SSS-0010.1)', () => {
  const names = [...stripComments(rootBlock).matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
  assert.ok(names.length > 0, 'no custom properties in :root');
  assert.equal(new Set(names).size, names.length, 'a custom property is defined twice');
});

test('colour literals appear only inside :root (REQ-SSS-0010.2)', () => {
  for (const m of raw.matchAll(/#[0-9a-f]{3,8}\b|rgba?\(/gi)) {
    assert.ok(m.index > rootStart && m.index < rootEnd,
      `${m[0]} at offset ${m.index} is outside the :root block`);
  }
});

// The regex above cannot see named colours, which REQ-SSS-0010.2 also forbids.
const COLOUR_PROPS = /(?:^|[{;\s])(color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|caret-color|text-decoration-color|fill|stroke)\s*:\s*([^;}]+)/g;

test('outside :root, colours are named only through var() (REQ-SSS-0010.2)', () => {
  for (const m of outsideRoot.matchAll(COLOUR_PROPS)) {
    const rest = m[2]
      .replace(/var\(--[\w-]+\)/g, '')
      .replace(/\b(?:transparent|none|inherit|currentColor|solid|0)\b/gi, '')
      .replace(/\b\d+(?:\.\d+)?(?:px|em|rem|%)?/g, '')
      .trim();
    assert.equal(rest, '', `${m[1]}: ${m[2].trim()}`);
  }
});

test('no prefers-color-scheme rule (REQ-SSS-0010.3)', () => {
  assert.ok(!raw.includes('prefers-color-scheme'));
});

test('no !important', () => {
  assert.ok(!raw.includes('!important'));
});

test('no text-transform', () => {
  assert.ok(!raw.includes('text-transform'));
});

test('no italics', () => {
  assert.ok(!/font-style\s*:\s*italic/.test(raw));
});

test('every font-size is one of the three steps or inherit', () => {
  const allowed = new Set(['var(--t-heading)', 'var(--t-body)', 'var(--t-note)', 'inherit']);
  for (const m of css.matchAll(/font-size\s*:\s*([^;}]+)/g)) {
    assert.ok(allowed.has(m[1].trim()), `font-size: ${m[1].trim()}`);
  }
});

const SPACING = /(?:^|[{;\s])((?:margin|padding)(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g;
const STEP = 'var\\(--s-[1-6]\\)';

test('every spacing value is a step, a calc() sum of two steps, 0 or auto', () => {
  for (const m of outsideRoot.matchAll(SPACING)) {
    const rest = m[2]
      .replace(new RegExp(`calc\\(\\s*${STEP}\\s*\\+\\s*${STEP}\\s*\\)`, 'g'), '')
      .replace(new RegExp(STEP, 'g'), '')
      .replace(/\b(?:0|auto)\b/g, '')
      .trim();
    assert.equal(rest, '', `${m[1]}: ${m[2].trim()}`);
  }
});

test('long unbroken words wrap instead of scrolling the page sideways (REQ-SSS-0009.1)', () => {
  assert.match(css, /body\s*\{[^}]*overflow-wrap:\s*anywhere/);
});
