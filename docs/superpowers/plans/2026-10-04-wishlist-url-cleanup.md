# Wishlist URL Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a wishlist link is generated, shorten shop URLs in the text to their canonical ID form and strip tracking parameters from every other URL, show the owner the cleaned text and how many links were shortened.

**Architecture:** A new pure module `js/urls.js` (`tidyUrl`, `tidyUrls`; no DOM, no imports) does all string work. `generateHintLink()` in `js/ui/wishlist.js` calls `tidyUrls` once after the empty-text check, rewrites the textarea when anything changed, encodes the cleaned text, and adds one note line to the link-ready screen. A text-reading guard test pins the wiring.

**Tech Stack:** Plain ES modules, `node:test` via `npm test` (Node 24). No build step, no dependencies.

**Spec:** `docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html`

**Requirements cited:** REQ-SSS-0003 (decomposed by the spec as .1 replace matching URLs before encoding, .2 owner sees cleaned text and a count, .3 everything else unchanged character for character). Consulted, unchanged: REQ-SSS-0004 (nothing fetched), REQ-SSS-0005 (no build step), REQ-SSS-0006 and REQ-SSS-0011 (password and `#h-<name>.<ciphertext>` format untouched), REQ-SSS-0007 (the new string claims nothing about protection).

## Global Constraints

- No dependency, no build step, no `fetch` (REQ-SSS-0004, 0005). `js/urls.js` lives directly under `js/`, not `js/ui/`.
- No change to `js/format.js`, `js/compress.js`, `js/secret.js`, `js/main.js`, `css/styles.css` or `index.html`. No new CSS class, no inline style other than `display: none`.
- Only `generateHintLink` changes in `js/ui/wishlist.js` (plus one import line); inline `onclick` handlers stay as they are; the template string in `showCreateHints` is not touched.
- `test/legacy-removed.test.js` reads `js/ui/wishlist.js` as text: it must contain `enteredPassword.length === 5` exactly once and must not contain `text.startsWith('VALID:')`, `.isLegacy` or `enteredPassword.startsWith('0')`.
- UI copy, exactly: `Shortened N links.` / `Shortened 1 link.` in `<p class="note mt-3">`.
- README copy, exactly: `Shop links in a wishlist are trimmed to their short form so the wishlist link stays short.`
- `npm test` is green at every commit (78/78 at the branch base 21820c4). Commit per task on branch `wishlist-url-cleanup`; do not push; do not merge.

## Review Focus

1. **Non-ASCII or already-percent-encoded text in a URL that survives** (`?q=café`, `%20`, `caf%C3%A9`) — must come back exactly as typed; a `URLSearchParams`/`href` round-trip would re-encode it. Pinned in Task 1 (the `%20`, `café` and `%C3%A9` cases).
2. **A `?` that appears only inside the fragment** (`…/a#section?utm_source=1`) — not a query; the URL is untouched. Pinned in Task 1.
3. **Look-alike hosts** (`amazon.com.evil.example`, `m.media-amazon.com`) and **look-alike parameter names** (`tags`, `reference`, `utm`, `gclid_x`) — left alone. Pinned in Task 1.
4. **URLs in quotes or angle brackets, and an upper-case scheme** — the delimiter stays outside, the URL is still found. Pinned in Task 1.
5. **The wiring passing the original text to the encoder** (cleaned textarea, uncleaned link) — Pinned in Task 2: the guard asserts `encodeHints(tidy.text,`.

## File map

| File | Task | Responsibility |
|---|---|---|
| `js/urls.js` (new) | 1 | `tidyUrl(url)`, `tidyUrls(text)` — spec §2 |
| `test/urls.test.js` (new) | 1 | Unit tests — spec §5.1 |
| `js/ui/wishlist.js` | 2 | `generateHintLink` calls `tidyUrls`, rewrites textarea, shows count — spec §3 |
| `test/wishlist-wiring.test.js` (new) | 2 | Text guard on the wiring — spec §5.2 |
| `README.md` | 2 | One sentence — spec §4 |

---

### Task 1: `js/urls.js` — tidyUrl and tidyUrls

**Files:**
- Create: `js/urls.js`
- Test: `test/urls.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function tidyUrl(url: string): string` and `export function tidyUrls(text: string): { text: string, shortened: number }` from `js/urls.js`. Task 2 imports `tidyUrls` as `import { tidyUrls } from '../urls.js';`.

- [ ] **Step 1: Write the failing test** — create `test/urls.test.js` with exactly this content:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidyUrl, tidyUrls } from '../js/urls.js';

// Spec docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2, §5.1.

const SHOPS = [
  ['Amazon .com, slug and ref path',
    'https://www.amazon.com/LEGO-Icons-Botanical-Collection-10311/dp/B09HQXYZ12/ref=sr_1_3?crid=2X9Q&keywords=lego+orchid&qid=1700000000&sr=8-3&th=1&psc=1',
    'https://www.amazon.com/dp/B09HQXYZ12'],
  ['Amazon .co.uk, gp/product',
    'https://www.amazon.co.uk/gp/product/B07ABCDE12?pf_rd_r=XYZ&utm_source=newsletter&th=1',
    'https://www.amazon.co.uk/dp/B07ABCDE12'],
  ['Amazon gp/aw/d (mobile)',
    'https://www.amazon.de/gp/aw/d/B0C1234567?psc=1&ref_=ast_sto_dp',
    'https://www.amazon.de/dp/B0C1234567'],
  ['Etsy',
    'https://www.etsy.com/listing/1234567890/personalised-leather-wallet-mens-gift?click_key=abc123&ref=hp_rv-1&utm_campaign=x',
    'https://www.etsy.com/listing/1234567890'],
  ['Etsy with a /uk/ locale segment',
    'https://www.etsy.com/uk/listing/987654321/hand-knitted-scarf?ref=shop_home_active_1',
    'https://www.etsy.com/listing/987654321'],
  ['eBay .com, slug',
    'https://www.ebay.com/itm/Vintage-Polaroid-SX-70-Camera/394812345678?hash=item5bed&_trkparms=amclksrc%3DITM&utm_medium=email',
    'https://www.ebay.com/itm/394812345678'],
  ['eBay .co.uk, no slug',
    'https://www.ebay.co.uk/itm/204512345678?mkcid=16&mkevt=1',
    'https://www.ebay.co.uk/itm/204512345678'],
  ['Walmart',
    'https://www.walmart.com/ip/Instant-Pot-Duo-7-in-1-Electric-Pressure-Cooker/345678901?athbdg=L1600&from=/search&utm_source=x',
    'https://www.walmart.com/ip/345678901'],
  ['Target',
    'https://www.target.com/p/stanley-40oz-quencher-h2-0-tumbler/-/A-87654321?preselect=12345678#lnk=sametab',
    'https://www.target.com/p/-/A-87654321'],
  ['Best Buy',
    'https://www.bestbuy.com/site/sony-wh-1000xm5-wireless-headphones-black/6505727.p?skuId=6505727&utm_campaign=gift',
    'https://www.bestbuy.com/site/6505727.p'],
];

for (const [name, long, short] of SHOPS) {
  test(`shop rule: ${name}`, () => {
    assert.equal(tidyUrl(long), short);
  });
}

test('generic host: tracking parameters go, others and the fragment stay', () => {
  assert.equal(
    tidyUrl('https://shop.example.com/item?variant=3&utm_source=x&fbclid=y#reviews'),
    'https://shop.example.com/item?variant=3#reviews');
});

test('generic host: every listed parameter name is removed', () => {
  const names = ['utm_anything', 'ref', 'ref_', 'tag', 'fbclid', 'gclid', 'msclkid',
    'mc_cid', 'mc_eid', '_ga', 'igshid'];
  const query = names.map(n => `${n}=1`).join('&');
  assert.equal(tidyUrl(`https://blog.example.org/post?${query}`), 'https://blog.example.org/post');
});

test('generic host: a percent-encoded tracking name is recognised', () => {
  assert.equal(tidyUrl('https://x.example/a?%75tm_source=1&keep=2'), 'https://x.example/a?keep=2');
});

test('generic host: names that merely resemble tracking names stay', () => {
  const url = 'https://x.example/a?tags=1&reference=2&utm=3&gclid_x=4';
  assert.equal(tidyUrl(url), url);
});

test('generic host: an emptied query drops its ?, fragment kept', () => {
  assert.equal(tidyUrl('https://x.example/a?utm_source=1#top'), 'https://x.example/a#top');
});

test('generic host: a ? inside the fragment is not a query', () => {
  const url = 'https://x.example/a#section?utm_source=1';
  assert.equal(tidyUrl(url), url);
});

const UNCHANGED = [
  'https://example.com',
  'https://Example.com/x',
  'https://example.com/./a/../b',
  'https://shop.example.com/item?size=M',
  'https://a.co/d/abc123',
  'https://amzn.to/3xYzAbC',
  'https://m.media-amazon.com/images/I/x.jpg',
  'https://amazon.com.evil.example/dp/B0ABCDEFGH',
  'https://www.amazon.com/dp/B0ABCDEFGH',
  'https://www.etsy.com/listing/123',
  'https://www.target.com/p/-/A-87654321',
  'mailto:santa@example.com',
  'ftp://files.example.com/list.txt?utm_source=x',
  'https://',
  'not a url',
  'http://www.amazon.com/dp/b0abcdefgh',
  'https://x.example/caf%C3%A9?q=%E2%9C%93',
];

for (const url of UNCHANGED) {
  test(`unchanged, byte-identical: ${url}`, () => {
    assert.equal(tidyUrl(url), url);
  });
}

test('a surviving %20 stays as written', () => {
  assert.equal(tidyUrl('https://shop.example.com/a?q=a%20b&utm_z=1'), 'https://shop.example.com/a?q=a%20b');
});

test('non-ASCII text in a kept query value stays as written', () => {
  assert.equal(tidyUrl('https://x.example/s?q=café&utm_source=1'), 'https://x.example/s?q=café');
});

test('Amazon URL with no ASIN loses only its tracking parameter', () => {
  assert.equal(tidyUrl('https://www.amazon.com/s?k=lego+orchid&ref=nb_sb_noss'),
    'https://www.amazon.com/s?k=lego+orchid');
});

test('shop-rule hit keeps scheme and www as written, host lower-cased', () => {
  assert.equal(tidyUrl('http://amazon.com/dp/B0ABCDEFGH?tag=x'), 'http://amazon.com/dp/B0ABCDEFGH');
  assert.equal(tidyUrl('https://WWW.Amazon.COM/dp/B0ABCDEFGH?tag=x'), 'https://www.amazon.com/dp/B0ABCDEFGH');
});

test('tidyUrl is idempotent', () => {
  for (const [, long] of SHOPS) assert.equal(tidyUrl(tidyUrl(long)), tidyUrl(long));
  const generic = 'https://shop.example.com/item?variant=3&utm_source=x#r';
  assert.equal(tidyUrl(tidyUrl(generic)), tidyUrl(generic));
});

test('tidyUrls: upper-case scheme is found and cleaned', () => {
  assert.deepEqual(tidyUrls('HTTPS://WWW.AMAZON.COM/dp/B0ABCDEFGH?tag=x'),
    { text: 'https://www.amazon.com/dp/B0ABCDEFGH', shortened: 1 });
});

test('tidyUrls: two shop URLs among prose; prose byte-identical', () => {
  const text = '- Orchid set: https://www.amazon.com/LEGO/dp/B09HQXYZ12/ref=sr_1_3?th=1\n'
    + '- Wallet  (brown, not black) — https://www.etsy.com/listing/1234567890/wallet?ref=hp\n'
    + '- Socks, size 10–12 ✓';
  assert.deepEqual(tidyUrls(text), {
    text: '- Orchid set: https://www.amazon.com/dp/B09HQXYZ12\n'
      + '- Wallet  (brown, not black) — https://www.etsy.com/listing/1234567890\n'
      + '- Socks, size 10–12 ✓',
    shortened: 2,
  });
});

test('tidyUrls: trailing full stop stays outside the URL', () => {
  assert.deepEqual(tidyUrls('Get this: https://www.amazon.com/x/dp/B0ABCDEFGH?th=1.'),
    { text: 'Get this: https://www.amazon.com/dp/B0ABCDEFGH.', shortened: 1 });
});

test('tidyUrls: URL wrapped in parentheses keeps them', () => {
  assert.deepEqual(tidyUrls('a scarf (https://www.etsy.com/listing/123/slug?ref=x) please'),
    { text: 'a scarf (https://www.etsy.com/listing/123) please', shortened: 1 });
});

test('tidyUrls: "(…)." keeps both the ) and the .', () => {
  assert.deepEqual(tidyUrls('(https://www.etsy.com/listing/123/slug?ref=x).'),
    { text: '(https://www.etsy.com/listing/123).', shortened: 1 });
});

test('tidyUrls: a Wikipedia-style URL keeps its balanced )', () => {
  const text = 'see https://en.wikipedia.org/wiki/Heat_(1995_film)?utm_source=x';
  assert.deepEqual(tidyUrls(text),
    { text: 'see https://en.wikipedia.org/wiki/Heat_(1995_film)', shortened: 1 });
  const plain = 'see https://en.wikipedia.org/wiki/Heat_(1995_film).';
  assert.deepEqual(tidyUrls(plain), { text: plain, shortened: 0 });
});

test('tidyUrls: the same URL pasted twice counts twice', () => {
  const url = 'https://www.amazon.com/x/dp/B0ABCDEFGH?th=1';
  assert.deepEqual(tidyUrls(`${url}\n${url}`), {
    text: 'https://www.amazon.com/dp/B0ABCDEFGH\nhttps://www.amazon.com/dp/B0ABCDEFGH',
    shortened: 2,
  });
});

test('tidyUrls: an unchanged URL is not counted', () => {
  const text = 'size M: https://shop.example.com/item?size=M and https://a.co/d/abc123';
  assert.deepEqual(tidyUrls(text), { text, shortened: 0 });
});

test('tidyUrls: text with no URL comes back as is', () => {
  const text = '  Books!  Anything by Le Guin; socks (wool).\n\nhttp:// alone, https://';
  assert.deepEqual(tidyUrls(text), { text, shortened: 0 });
});

test('tidyUrls: quotes and angle brackets end a URL', () => {
  assert.deepEqual(tidyUrls('<https://x.example/a?utm_source=1> "https://x.example/b?fbclid=2"'),
    { text: '<https://x.example/a> "https://x.example/b"', shortened: 2 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/urls.test.js`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `js/urls.js`.

- [ ] **Step 3: Write the implementation** — create `js/urls.js` with exactly this content:

```js
// Shop-URL cleanup for wishlists (REQ-SSS-0003.1, .3; spec
// docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2).
// Pure string work: no DOM, no imports, nothing fetched (REQ-SSS-0004).

// Query parameters removed from any URL: these exact names, plus any name
// starting utm_.
const TRACKING = new Set(['ref', 'ref_', 'tag', 'fbclid', 'gclid', 'msclkid',
  'mc_cid', 'mc_eid', '_ga', 'igshid']);

// "Any TLD": at most one label before the brand, one or two short labels
// after it — www.amazon.co.uk matches, media-amazon.com does not.
const anyTld = brand =>
  new RegExp(`^(?:[a-z0-9-]+\\.)?${brand}\\.[a-z]{2,3}(?:\\.[a-z]{2})?$`);
const AMAZON = anyTld('amazon');
const EBAY = anyTld('ebay');
const bare = domain => host => host === domain || host === 'www.' + domain;

// First matching row wins. `id` is applied to url.pathname; its first group
// goes into `path`.
const SHOPS = [
  { host: h => AMAZON.test(h),
    id: /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Za-z0-9])/,
    path: id => `/dp/${id}` },
  { host: bare('etsy.com'), id: /\/listing\/(\d+)/, path: id => `/listing/${id}` },
  { host: h => EBAY.test(h), id: /\/itm\/(?:[^/]+\/)?(\d{9,15})/, path: id => `/itm/${id}` },
  { host: bare('walmart.com'), id: /\/ip\/(?:[^/]+\/)?(\d+)/, path: id => `/ip/${id}` },
  { host: bare('target.com'), id: /\/p\/(?:[^/]+\/)?-\/A-(\d+)/, path: id => `/p/-/A-${id}` },
  { host: bare('bestbuy.com'), id: /\/site\/(?:[^/]+\/)?(\d+)\.p/, path: id => `/site/${id}.p` },
];

function isTracking(pair) {
  const raw = pair.split('=')[0];
  let name;
  try { name = decodeURIComponent(raw); } catch { name = raw; }
  return name.startsWith('utm_') || TRACKING.has(name);
}

// Removes tracking pairs from the query as written in `url`, leaving every
// other character alone. Returns `url` itself when nothing is removed.
function stripTracking(url) {
  const hash = url.indexOf('#');
  const end = hash === -1 ? url.length : hash;
  const q = url.indexOf('?');
  if (q === -1 || q > end) return url;
  const pairs = url.slice(q + 1, end).split('&');
  const kept = pairs.filter(pair => !isTracking(pair));
  if (kept.length === pairs.length) return url;
  const query = kept.length ? '?' + kept.join('&') : '';
  return url.slice(0, q) + query + url.slice(end);
}

export function tidyUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return url; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url;
  for (const shop of SHOPS) {
    if (!shop.host(parsed.hostname)) continue;
    const m = shop.id.exec(parsed.pathname);
    if (m) return parsed.origin + shop.path(m[1]);
    break; // a shop host without an ID in its path gets the generic rule
  }
  return stripTracking(url);
}

const URL_RUN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING = new Set(['.', ',', ';', ':', '!', '?', "'", '"']);
const count = (s, ch) => s.split(ch).length - 1;

// Peels sentence punctuation off the end of a matched run. A ")" goes only
// while the run holds more ")" than "(", so a Wikipedia-style "_(film)" keeps it.
function peel(run) {
  let end = run.length;
  while (end > 0) {
    const c = run[end - 1];
    const body = run.slice(0, end);
    if (TRAILING.has(c) || (c === ')' && count(body, ')') > count(body, '('))) end--;
    else break;
  }
  return end;
}

export function tidyUrls(text) {
  let shortened = 0;
  const out = text.replace(URL_RUN, run => {
    const end = peel(run);
    const url = run.slice(0, end);
    const tidied = tidyUrl(url);
    if (tidied !== url) shortened++;
    return tidied + run.slice(end);
  });
  return { text: out, shortened };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/urls.test.js` — Expected: 48 pass, 0 fail.
Run: `npm test` — Expected: 126 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add js/urls.js test/urls.test.js
git commit -m "feat: js/urls.js trims shop URLs to their short form and strips tracking parameters"
```

---

### Task 2: Wire `tidyUrls` into `generateHintLink`, guard test, README

**Files:**
- Modify: `js/ui/wishlist.js` (imports at lines 5-9; `generateHintLink` at lines 50-86)
- Create: `test/wishlist-wiring.test.js`
- Modify: `README.md:11`

**Interfaces:**
- Consumes: `tidyUrls(text) -> { text, shortened }` from `js/urls.js` (Task 1).
- Produces: nothing later tasks use.

- [ ] **Step 1: Write the failing guard test** — create `test/wishlist-wiring.test.js` with exactly this content:

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/wishlist-wiring.test.js`
Expected: 2 tests, both FAIL (no import; `tidyUrls(` not found).

- [ ] **Step 3: Edit `js/ui/wishlist.js`** — four edits, nothing else in the file changes.

3a. After the line `import { bytesToUtf8 } from '../codec.js';` add:

```js
import { tidyUrls } from '../urls.js';
```

3b. Replace the line `    if (hintsText.length > 2000) {` with:

```js
    // Shop links are cut to their short form before encoding, and the owner
    // sees the cleaned text in the textarea (REQ-SSS-0003.1, .2).
    const tidy = tidyUrls(hintsText);
    if (tidy.shortened > 0) {
        const textarea = document.getElementById('hintsText');
        textarea.value = tidy.text;
        textarea.dispatchEvent(new Event('input'));
    }

    if (tidy.text.length > 2000) {
```

(The confirm body and its `return` below stay as they are.)

3c. Replace `const encoded = await encodeHints(hintsText, hintPassword);` with:

```js
    const encoded = await encodeHints(tidy.text, hintPassword);
```

3d. Immediately before the line `    const display = document.getElementById('hintLinkDisplay');` add:

```js
    const shortenedNote = tidy.shortened > 0
        ? `<p class="note mt-3">Shortened ${tidy.shortened} ${tidy.shortened === 1 ? 'link' : 'links'}.</p>`
        : '';
```

and in the template below it, immediately after the line ending `Whoever has your wishlist password—your Secret Santa—can open it.</p>`, add a line (12 spaces of indent, matching its neighbour):

```
            ${shortenedNote}
```

The resulting diff of `js/ui/wishlist.js` must be exactly:

```diff
@@ -7,6 +7,7 @@ import { encodeHints, encodeHintName } from '../format.js';
 import { simpleHash, crc16, xorDecrypt } from '../secret.js';
 import { decompressBytes } from '../compress.js';
 import { bytesToUtf8 } from '../codec.js';
+import { tidyUrls } from '../urls.js';
 
 const INVALID_PASSWORD_HTML = `
             <div class="tint tint--danger note mt-3">Invalid password. Only the assigned Secret Santa has the correct password.</div>
@@ -57,7 +58,16 @@ export async function generateHintLink() {
         return;
     }
 
-    if (hintsText.length > 2000) {
+    // Shop links are cut to their short form before encoding, and the owner
+    // sees the cleaned text in the textarea (REQ-SSS-0003.1, .2).
+    const tidy = tidyUrls(hintsText);
+    if (tidy.shortened > 0) {
+        const textarea = document.getElementById('hintsText');
+        textarea.value = tidy.text;
+        textarea.dispatchEvent(new Event('input'));
+    }
+
+    if (tidy.text.length > 2000) {
         if (!confirm('Your hints are very long and may create a URL that doesn\'t work in all browsers or apps. Continue anyway?')) {
             return;
         }
@@ -65,13 +75,16 @@ export async function generateHintLink() {
 
     const hintPassword = simpleHash('pair-' + recipientName + '-' + salt).padStart(6, '0').substring(0, 6);
 
-    const encoded = await encodeHints(hintsText, hintPassword);
+    const encoded = await encodeHints(tidy.text, hintPassword);
     // The owner's name rides in front of the ciphertext (REQ-SSS-0011).
     const hintUrl = window.location.origin + window.location.pathname + '#h-' + encodeHintName(recipientName) + '.' + encoded;
 
     // The link replaces the form (spec §5.5). The form is only hidden, so
     // Back on the link screen restores it with the text still in place.
     document.getElementById('hintsForm').style.display = 'none';
+    const shortenedNote = tidy.shortened > 0
+        ? `<p class="note mt-3">Shortened ${tidy.shortened} ${tidy.shortened === 1 ? 'link' : 'links'}.</p>`
+        : '';
     const display = document.getElementById('hintLinkDisplay');
     display.style.display = 'block';
     display.innerHTML = `
@@ -80,6 +93,7 @@ export async function generateHintLink() {
             <input type="text" class="in in--url" value="${escapeHtml(hintUrl)}" readonly id="hint-link-input">
             <button class="btn btn--secondary btn--block mt-3" onclick="copyToClipboard(document.getElementById('hint-link-input').value, this)">Copy link</button>
             <p class="note mt-3">Share it with the group. Whoever has your wishlist password—your Secret Santa—can open it.</p>
+            ${shortenedNote}
         </div>
         <p class="nav"><button class="link" onclick="document.getElementById('hintLinkDisplay').style.display='none'; document.getElementById('hintsForm').style.display='';">Back</button></p>
     `;
```

- [ ] **Step 4: Edit `README.md` line 11** — replace

```
4. Wishlists are optional — each person can create one for their Santa
```

with

```
4. Wishlists are optional — each person can create one for their Santa. Shop links in a wishlist are trimmed to their short form so the wishlist link stays short.
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/wishlist-wiring.test.js` — Expected: 2 pass.
Run: `npm test` — Expected: 128 pass, 0 fail (this includes `test/templates.test.js`, which checks the new `<p>` uses only styled classes and no inline style, and `test/legacy-removed.test.js`).
Run: `git diff --stat HEAD` — Expected: only `README.md`, `js/ui/wishlist.js`, `test/wishlist-wiring.test.js`.

- [ ] **Step 6: Commit**

```bash
git add js/ui/wishlist.js test/wishlist-wiring.test.js README.md
git commit -m "feat: generating a wishlist link trims its shop URLs and says how many"
```

---

## Not in this plan

Spec §6's manual check is the director's, on the VM copy after merge. Spec §8's out-of-scope items (alphabet spike, dictionary compression, short domain, cleaning on paste, expanding short links, threshold changes) are not touched.
