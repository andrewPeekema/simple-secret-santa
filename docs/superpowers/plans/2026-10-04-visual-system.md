# Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every screen of Simple Secret Santa onto one token-based visual system (three type steps, three buttons, one card per screen), replace the results and wishlist forms in place, and fix the copy-button colour bug.

**Architecture:** `css/styles.css` is rewritten from scratch around a single `:root` token block; `index.html` and the four `js/ui/` template modules are re-marked with the new classes and lose every inline style except `display: none`. Two text-reading guard tests (`test/styles.test.js`, `test/templates.test.js`) enforce the rules; one unit test pins the copy-button fix. Logic changes are limited to show/hide in three flows and `copyToClipboard`.

**Tech Stack:** Plain HTML, CSS custom properties, ES modules, `node:test` (Node 24). No build step, no dependencies.

**Spec:** `docs/superpowers/specs/2026-10-04-visual-system-design.html` (visual reference: `docs/superpowers/brainstorm/2026-10-04-visual-system-mockup.html`; where they differ the spec wins).

**Requirements cited:** REQ-SSS-0009 (.1 412 px, no horizontal scroll; .2 42 px tap targets; .3 exclusion rows wrap below 480 px), REQ-SSS-0010 (.1 colours only as `:root` custom properties; .2 no colour literal elsewhere; .3 no `prefers-color-scheme`), REQ-SSS-0007 (.1 wishlist strings only those in spec §4). Consulted, unchanged: REQ-SSS-0001, -0002, -0003, -0005, -0006, -0008.

## Global Constraints

- No build step: plain CSS custom properties, no preprocessor or bundler (REQ-SSS-0005).
- Every colour is defined once, as a custom property on `:root` in `css/styles.css`; no hex, `rgb()`, `rgba()` or named colour anywhere else — not elsewhere in the stylesheet, not in `index.html`, not in any JS template (REQ-SSS-0010.1, .2). No `prefers-color-scheme` rule (REQ-SSS-0010.3).
- Every screen fits a 412 px viewport with no horizontal scroll; every button, text link and text input is at least 42 px tall (REQ-SSS-0009.1, .2).
- These selectors are never renamed or removed: ids `mainContainer, setupSection, peopleList, exclusionsList, results, successBanner, copyAllBtn, linksList, revealSection, hintsSection, viewHintsSection, hintsText, hintLengthWarning, hintLinkDisplay, hint-link-input, passwordInput, decodedHints`; classes `person-name, exclusion-row, person1-select, person2-select`.
- `#revealSection`, `#hintsSection`, `#viewHintsSection` stay at body level, outside `#mainContainer`; the warning comment in `index.html` stays. The only structural move is `#results` out of `#setupSection` to be its next sibling inside `#mainContainer`.
- The only `style=` attributes left in `index.html` and `js/ui/*.js` are `style="display: none;"` on containers JS shows and hides.
- No `!important`, no `text-transform`, no `font-style: italic`. Every `font-size` is `var(--t-heading)`, `var(--t-body)`, `var(--t-note)` or `inherit`. Font weights 400 and 500 only. Every margin/padding/gap is `0`, `auto`, one of `var(--s-1)`…`var(--s-6)`, or a `calc()` sum of two of them.
- `test/legacy-removed.test.js` reads source text: `js/main.js` must not contain `hash.startsWith('hints-')`; `js/ui/wishlist.js` must not contain `text.startsWith('VALID:')`, `.isLegacy` or `enteredPassword.startsWith('0')`, and must contain `enteredPassword.length === 5` exactly once.
- Every interpolated name or URL passes through `escapeHtml`.
- No logic changes beyond spec §5.2 (results replace the form), §5.5 (link replaces the wishlist form), §5.6 (decoded list replaces the password form) and §6 (copy button). Encoding, assignment, validation, hashing, the hint codec, alerts and confirm prompts are untouched.
- Copy is exactly as written in spec §4 and in this plan's code: em dashes `—` unspaced in the UI, `…` as one character in the textarea placeholder, `✓` in status lines. Sentence case everywhere.
- Commit after each task; the suite (`npm test`) is green — zero failures — at every commit. Tests marked `todo` do not count as failures.

## Review Focus

1. **A long unbroken name or wishlist word on a 412 px phone** (names may be 50 characters with no space; wishlist text is free) — the text wraps inside the card; the page never scrolls sideways. Pinned in Task 1: `body` carries `overflow-wrap: anywhere`, asserted by `test/styles.test.js`.
2. **Copy pressed twice within two seconds** — the second press copies again and the button still returns to its own label ("Copy link" / "Copy all links"), never keeping "✓ Copied" for good (today's code keeps "Copied!"). Pinned in Task 3: `test/copy-button.test.js`.
3. **An overlay section or `#results` nested in the wrong place** — a reveal, error or wishlist screen comes up blank, or hiding the form hides the results, while every other test stays green. Pinned in Task 2: the nesting test in `test/templates.test.js`.
4. **A class name in markup that the stylesheet does not define (a typo such as `btn-primary`), or a rule left behind for markup that is gone** — a control renders unstyled, or dead CSS survives the rewrite. Pinned in Task 2 (per-file "every class it uses is styled") and Task 5 (the stylesheet-wide "every class the stylesheet styles is used").
5. **A named colour (`white`, `black`, `gold`…) written outside `:root`** — the spec's hex/`rgba(` regex misses it but REQ-SSS-0010.2 forbids it. Pinned in Task 1: the colour-property test in `test/styles.test.js`.

## File map

| File | Task | Responsibility after this plan |
|---|---|---|
| `css/styles.css` | 1 | The whole visual system: tokens, type roles, surfaces, controls, rows, utilities, mobile. Rewritten. |
| `test/styles.test.js` | 1 | Text guards over the stylesheet (spec §8.1 first bullet, plus named colours, spacing, wrapping). New. |
| `index.html` | 2 | Setup and results markup; fonts; the three overlay containers. |
| `README.md` | 2 | Item 4 wording. |
| `test/templates.test.js` | 2, 3, 4, 5 | Text guards over `index.html` and `js/ui/*.js` (spec §8.1 second bullet, plus nesting and class coverage). New in 2; later tasks shrink its `PENDING` set; Task 5 writes its final form. |
| `js/ui/dom.js` | 3 | `escapeHtml`, the shared `STARS_HTML`, `copyToClipboard` (fixed), `showError`. |
| `test/copy-button.test.js` | 3 | Unit test of `copyToClipboard`. New. |
| `js/ui/reveal.js` | 3 | Reveal screen template. |
| `js/ui/setup.js` | 4 | Row templates, results rendering, new `editParticipants`. |
| `js/main.js` | 4 | Window shim gains `editParticipants`. |
| `js/ui/wishlist.js` | 5 | Create, link-ready and view screens. |

Tasks run in order, one at a time: 2 needs 1's stylesheet (its class check reads it); 3–5 each edit 2's test file; 5 imports `STARS_HTML` from 3.

Expected suite sizes (dry-run by the lead on a scratch copy before dispatch): after Task 1, 51 tests; after Task 2, 73 (16 of them todo); after Task 5, 76 with no todo, all passing.

---

### Task 1: Stylesheet rewrite and its guard test

**Files:**
- Create: `test/styles.test.js`
- Replace (whole file): `css/styles.css`

**Interfaces:**
- Consumes: nothing.
- Produces: the class vocabulary every later task's markup uses — `card, left, sep (hr.sep), tint, tint--danger, recipient (h1.recipient), section-title, optional, note, secondary, text-danger, tagline, stars, star-gold, star-ice, star-green, star-silver, star-red, password, kv, wishlist-text, arrow, nav, in, in--url, in--password, btn, btn--block, btn--primary, btn--secondary, btn--quiet, danger, is-copied, link, how (details.how), how-body, person-input, exclusion-row, link-entry, mt-1, mt-2, mt-3, mt-5`.

Between this task and Task 5 the old markup renders partly unstyled. That is expected; nothing ships until the branch is done, and acceptance is the end-of-branch walk-through.

- [ ] **Step 1: Write the failing test**

Create `test/styles.test.js` with exactly:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/styles.test.js`
Expected: FAIL — at least "colour literals appear only inside :root" (the current file has `#e8c87a` in `.title-stars`), "no !important", "no text-transform", "no italics", "every font-size…" and "long unbroken words…" fail.

- [ ] **Step 3: Replace `css/styles.css`**

Overwrite the whole file with exactly:

```css
/* Simple Secret Santa — the visual system.
   Spec: docs/superpowers/specs/2026-10-04-visual-system-design.html.
   Every colour is a token in the block below (REQ-SSS-0010);
   test/styles.test.js enforces the rules this file follows. */

:root {
    /* Surfaces */
    --bg-0: #0f0f0f;   /* page */
    --bg-1: #1a1a1a;   /* the one card */
    --bg-2: #232323;   /* inputs, selects, textarea, mono link fields */
    /* Text */
    --text-1: #f5f5f4; /* primary */
    --text-2: #a8a8a6; /* secondary */
    --text-3: #6f6f6d; /* notes */
    /* Accent: exactly one green */
    --accent: #3a9a5c;
    --accent-hover: #45ad6a;
    --accent-soft: rgba(58, 154, 92, 0.12);
    --accent-border: rgba(58, 154, 92, 0.4);
    /* Gold: the recipient's name, and one star */
    --gold: #e8c87a;
    /* Stars only */
    --star-ice: #8ec8e8;
    --star-silver: #b8b8b8;
    /* Danger: remove, errors, warnings */
    --danger: #c54545;
    --danger-soft: rgba(197, 69, 69, 0.12);
    --danger-border: rgba(197, 69, 69, 0.4);
    /* Lines */
    --line: rgba(255, 255, 255, 0.08);
    --line-strong: rgba(255, 255, 255, 0.14);
    /* Type */
    --font-serif: 'Libre Baskerville', Georgia, serif;
    --font-sans: 'DM Sans', -apple-system, sans-serif;
    --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
    --t-heading: 1.5rem;     /* 24px */
    --t-body: 1rem;          /* 16px */
    --t-note: 0.8125rem;     /* 13px */
    /* Shape and space */
    --radius: 6px;
    --radius-card: 8px;
    --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px;
}

* {
    box-sizing: border-box;
}

body {
    max-width: 580px;
    min-height: 100vh;
    margin: 0 auto;
    padding: var(--s-5) var(--s-4);
    background: var(--bg-0);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: var(--t-body);
    line-height: 1.5;
    overflow-wrap: anywhere;
    -webkit-font-smoothing: antialiased;
}

h1, h2, p, ol {
    margin: 0;
}

/* ---- Surfaces: one card per screen, tints for status, rules between sections ---- */

.card {
    padding: var(--s-5);
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
    animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
}

#revealSection, #hintsSection, #viewHintsSection {
    text-align: center;
}

.left {
    text-align: left;
}

hr.sep {
    margin: var(--s-5) 0;
    border: 0;
    border-top: 1px solid var(--line);
}

.tint {
    padding: var(--s-3) var(--s-4);
    background: var(--accent-soft);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius);
    color: var(--accent);
    font-weight: 500;
}

.tint.tint--danger {
    background: var(--danger-soft);
    border-color: var(--danger-border);
    color: var(--danger);
    font-weight: 400;
}

/* ---- Type: heading, body, note ---- */

h1 {
    font-family: var(--font-serif);
    font-size: var(--t-heading);
    font-weight: 400;
    line-height: 1.25;
    letter-spacing: -0.01em;
    color: var(--text-1);
    text-align: center;
}

h1.recipient {
    color: var(--gold);
}

.section-title {
    font-family: var(--font-serif);
    font-size: var(--t-body);
    font-weight: 400;
    line-height: 1.5;
    color: var(--text-1);
}

.section-title .optional {
    font-family: var(--font-sans);
    font-size: var(--t-note);
    color: var(--text-3);
}

.note {
    font-size: var(--t-note);
    color: var(--text-3);
}

.secondary {
    color: var(--text-2);
}

.text-danger {
    color: var(--danger);
}

.tagline {
    margin-top: var(--s-1);
    font-size: var(--t-note);
    color: var(--text-3);
    text-align: center;
}

.stars {
    margin-bottom: var(--s-2);
    font-size: var(--t-note);
    letter-spacing: 0.5em;
    text-align: center;
}

.stars .star-gold { color: var(--gold); }
.stars .star-ice { color: var(--star-ice); }
.stars .star-green { color: var(--accent); }
.stars .star-silver { color: var(--star-silver); }
.stars .star-red { color: var(--danger); }

.password {
    font-family: var(--font-mono);
    font-size: var(--t-body);
    letter-spacing: 0.1em;
    color: var(--accent);
}

.kv {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: var(--s-3);
}

.wishlist-text {
    color: var(--text-1);
    text-align: left;
    white-space: pre-wrap;
}

.arrow {
    font-size: var(--t-note);
    color: var(--text-3);
}

.nav {
    margin-top: var(--s-4);
    text-align: center;
}

/* ---- Controls: inputs and buttons share one 42px height ---- */

.in {
    display: block;
    width: 100%;
    height: 42px;
    padding: 0 var(--s-3);
    background: var(--bg-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: var(--t-body);
    transition: border-color 150ms;
}

.in::placeholder {
    color: var(--text-3);
}

.in:focus {
    outline: none;
    border-color: var(--accent);
}

textarea.in {
    height: auto;
    min-height: 110px;
    padding: var(--s-3);
    line-height: 1.5;
    resize: vertical;
}

.in.in--url {
    font-family: var(--font-mono);
    font-size: var(--t-note);
    color: var(--text-2);
}

.in.in--password {
    font-family: var(--font-mono);
    letter-spacing: 0.1em;
    text-align: center;
    color: var(--text-1);
}

.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    height: 42px;
    padding: 0 var(--s-4);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--text-1);
    font-family: var(--font-sans);
    font-size: var(--t-body);
    font-weight: 500;
    line-height: 1.25;
    cursor: pointer;
    transition: background-color 150ms, border-color 150ms, color 150ms;
}

.btn--block {
    display: flex;
    width: 100%;
}

.btn--primary {
    background: var(--accent);
    color: var(--bg-0);
}

.btn--primary:hover {
    background: var(--accent-hover);
}

.btn--secondary {
    border-color: var(--line-strong);
    color: var(--text-1);
}

.btn--secondary:hover {
    border-color: var(--text-2);
}

.btn--quiet {
    padding: 0 var(--s-3);
    color: var(--accent);
}

.btn--quiet:hover {
    background: var(--accent-soft);
}

.btn--quiet.danger {
    color: var(--danger);
}

.btn--quiet.danger:hover {
    background: var(--danger-soft);
}

/* The copied state (spec §6): set and cleared by copyToClipboard. */
.btn.is-copied {
    color: var(--text-2);
}

.btn--secondary.is-copied {
    border-color: var(--line);
}

/* Navigation: a button drawn as underlined note-size text, 42px tall to tap. */
.link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    padding: 0 var(--s-2);
    background: none;
    border: 0;
    color: var(--text-2);
    font-family: var(--font-sans);
    font-size: var(--t-note);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    transition: color 150ms;
}

.link:hover {
    color: var(--text-1);
}

/* ---- How it works ---- */

details.how {
    border: 1px solid var(--line);
    border-radius: var(--radius);
}

details.how summary {
    padding: var(--s-3) var(--s-4);
    color: var(--text-2);
    font-size: var(--t-note);
    list-style: none;
    cursor: pointer;
    transition: color 150ms;
}

details.how summary:hover {
    color: var(--text-1);
}

details.how summary::-webkit-details-marker {
    display: none;
}

details.how summary::before {
    content: "✦";
    display: inline-block;
    margin-right: var(--s-2);
    color: var(--gold);
    transition: transform 0.3s ease;
}

details.how[open] summary::before {
    transform: rotate(90deg);
}

.how-body {
    padding: var(--s-3) var(--s-4) var(--s-4);
    border-top: 1px solid var(--line);
    color: var(--text-2);
    font-size: var(--t-note);
}

.how-body ol {
    padding-left: var(--s-4);
}

.how-body li + li {
    margin-top: var(--s-1);
}

.how-body strong {
    color: var(--text-1);
    font-weight: 500;
}

.how-body p {
    margin-top: var(--s-3);
}

/* ---- Rows ---- */

.person-input, .exclusion-row {
    display: flex;
    align-items: center;
    gap: var(--s-2);
}

.person-input + .person-input {
    margin-top: var(--s-2);
}

.exclusion-row {
    margin-top: var(--s-3);
}

.person-input .in, .exclusion-row .in {
    flex: 1;
    min-width: 0;
}

.link-entry + .link-entry {
    margin-top: var(--s-4);
}

/* ---- Spacing ---- */

#setupSection, #results {
    margin-top: var(--s-5);
}

.mt-1 { margin-top: var(--s-1); }
.mt-2 { margin-top: var(--s-2); }
.mt-3 { margin-top: var(--s-3); }
.mt-5 { margin-top: var(--s-5); }

/* ---- Browser chrome ---- */

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-1);
}

::-webkit-scrollbar-thumb {
    background: var(--line-strong);
    border-radius: var(--radius);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--text-3);
}

::selection {
    background: var(--accent);
    color: var(--bg-0);
}

/* ---- Phones (REQ-SSS-0009) ---- */

@media (max-width: 480px) {
    body {
        padding: var(--s-3) var(--s-2);
    }

    .card {
        padding: var(--s-4);
    }

    .exclusion-row {
        flex-wrap: wrap;
    }

    .exclusion-row .in {
        flex-basis: 100%;
    }

    .arrow {
        display: none;
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/styles.test.js`
Expected: PASS, 11 tests, 0 failures.

Run: `npm test`
Expected: 51 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css test/styles.test.js
git commit -m "feat: rewrite the stylesheet onto the visual-system tokens"
```

---

### Task 2: Setup and results markup, README, and the template guard test

**Files:**
- Create: `test/templates.test.js`
- Replace (whole file): `index.html`
- Modify: `README.md:11`

**Interfaces:**
- Consumes: the Task 1 class vocabulary (listed under Task 1, Produces).
- Produces: `test/templates.test.js` with a `PENDING` set naming the `js/ui/` files not yet converted (Tasks 3–5 remove entries); the inline handler `onclick="editParticipants()"` that Task 4 makes resolvable; `#results` as a direct child of `#mainContainer`.

`editParticipants` does not exist on `window` until Task 4; pressing "Edit participants" between Tasks 2 and 4 throws in the browser. No test covers it; it is expected mid-branch.

- [ ] **Step 1: Write the failing test**

Create `test/templates.test.js` with exactly:

```js
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

// Files the visual-system plan has not converted yet: their checks run as
// todo. Each task removes its files; the last task removes this set.
const PENDING = new Set(['js/ui/dom.js', 'js/ui/reveal.js', 'js/ui/setup.js', 'js/ui/wishlist.js']);
const options = file => (PENDING.has(file) ? { todo: 'not yet converted' } : {});

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
  test(`${file}: the only inline style is display: none`, options(file), () => {
    for (const m of text.matchAll(/\bstyle\s*=\s*(["'])(.*?)\1/g)) {
      assert.match(m[2].trim(), /^display:\s*none;?$/, `${file}: style="${m[2]}"`);
    }
  });

  test(`${file}: no colour literal (REQ-SSS-0010.2)`, options(file), () => {
    const m = text.match(COLOUR);
    assert.equal(m, null, `${file}: colour literal ${m && m[0]}`);
  });

  test(`${file}: no removed class names`, options(file), () => {
    const used = classTokens(text);
    for (const name of REMOVED) assert.ok(!used.has(name), `${file}: class "${name}" is removed`);
  });

  test(`${file}: every class it uses is styled`, options(file), () => {
    for (const token of classTokens(text)) {
      if (JS_HOOKS.has(token)) continue;
      assert.ok(styled(token), `${file}: .${token} has no rule in css/styles.css`);
    }
  });
}

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/templates.test.js`
Expected: FAIL (non-todo) on `index.html` checks — inline styles (`style="font-weight: 400; …"`), removed classes (`container`, `title-stars`, `subtitle`, `how-it-works`, …), unstyled classes, the font-weights test (`ital,wght@…`), and the nesting test (`#results` at depth 2). The `js/ui/*` checks report as todo.

- [ ] **Step 3: Replace `index.html`**

Overwrite the whole file with exactly the following. The warning comment is kept; only its div counts change, because the markup above it changed (16 opening `<div>` and 17 closing `</div>` in the file now; the stray close is still the last one).

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secret Santa Generator</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="card" id="mainContainer">
        <div class="stars">
            <span class="star-gold">✦</span>
            <span class="star-ice">✦</span>
            <span class="star-green">✦</span>
            <span class="star-silver">✦</span>
            <span class="star-red">✦</span>
        </div>
        <h1>Simple Secret Santa</h1>
        <p class="tagline">People picking through practically private pairings</p>

        <div id="setupSection">
            <details class="how">
                <summary>How it works</summary>
                <div class="how-body">
                    <ol>
                        <li><strong>Generate pairings</strong> by entering participant names below</li>
                        <li><strong>Share each link privately</strong> with the right person</li>
                        <li><strong>Each person sees their assignment</strong> and gets a wishlist password</li>
                        <li><strong>Wishlists are optional</strong>—each person can create one for their Santa</li>
                    </ol>
                    <p>Wishlists are gift-wrapped, not locked up—keep anything private off them. 🎁</p>
                    <p>This site doesn't store or collect any data—everything runs locally in your browser.</p>
                </div>
            </details>

            <h2 class="section-title mt-5">Participants</h2>
            <div id="peopleList" class="mt-2">
                <div class="person-input">
                    <input type="text" placeholder="Enter name" class="in person-name">
                </div>
                <div class="person-input">
                    <input type="text" placeholder="Enter name" class="in person-name">
                </div>
                <div class="person-input">
                    <input type="text" placeholder="Enter name" class="in person-name">
                </div>
            </div>
            <button class="btn btn--secondary btn--block mt-3" onclick="addPerson()">+ Add person</button>

            <hr class="sep">

            <h2 class="section-title">Exclusions <span class="optional">(optional)</span></h2>
            <p class="note mt-1">Prevent certain pairings (couples, family members, etc.)</p>
            <div id="exclusionsList"></div>
            <button class="btn btn--secondary btn--block mt-3" onclick="addExclusion()">+ Add exclusion</button>

            <hr class="sep">

            <button class="btn btn--primary btn--block" onclick="generateSecretSanta()">Generate pairings</button>
        </div>

        <div id="results" style="display: none;">
            <div id="successBanner" class="tint"></div>
            <p class="note mt-3">Send each link privately to the corresponding person.</p>
            <button id="copyAllBtn" class="btn btn--secondary btn--block mt-3" onclick="copyAllLinks()">Copy all links</button>

            <hr class="sep">

            <div id="linksList"></div>
            <div class="tint tint--danger note mt-5">Save these links. Once you leave this page, these specific pairings cannot be recreated.</div>
            <p class="nav"><button class="link" onclick="editParticipants()">Edit participants</button></p>
        </div>
    </div>

        <!--
            The markup above has one more closing </div> than opening <div>
            (17 vs 16); the browser silently ignores the stray close, and
            that is what leaves #revealSection, #hintsSection and
            #viewHintsSection below outside #mainContainer instead of nested
            inside it. This is deliberate-by-accident: each of those three
            hides #mainContainer and shows itself, so if you "fix" the
            imbalance by moving them inside #mainContainer, every reveal,
            error and wishlist view breaks even though the test suite stays
            green. Do not change this nesting.
        -->
        <div id="revealSection" class="card" style="display: none;">
        </div>

        <div id="hintsSection" class="card" style="display: none;">
        </div>

        <div id="viewHintsSection" class="card" style="display: none;">
        </div>
    </div>

    <script type="module" src="js/main.js"></script>
</body>
</html>
```

After writing, count the divs: `grep -o '<div\b' index.html | wc -l` must print `17` and `grep -o '</div>' index.html | wc -l` must print `18`. Each count includes the one `<div>` / `</div>` written inside the comment's own text, so the markup itself has 16 and 17, which is what the comment states. The nesting test in Step 5 is the real check: it strips comments and counts the way a browser does.

- [ ] **Step 4: Update `README.md` item 4**

Replace line 11:

```
4. Wishlists are optional — if shared, they're gift-wrapped for the right Santa
```

with:

```
4. Wishlists are optional — each person can create one for their Santa
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/templates.test.js`
Expected: every `index.html` test and both index-specific tests PASS; the `js/ui/*` tests are reported as todo (some todo tests fail — that is expected and does not fail the run). Exit code 0.

Run: `npm test`
Expected: 0 failures (todo tests are listed separately).

- [ ] **Step 6: Commit**

```bash
git add index.html README.md test/templates.test.js
git commit -m "feat: restyle the setup and results markup; results leave the form"
```

---

### Task 3: Shared stars, the copy-button fix, the error and reveal screens

**Files:**
- Create: `test/copy-button.test.js`
- Replace (whole file): `js/ui/dom.js`
- Replace (whole file): `js/ui/reveal.js`
- Modify: `test/templates.test.js` (the `PENDING` line)

**Interfaces:**
- Consumes: Task 1 classes; Task 2's `PENDING` set.
- Produces: `export const STARS_HTML: string` from `js/ui/dom.js` (the five-star row markup, used by `showError` and `reveal.js` here and by `wishlist.js` in Task 5); `copyToClipboard(text: string, button: HTMLButtonElement): Promise<void>` with the same signature as today; `showError(message: string): void` unchanged in signature.

- [ ] **Step 1: Write the failing test**

Create `test/copy-button.test.js` with exactly:

```js
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
```

In `test/templates.test.js`, change the `PENDING` line to:

```js
const PENDING = new Set(['js/ui/setup.js', 'js/ui/wishlist.js']);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/copy-button.test.js test/templates.test.js`
Expected: FAIL — both copy-button tests (label is `Copied!`, `style.background` is written); `js/ui/dom.js` fails "no colour literal" (`#38a169`), "no removed class names" (`title-stars`, `error`) and "every class it uses is styled"; `js/ui/reveal.js` fails "the only inline style…", "no removed class names" (`reveal-box`, `hints-box`, …) and "every class it uses is styled".

- [ ] **Step 3: Replace `js/ui/dom.js`**

Overwrite the whole file with exactly:

```js
// Text-context only: escapes via textContent/innerHTML (&, <, >) but does not
// escape quotes, so its output is not safe to interpolate into an
// HTML-attribute value unless the source text is known never to contain a
// quote character.
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// The row of five stars at the top of every screen. index.html carries the
// same markup statically for the setup screen.
export const STARS_HTML = `
        <div class="stars">
            <span class="star-gold">✦</span>
            <span class="star-ice">✦</span>
            <span class="star-green">✦</span>
            <span class="star-silver">✦</span>
            <span class="star-red">✦</span>
        </div>`;

export async function copyToClipboard(text, button) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }

        // A press while "✓ Copied" is already showing has copied again; leave
        // the pending restore alone so the button gets its own label back.
        if (button.classList.contains('is-copied')) return;

        const originalText = button.textContent;
        button.textContent = '✓ Copied';
        button.classList.add('is-copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('is-copied');
        }, 2000);
    } catch (err) {
        alert('Failed to copy. Please select and copy manually.');
    }
}

export function showError(message) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const revealSection = document.getElementById('revealSection');
    revealSection.style.display = 'block';

    revealSection.innerHTML = `
        ${STARS_HTML}
        <h1>Invalid link</h1>
        <div class="tint tint--danger note mt-5">${escapeHtml(message)}</div>
        <p class="nav"><button class="link" onclick="location.href=location.pathname">Start a new exchange</button></p>
    `;
}
```

- [ ] **Step 4: Replace `js/ui/reveal.js`**

Overwrite the whole file with exactly (lines 1–23 are today's, unchanged; only the template changes):

```js
import { escapeHtml, STARS_HTML } from './dom.js';
import { simpleHash } from '../secret.js';
import { getSessionSalt } from './setup.js';

export function revealAssignment(data) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const revealSection = document.getElementById('revealSection');
    revealSection.style.display = 'block';

    const hintPassword = simpleHash('pair-' + data.receiver + '-' + (data.salt || getSessionSalt())).padStart(6, '0').substring(0, 6);

    const safeGiver = escapeHtml(data.giver);
    const safeReceiver = escapeHtml(data.receiver);
    const safeSalt = escapeHtml(data.salt || getSessionSalt());

    // Store raw values for wishlist creation to ensure password consistency
    window.revealData = {
        giver: data.giver,
        salt: data.salt || getSessionSalt()
    };

    revealSection.innerHTML = `
        ${STARS_HTML}
        <p class="secondary">Hello, ${safeGiver}. You're giving a gift to</p>
        <h1 class="recipient mt-2">${safeReceiver}</h1>

        <hr class="sep">

        <p class="kv"><span class="secondary">Wishlist password</span><span class="password">${hintPassword}</span></p>
        <p class="note mt-2">You'll need it to open ${safeReceiver}'s wishlist, if they share one.</p>

        <hr class="sep">

        <button class="btn btn--primary btn--block" onclick="showCreateHints(window.revealData.giver, window.revealData.salt)">Create your wishlist</button>
        <p class="note mt-2">Share hints with your own Secret Santa.</p>

        <p class="nav"><button class="link" onclick="location.href=location.pathname">Start a new exchange</button></p>
    `;
}
```

(`safeSalt` was already unused before this change; it is left alone because the plan makes no logic changes here.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/copy-button.test.js test/templates.test.js`
Expected: both copy-button tests PASS; every `js/ui/dom.js` and `js/ui/reveal.js` check PASSES; `setup.js` and `wishlist.js` checks report as todo.

Run: `npm test`
Expected: 0 failures.

- [ ] **Step 6: Commit**

```bash
git add js/ui/dom.js js/ui/reveal.js test/copy-button.test.js test/templates.test.js
git commit -m "fix: copy button shows its copied state by class, not an inline colour

Also restyles the reveal and invalid-link screens onto the visual system."
```

---

### Task 4: Setup rows, results rendering and "Edit participants"

**Files:**
- Modify: `js/ui/setup.js:1` (import), `:12-21` (`addPerson`), `:23-39` (`addExclusion`), `:184-223` (`displayResults`), plus a new `editParticipants` after it
- Modify: `js/main.js:3` (import) and `:40-50` (window shim)
- Modify: `test/templates.test.js` (the `PENDING` line)

**Interfaces:**
- Consumes: Task 1 classes; Task 2's `onclick="editParticipants()"` in `index.html` and `#results` as a sibling of `#setupSection`; `copyToClipboard` and `escapeHtml` from `js/ui/dom.js` (unchanged signatures).
- Produces: `export function editParticipants(): void` in `js/ui/setup.js`, published on `window` by `js/main.js`.

- [ ] **Step 1: Make the guard test fail for `setup.js`**

In `test/templates.test.js`, change the `PENDING` line to:

```js
const PENDING = new Set(['js/ui/wishlist.js']);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/templates.test.js`
Expected: FAIL — `js/ui/setup.js: no removed class names` (`remove-btn`, `remove-exclusion-btn`, `link-item`, `copy-btn`) and `js/ui/setup.js: every class it uses is styled`.

- [ ] **Step 3: Rewrite the three templates and add `editParticipants` in `js/ui/setup.js`**

Leave line 1's import as it is (`import { escapeHtml, copyToClipboard } from './dom.js';`).

Replace `addPerson` (lines 12–21) with:

```js
export function addPerson() {
    const peopleList = document.getElementById('peopleList');
    const div = document.createElement('div');
    div.className = 'person-input';
    div.innerHTML = `
        <input type="text" placeholder="Enter name" class="in person-name">
        <button class="btn btn--quiet danger" onclick="this.parentElement.remove(); updateExclusionDropdowns();">Remove</button>
    `;
    peopleList.appendChild(div);
}
```

Replace `addExclusion` (lines 23–39) with:

```js
export function addExclusion() {
    const exclusionsList = document.getElementById('exclusionsList');
    const div = document.createElement('div');
    div.className = 'exclusion-row';
    div.innerHTML = `
        <select class="in person1-select">
            <option value="">Select person...</option>
        </select>
        <span class="arrow">↔</span>
        <select class="in person2-select">
            <option value="">Select person...</option>
        </select>
        <button class="btn btn--quiet danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    exclusionsList.appendChild(div);
    updateExclusionDropdowns();
}
```

Replace `displayResults` (lines 184–223) with the following, which adds `scrollToCard` and `editParticipants` after it. `copyAllLinks` (lines 225–233) stays below them, unchanged.

```js
export function displayResults(assignments) {
    const linksList = document.getElementById('linksList');
    linksList.innerHTML = '';

    const people = Object.keys(assignments);

    // Store for Copy All function
    window.generatedLinks = [];

    // Set success banner
    const successBanner = document.getElementById('successBanner');
    successBanner.textContent = `✓ ${people.length} links ready to share`;

    people.forEach(person => {
        const url = window.location.origin + window.location.pathname +
                   '#' + assignments[person].encoded;

        // Store for Copy All
        window.generatedLinks.push({ name: person, url: url });

        const div = document.createElement('div');
        div.className = 'link-entry';

        const inputId = 'link-' + Math.random().toString(36).substring(2, 8);

        div.innerHTML = `
            <h2 class="section-title">${escapeHtml(person)}</h2>
            <input type="text" class="in in--url mt-2" value="${escapeHtml(url)}" readonly id="${inputId}">
            <button class="btn btn--quiet mt-1" onclick="copyToClipboard(document.getElementById('${inputId}').value, this)">Copy link</button>
        `;

        linksList.appendChild(div);
    });

    // The results replace the form (spec §5.2); the form is only hidden, so
    // editParticipants() can bring it back with every name and exclusion intact.
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    scrollToCard();
}

export function editParticipants() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('setupSection').style.display = 'block';
    scrollToCard();
}

function scrollToCard() {
    document.getElementById('mainContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

- [ ] **Step 4: Publish `editParticipants` in `js/main.js`**

Replace line 3:

```js
import { addPerson, addExclusion, updateExclusionDropdowns, generateSecretSanta, copyAllLinks } from './ui/setup.js';
```

with:

```js
import { addPerson, addExclusion, updateExclusionDropdowns, generateSecretSanta, copyAllLinks, editParticipants } from './ui/setup.js';
```

and in the `Object.assign(window, { … })` block, add `editParticipants,` on its own line directly after `copyAllLinks,`, so the block reads:

```js
    Object.assign(window, {
        addPerson,
        addExclusion,
        generateSecretSanta,
        copyAllLinks,
        editParticipants,
        copyToClipboard,
        showCreateHints,
        generateHintLink,
        tryDecodeHintsWithPassword,
        updateExclusionDropdowns,
    });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/templates.test.js`
Expected: every `js/ui/setup.js` check PASSES; only `wishlist.js` checks report as todo.

Run: `npm test`
Expected: 0 failures (this includes `test/legacy-removed.test.js`, which reads `js/main.js`).

Run: `node -e "import('./js/main.js').then(() => console.log('main.js imports'))"`
Expected: prints `main.js imports` (the module still loads with no DOM).

- [ ] **Step 6: Commit**

```bash
git add js/ui/setup.js js/main.js test/templates.test.js
git commit -m "feat: results replace the setup form; Edit participants brings it back"
```

---

### Task 5: Wishlist screens, and the final form of the template guard

**B1 ruling (director, 2026-10-04, user decision; spec amended on main at 6e82dac):** on the wishlist create and link-ready screens, "Back" returns to the giver's assignment: it hides `#hintsSection` and shows `#revealSection`, whose content is still in the DOM because `showCreateHints` only hides it. It is one inline onclick and no new function. The view screen's "Back" (§5.6) stays `location.href=location.pathname`. The code below already carries this.

**Files:**
- Replace (whole file): `js/ui/wishlist.js`
- Replace (whole file): `test/templates.test.js`

**Interfaces:**
- Consumes: Task 1 classes; `escapeHtml`, `copyToClipboard`, `STARS_HTML` from `js/ui/dom.js` (Task 3).
- Produces: nothing new for later tasks. `showCreateHints(recipientName, salt)`, `generateHintLink()`, `showViewHints(encryptedBytes)` and `tryDecodeHintsWithPassword()` keep their signatures.

- [ ] **Step 1: Write the final guard test**

Overwrite `test/templates.test.js` with its final form — the same file with the `PENDING` machinery removed and the stylesheet-wide dead-CSS test added:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/templates.test.js`
Expected: FAIL — `js/ui/wishlist.js` fails "the only inline style…", "no removed class names" (`hints-box`, `create-hints-btn`, `hint-link-display`, `copy-btn`, `info-box`, `success`, `error`) and "every class it uses is styled"; the dead-CSS test fails on classes only `wishlist.js` will use (`left`, `text-danger`, `in--password`, `wishlist-text`).

- [ ] **Step 3: Replace `js/ui/wishlist.js`**

Overwrite the whole file with exactly the following. `tryDecodeHintsWithPassword`'s decoding logic (the `validateHints` helper, both decrypt attempts and the comment above the five-character retry) is today's, unchanged; only the markup it writes and the hiding of `#viewHintsForm` on success are new.

```js
// copyToClipboard is never called at module scope — it is only referenced
// from inside an onclick="..." string in a template below, resolved through
// the window shim at click time. Kept here as the only greppable trace of
// that dependency.
import { escapeHtml, copyToClipboard, STARS_HTML } from './dom.js';
import { encodeHints } from '../format.js';
import { simpleHash, crc16, xorDecrypt } from '../secret.js';
import { decompressBytes } from '../compress.js';
import { bytesToUtf8 } from '../codec.js';

const INVALID_PASSWORD_HTML = `
            <div class="tint tint--danger note mt-3">Invalid password. Only the assigned Secret Santa has the correct password.</div>
        `;

export function showCreateHints(recipientName, salt) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('revealSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const hintsSection = document.getElementById('hintsSection');
    hintsSection.style.display = 'block';

    window.hintRecipientName = recipientName;
    window.hintSalt = salt;

    hintsSection.innerHTML = `
        ${STARS_HTML}
        <h1>Your wishlist</h1>
        <div id="hintsForm" class="left mt-5">
            <textarea id="hintsText" class="in" placeholder="Gift ideas, preferences, sizes, favorite things…"></textarea>
            <p class="note mt-2">Wishlists are gift-wrapped, not locked up—keep anything private off them. 🎁</p>
            <p id="hintLengthWarning" class="note text-danger mt-2" style="display: none;"></p>
            <button class="btn btn--primary btn--block mt-3" onclick="generateHintLink()">Generate link</button>
        </div>
        <div id="hintLinkDisplay" class="mt-5" style="display: none;"></div>
        <p class="nav"><button class="link" onclick="document.getElementById('hintsSection').style.display='none'; document.getElementById('revealSection').style.display='block';">Back</button></p>
    `;

    document.getElementById('hintsText').addEventListener('input', function() {
        const length = this.value.length;
        const warning = document.getElementById('hintLengthWarning');
        if (length > 1500) {
            warning.style.display = 'block';
            warning.textContent = `Note: ${length} characters may create a long URL.`;
        } else {
            warning.style.display = 'none';
        }
    });
}

export async function generateHintLink() {
    const hintsText = document.getElementById('hintsText').value.trim();
    const recipientName = window.hintRecipientName;
    const salt = window.hintSalt;

    if (!hintsText) {
        alert('Please enter some hints for your Secret Santa!');
        return;
    }

    if (hintsText.length > 2000) {
        if (!confirm('Your hints are very long and may create a URL that doesn\'t work in all browsers or apps. Continue anyway?')) {
            return;
        }
    }

    const hintPassword = simpleHash('pair-' + recipientName + '-' + salt).padStart(6, '0').substring(0, 6);

    const encoded = await encodeHints(hintsText, hintPassword);
    const hintUrl = window.location.origin + window.location.pathname + '#h-' + encoded;

    // The link replaces the form (spec §5.5).
    document.getElementById('hintsForm').style.display = 'none';
    const display = document.getElementById('hintLinkDisplay');
    display.style.display = 'block';
    display.innerHTML = `
        <div class="tint">✓ Link ready</div>
        <div class="left mt-3">
            <input type="text" class="in in--url" value="${escapeHtml(hintUrl)}" readonly id="hint-link-input">
            <button class="btn btn--secondary btn--block mt-3" onclick="copyToClipboard(document.getElementById('hint-link-input').value, this)">Copy link</button>
            <p class="note mt-3">Share it with the group. Whoever has your wishlist password—your Secret Santa—can open it.</p>
        </div>
    `;
}

export function showViewHints(encryptedBytes) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('revealSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    const viewHintsSection = document.getElementById('viewHintsSection');
    viewHintsSection.style.display = 'block';

    window.currentEncryptedBytes = encryptedBytes;

    viewHintsSection.innerHTML = `
        ${STARS_HTML}
        <h1>Wishlist</h1>
        <div id="viewHintsForm" class="mt-5">
            <p class="secondary">Enter the password from your assignment page.</p>
            <input type="text" id="passwordInput" class="in in--password mt-3" placeholder="Password" maxlength="6">
            <button class="btn btn--primary btn--block mt-3" onclick="tryDecodeHintsWithPassword()">Decode</button>
        </div>
        <div id="decodedHints"></div>
        <p class="nav"><button class="link" onclick="location.href=location.pathname">Back</button></p>
    `;
}

export async function tryDecodeHintsWithPassword() {
    const enteredPassword = document.getElementById('passwordInput').value.trim().toLowerCase();
    const encryptedBytes = window.currentEncryptedBytes;

    if (!enteredPassword) {
        alert('Please enter the password!');
        return;
    }

    if (enteredPassword.length < 5 || enteredPassword.length > 6) {
        alert('Password must be 5-6 characters!');
        return;
    }

    const decodedDiv = document.getElementById('decodedHints');

    // Helper function to validate and extract hints from decrypted bytes
    function validateHints(bytes) {
        if (!bytes || bytes.length < 3) return null;

        // CRC16 validation: first 2 bytes are the checksum
        const storedCrc = (bytes[0] << 8) | bytes[1];
        const payload = bytes.slice(2);
        const calculatedCrc = crc16(payload);

        if (storedCrc === calculatedCrc) {
            return bytesToUtf8(payload);
        }

        return null;
    }

    try {
        let hints = null;

        const decryptedBytes = xorDecrypt(encryptedBytes, enteredPassword);
        const decompressed = await decompressBytes(decryptedBytes);
        if (decompressed) {
            hints = validateHints(decompressed);
        }

        // Retained deliberately: a six-character password transcribed by hand
        // may lose a leading zero. This is usability, not legacy compatibility.
        // An earlier plan removed this once base32 passwords made the ambiguity
        // impossible; that format was dropped, so passwords are still typed and
        // this affordance is retained indefinitely.
        if (!hints && enteredPassword.length === 5) {
            const paddedPassword = '0' + enteredPassword;
            const decryptedBytes2 = xorDecrypt(encryptedBytes, paddedPassword);
            const decompressed2 = await decompressBytes(decryptedBytes2);
            if (decompressed2) {
                hints = validateHints(decompressed2);
            }
        }

        if (hints) {
            // The decoded list replaces the form (spec §5.6); on failure the
            // form stays so the password can be retried.
            document.getElementById('viewHintsForm').style.display = 'none';
            decodedDiv.innerHTML = `
                <div class="tint mt-5">✓ Wishlist decoded</div>
                <div class="wishlist-text mt-3">${escapeHtml(hints.trim())}</div>
            `;
        } else {
            decodedDiv.innerHTML = INVALID_PASSWORD_HTML;
        }
    } catch (e) {
        console.error('Decryption error:', e);
        decodedDiv.innerHTML = INVALID_PASSWORD_HTML;
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/templates.test.js test/legacy-removed.test.js`
Expected: PASS, no todo tests remain, 0 failures.

Run: `npm test`
Expected: 0 failures, 0 todo.

Run: `grep -rn 'style="' index.html js/ui/`
Expected: every line printed contains `style="display: none;"` and nothing else in its `style` value.

- [ ] **Step 5: Commit**

```bash
git add js/ui/wishlist.js test/templates.test.js
git commit -m "feat: restyle the wishlist screens; the link and the decoded list replace their forms"
```

---

## After Task 5 (lead, not a worker task)

- Whole-branch review (`final-reviewer`).
- Spec §8.2's browser walk-through is the user's, at the VM URL, after the director rsyncs `index.html`, `css/` and `js/` from this worktree; it is recorded in `docs/superpowers/verification/2026-10-04-visual-system-walkthrough.md`. The lead does not touch the VM and lists the walk-through under "Could not verify" in `done.md`.
