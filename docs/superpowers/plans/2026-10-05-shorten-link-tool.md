# Shorten-a-Link Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate encodes the wishlist text exactly as typed, and a collapsible "Shorten a link (optional)" section under the Generate button shortens one pasted link into a read-only field with a Copy button.

**Architecture:** A new pure module `js/shorten.js` (`shortenLink(input)` → one of four states) wraps `tidyUrl` from the unchanged `js/urls.js` and is unit-tested in node. `js/ui/wishlist.js` drops the automatic `tidyUrls` call from `generateHintLink`, adds a `<details class="tool">` block to the `showCreateHints` template, and a module-level `renderShortener()` maps the state onto the DOM. Four CSS rules style the summary. The tests read the source as text, since this repo has no DOM tests.

**Tech Stack:** Plain ES modules, `node:test` via `npm test` (Node 24). No build step, no dependencies.

**Spec:** `docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html` (prototype: `docs/superpowers/specs/2026-10-04-shorten-link-tool-prototype.html`)

**Requirements cited:** REQ-SSS-0003, decomposed by the spec into 0003.4 (encode the text as typed), 0003.5 (a section titled "Shorten a link", below Generate, closed by default), 0003.6 (one link in, tidyUrl result out with copy), 0003.7 (empty shows nothing; not-URL and unchanged inputs show notes) and 0003.8 (the section and the textarea never touch each other). REQ-SSS-0007, decomposed into 0007.1 (the description and README name the six shops and claim nothing stronger). Consulted, unchanged: REQ-SSS-0004 (no fetch), 0005 (no build step), 0006 and 0011 (password and link format), 0009 (412 px: full-width `.in` and block button), 0010 (no new colour token). The earlier spec's REQ-SSS-0003.1 and 0003.2 are superseded; its 0003.3 stands, cited bare in `js/urls.js` and `test/urls.test.js`.

## Global Constraints

- `js/urls.js` is byte-identical: `git diff main -- js/urls.js` is empty at every commit.
- No dependency, no build step, no `fetch` (REQ-SSS-0004, 0005). No change to `index.html`, `js/main.js`, `js/ui/dom.js`, `js/format.js`, `js/compress.js`, `js/secret.js`, `test/urls.test.js`, `test/templates.test.js`, `test/styles.test.js`.
- In `js/ui/wishlist.js`, only the import line, `showCreateHints`, `generateHintLink` and the new non-exported `renderShortener` change. Inline `onclick` handlers stay as they are. No inline style other than `display: none`, no colour literal, no new class other than `tool`.
- CSS: exactly the four rules of spec §4.3 under one comment line, nothing else in `css/styles.css` changes.
- UI copy, exactly:
  - Title: `Shorten a link <span class="optional">(optional)</span>`
  - Description: `Paste a link to get a shorter one for your wishlist. Product links from Amazon, Etsy, eBay, Walmart, Target and Best Buy are cut down to just the product; other links only lose their tracking tags.`
  - Placeholder: `https://www.amazon.com/…` (U+2026 ellipsis)
  - Button: `Copy short link`
  - notUrl note: `Paste one full link, starting with http.`
  - unchanged note: `That link is already as short as it gets.`
- README line 11 becomes exactly: `4. Wishlists are optional — each person can create one for their Santa. A "Shorten a link" tool on the wishlist page cuts long shop links down to just the product, so you can paste the short one into your wishlist.`
- `test/legacy-removed.test.js` reads `js/ui/wishlist.js` as text; nothing in this plan touches the strings it checks.
- `npm test` is green at every commit (142/142 at the branch base faf70f6). Commit per task on branch `shorten-link-tool`; do not push; do not merge.

## Review Focus

1. **A pasted link with a trailing space or newline** (phone share sheets add them) gives the same short result as the bare link. Pinned in Task 1 (whitespace case).
2. **An upper-case scheme and host** (`HTTPS://WWW.AMAZON.COM/…/dp/…`) is a URL and is shortened, not reported as "starting with http". Pinned in Task 1.
3. **A non-web scheme** (`javascript:alert(1)`, `ftp://…`) shows the http note and never reaches the result field. Pinned in Task 1.
4. **Two links pasted at once** (out of scope per spec §9) must not throw or blank the tool: `shortenLink` returns one of the four states. Pinned in Task 1.
5. **Markup-like text pasted into the field** must not be injected into the page: `renderShortener` writes through `.value` and `.textContent` only. Pinned in Task 3 (no `innerHTML` in its source).

## File map

| File | Task | Responsibility |
|---|---|---|
| `js/shorten.js` (new) | 1 | `shortenLink(input)`, spec §3 |
| `test/shorten.test.js` (new) | 1 | Unit tests, spec §6.1 |
| `js/ui/wishlist.js` | 2, 3 | Generate encodes as typed (§2); section markup and `renderShortener` (§4.1, §4.2) |
| `test/wishlist-wiring.test.js` (rewritten) | 2, 3 | Text guards, spec §6.2 |
| `css/styles.css` | 3 | `details.tool` rules, spec §4.3 |
| `README.md` | 3 | Line 11 sentence, spec §5 |

---

### Task 1: `js/shorten.js`

**Files:**
- Create: `js/shorten.js`
- Test: `test/shorten.test.js`

**Interfaces:**
- Consumes: `tidyUrl(url: string): string` from `js/urls.js`, which returns its input itself when nothing changes and never throws.
- Produces: `export function shortenLink(input: string)` returning `{ state: 'empty' } | { state: 'notUrl' } | { state: 'unchanged' } | { state: 'short', url: string }`. Never throws.

- [ ] **Step 1: Write the failing test**

Create `test/shorten.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortenLink } from '../js/shorten.js';

// Spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3, §6.1.
const LONG_AMAZON = 'https://www.amazon.com/Cozy-Wool-Socks/dp/B0ABCDEFGH/ref=sr_1_3?keywords=socks&tag=abc-20';
const SHORT_AMAZON = 'https://www.amazon.com/dp/B0ABCDEFGH';
const STATES = new Set(['empty', 'notUrl', 'unchanged', 'short']);

test('REQ-SSS-0003.7: empty or blank input is empty', () => {
  assert.deepEqual(shortenLink(''), { state: 'empty' });
  assert.deepEqual(shortenLink('   '), { state: 'empty' });
});

test('REQ-SSS-0003.7: input that is not an http(s) URL is notUrl', () => {
  for (const input of ['socks', 'www.amazon.com/dp/B0ABCDEFGH', 'mailto:a@b.c', 'https://',
                       'javascript:alert(1)', 'ftp://example.com/a']) {
    assert.deepEqual(shortenLink(input), { state: 'notUrl' }, input);
  }
});

test('REQ-SSS-0003.7: a link tidyUrl leaves alone is unchanged', () => {
  for (const input of ['https://example.com/item?size=M', 'https://a.co/d/abc123', SHORT_AMAZON]) {
    assert.deepEqual(shortenLink(input), { state: 'unchanged' }, input);
  }
});

test('REQ-SSS-0003.6: a long Amazon link is cut to the product', () => {
  assert.deepEqual(shortenLink(LONG_AMAZON), { state: 'short', url: SHORT_AMAZON });
});

test('REQ-SSS-0003.6: an Etsy link keeps its variation and loses ref', () => {
  assert.deepEqual(
    shortenLink('https://www.etsy.com/listing/123456789/hand-knit-scarf?ref=x&variation0=1'),
    { state: 'short', url: 'https://www.etsy.com/listing/123456789?variation0=1' });
});

test('REQ-SSS-0003.6: a non-shop link only loses its tracking tags', () => {
  assert.deepEqual(shortenLink('https://example.com/item?utm_source=x&id=7'),
    { state: 'short', url: 'https://example.com/item?id=7' });
});

test('REQ-SSS-0003.6: surrounding whitespace and newlines are ignored', () => {
  assert.deepEqual(shortenLink(`  ${LONG_AMAZON}\n`), { state: 'short', url: SHORT_AMAZON });
});

test('REQ-SSS-0003.6: an upper-case scheme and host is still a link', () => {
  assert.deepEqual(shortenLink('HTTPS://WWW.AMAZON.COM/Cozy/dp/B0ABCDEFGH/ref=x?tag=t'),
    { state: 'short', url: SHORT_AMAZON });
});

test('REQ-SSS-0003.6: a short result is unchanged when fed back in', () => {
  assert.equal(shortenLink(shortenLink(LONG_AMAZON).url).state, 'unchanged');
});

test('REQ-SSS-0003.6: two links pasted at once do not throw', () => {
  const r = shortenLink(`${LONG_AMAZON} https://www.etsy.com/listing/1/x?ref=y`);
  assert.ok(STATES.has(r.state), JSON.stringify(r));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/shorten.test.js`
Expected: FAIL, `Cannot find module` … `js/shorten.js`.

- [ ] **Step 3: Write the implementation**

Create `js/shorten.js`:

```js
import { tidyUrl } from './urls.js';

// The shorten-a-link tool's logic, kept out of js/ui so node can test it
// (spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3).
// string -> { state: 'empty' } | { state: 'notUrl' } | { state: 'unchanged' } | { state: 'short', url: string }
// No scheme is guessed: 'www.amazon.com/dp/…' is notUrl. Never throws.
export function shortenLink(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return { state: 'empty' };
  let parsed;
  try { parsed = new URL(trimmed); } catch { return { state: 'notUrl' }; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { state: 'notUrl' };
  const url = tidyUrl(trimmed);
  return url === trimmed ? { state: 'unchanged' } : { state: 'short', url };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/shorten.test.js && npm test`
Expected: the new file 10/10 pass; the full suite 152/152 pass. `git diff main -- js/urls.js` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add js/shorten.js test/shorten.test.js
git commit -m "feat: shortenLink — one pasted link to a four-state result (REQ-SSS-0003.6, 0003.7)"
```

---

### Task 2: Generate encodes the text as typed

**Files:**
- Modify: `js/ui/wishlist.js:10` (import), `js/ui/wishlist.js:51-100` (`generateHintLink`)
- Test: `test/wishlist-wiring.test.js` (rewritten)

**Interfaces:**
- Consumes: `shortenLink` from `js/shorten.js` (Task 1). Only imported here; Task 3 calls it.
- Produces: `functionText(name)` in `test/wishlist-wiring.test.js`, matching `export function NAME` and `export async function NAME`, which Task 3's tests use.

- [ ] **Step 1: Write the failing test**

Replace the whole of `test/wishlist-wiring.test.js` with:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/wishlist-wiring.test.js`
Expected: FAIL on both tests (the import line still names `tidyUrls`; the body still contains `tidyUrls(` and `encodeHints(tidy.text,`).

- [ ] **Step 3: Change the import line**

In `js/ui/wishlist.js`, replace line 10:

```js
import { tidyUrls } from '../urls.js';
```

with:

```js
import { shortenLink } from '../shorten.js';
```

- [ ] **Step 4: Remove the automatic tidy from `generateHintLink`**

Delete these lines (61-69, including the blank line after the block):

```js
    // Shop links are cut to their short form before encoding, and the owner
    // sees the cleaned text in the textarea (REQ-SSS-0003.1, .2).
    const tidy = tidyUrls(hintsText);
    if (tidy.shortened > 0) {
        const textarea = document.getElementById('hintsText');
        textarea.value = tidy.text;
        textarea.dispatchEvent(new Event('input'));
    }

```

Replace `    if (tidy.text.length > 2000) {` with `    if (hintsText.length > 2000) {`.

Replace `    const encoded = await encodeHints(tidy.text, hintPassword);` with `    const encoded = await encodeHints(hintsText, hintPassword);`.

Delete these lines (the shortened note):

```js
    const shortenedNote = tidy.shortened > 0
        ? `<p class="note mt-3">Shortened ${tidy.shortened} ${tidy.shortened === 1 ? 'link' : 'links'}.</p>`
        : '';
```

and, inside the link-ready template, the line:

```js
            ${shortenedNote}
```

Nothing else in the function changes. Afterwards `generateHintLink` reads:

```js
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
    // The owner's name rides in front of the ciphertext (REQ-SSS-0011).
    const hintUrl = window.location.origin + window.location.pathname + '#h-' + encodeHintName(recipientName) + '.' + encoded;

    // The link replaces the form (spec §5.5). The form is only hidden, so
    // Back on the link screen restores it with the text still in place.
    document.getElementById('hintsForm').style.display = 'none';
    const display = document.getElementById('hintLinkDisplay');
    display.style.display = 'block';
    display.innerHTML = `
        <div class="tint">Link ready</div>
        <div class="left mt-3">
            <input type="text" class="in in--url" value="${escapeHtml(hintUrl)}" readonly id="hint-link-input">
            <button class="btn btn--secondary btn--block mt-3" onclick="copyToClipboard(document.getElementById('hint-link-input').value, this)">Copy link</button>
            <p class="note mt-3">Share it with the group. Whoever has your wishlist password—your Secret Santa—can open it.</p>
        </div>
        <p class="nav"><button class="link" onclick="document.getElementById('hintLinkDisplay').style.display='none'; document.getElementById('hintsForm').style.display='';">Back</button></p>
    `;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/wishlist-wiring.test.js && npm test`
Expected: wiring 2/2 pass; full suite 152/152 pass (Task 1's 152 with the old wiring file's 2 tests replaced by 2 new ones). `git diff main -- js/urls.js` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add js/ui/wishlist.js test/wishlist-wiring.test.js
git commit -m "feat: Generate encodes the wishlist text as typed; no automatic link tidy (REQ-SSS-0003.4)"
```

---

### Task 3: The "Shorten a link" section

**Files:**
- Modify: `js/ui/wishlist.js` (new `renderShortener` above `showCreateHints`; the `showCreateHints` template and listeners)
- Modify: `css/styles.css` (new rule group after `.how-body li + li`, the end of the "How it works" section, ~line 391)
- Modify: `README.md:11`
- Test: `test/wishlist-wiring.test.js` (append)

**Interfaces:**
- Consumes: `shortenLink(input)` → `{ state, url? }` from Task 1 (already imported by Task 2); `functionText(name)` and `source` in the wiring test from Task 2; `copyToClipboard` via the existing window shim, unchanged.
- Produces: DOM ids `shortenIn`, `shortenOut`, `shortenResult`, `shortenNote`; CSS class `tool`.

- [ ] **Step 1: Write the failing tests**

Append to `test/wishlist-wiring.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/wishlist-wiring.test.js`
Expected: the 2 Task 2 tests pass; the 6 new tests FAIL (`<details class="tool">` absent, `renderShortener not found`).

- [ ] **Step 3: Add `renderShortener`**

In `js/ui/wishlist.js`, insert directly above `export function showCreateHints(recipientName, salt) {` (after the `INVALID_PASSWORD_HTML` constant and its blank line):

```js
// The shorten-a-link tool (spec 2026-10-04-shorten-link-tool-design §4.2).
// Reads and writes only the tool's own fields, never #hintsText (REQ-SSS-0003.8).
function renderShortener() {
    const result = shortenLink(document.getElementById('shortenIn').value);
    const box = document.getElementById('shortenResult');
    const note = document.getElementById('shortenNote');
    const notes = {
        notUrl: 'Paste one full link, starting with http.',
        unchanged: 'That link is already as short as it gets.',
    };
    if (result.state === 'short') {
        document.getElementById('shortenOut').value = result.url;
        box.style.display = '';
    } else {
        box.style.display = 'none';
    }
    if (notes[result.state]) {
        note.textContent = notes[result.state];
        note.style.display = '';
    } else {
        note.style.display = 'none';
    }
}

```

- [ ] **Step 4: Add the section to the template and wire it**

In the `showCreateHints` template, between the Generate button line and the `<p class="nav">` Back line, insert (12-space indent, matching the lines around it):

```html
            <hr class="sep">
            <details class="tool">
                <summary><h2 class="section-title">Shorten a link <span class="optional">(optional)</span></h2></summary>
                <p class="note mt-2">Paste a link to get a shorter one for your wishlist. Product links from Amazon, Etsy, eBay, Walmart, Target and Best Buy are cut down to just the product; other links only lose their tracking tags.</p>
                <input type="url" id="shortenIn" class="in mt-3" placeholder="https://www.amazon.com/…" autocomplete="off" spellcheck="false">
                <div id="shortenResult" style="display: none;">
                    <input type="text" id="shortenOut" class="in in--url mt-3" readonly>
                    <button class="btn btn--secondary btn--block mt-3" onclick="copyToClipboard(document.getElementById('shortenOut').value, this)">Copy short link</button>
                </div>
                <p id="shortenNote" class="note mt-2" style="display: none;"></p>
            </details>
```

Then, after the closing `});` of the existing `#hintsText` input listener and before the function's closing `}`, add:

```js

    document.getElementById('shortenIn').addEventListener('input', renderShortener);
```

- [ ] **Step 5: Add the CSS**

In `css/styles.css`, after the rule

```css
.how-body li + li {
    margin-top: var(--s-1);
}
```

insert (one blank line before it):

```css

/* The shorten-a-link tool on the wishlist screen (spec 2026-10-04-shorten-link-tool-design §4.3). */
details.tool summary {
    display: flex;
    align-items: baseline;
    gap: var(--s-2);
    cursor: pointer;
    list-style: none;
}

details.tool summary::-webkit-details-marker {
    display: none;
}

details.tool summary::before {
    content: "▸";
    color: var(--text-3);
    font-family: var(--font-sans);
    font-size: var(--t-note);
}

details.tool[open] summary::before {
    content: "▾";
}
```

- [ ] **Step 6: Update the README**

In `README.md`, replace line 11:

```
4. Wishlists are optional — each person can create one for their Santa. Shop links in a wishlist are trimmed to their short form so the wishlist link stays short.
```

with:

```
4. Wishlists are optional — each person can create one for their Santa. A "Shorten a link" tool on the wishlist page cuts long shop links down to just the product, so you can paste the short one into your wishlist.
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test test/wishlist-wiring.test.js && npm test`
Expected: wiring 8/8 pass; full suite 158/158 pass, including `test/templates.test.js` (`.tool` styled, used, no dead CSS; inline styles only `display: none`) and `test/styles.test.js` (`gap: var(--s-2)`, `font-size: var(--t-note)`, `color: var(--text-3)`).
Run: `git diff main -- js/urls.js index.html js/main.js js/ui/dom.js js/format.js js/compress.js js/secret.js`
Expected: no output.
Run: `grep -c 'Shortened\|tidyUrls' js/ui/wishlist.js`
Expected: `0`.

- [ ] **Step 8: Check it in a browser**

Run: `python3 -m http.server 8765 --bind 127.0.0.1` from the worktree root (in the background), then with a headless browser if one is available (`chromium-browser --headless --screenshot` or Playwright), otherwise skip this step and report that it was skipped. Generate a group, open one assignment link, press "Create your wishlist", and confirm: the closed "▸ Shorten a link (optional)" line sits on one line between Generate and Back; with the section opened, pasting the `LONG_AMAZON` URL from Task 1 shows `https://www.amazon.com/dp/B0ABCDEFGH` in the mono field. Stop the server afterwards. The director's full manual check (spec §7) runs on the VM after merge.

- [ ] **Step 9: Commit**

```bash
git add js/ui/wishlist.js css/styles.css README.md test/wishlist-wiring.test.js
git commit -m "feat: collapsible 'Shorten a link' tool on the wishlist screen (REQ-SSS-0003.5-0003.8, 0007.1)"
```
