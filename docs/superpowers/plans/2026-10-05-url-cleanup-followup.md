# URL Cleanup Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `tidyUrl` cuts Best Buy's current `/product/<slug>/<BSIN>` links to the product, strips a much broader borrowed list of click/affiliate IDs (case-insensitively) on every host plus per-shop tracking names on shop pages without a product ID, fixes three query bugs, loses the dead multi-URL scanner; `shortenLink` reports whitespace-containing input as not a link.

**Architecture:** `js/urls.js` keeps one export, `tidyUrl(url)`. The name lists become data at the top of the file (lower-case strings, `*` suffix = prefix) compiled by one `nameList()` helper used for the generic list and each shop's fall-through list. Shop lookup walks every row of the host and takes the first whose ID pattern matches the written path once (`discardableTail` now returns `{ id, tail }` or `null`). `js/shorten.js` gains one whitespace check before `new URL`.

**Tech Stack:** Plain ES modules, `node:test` via `npm test` (Node 24). No build step, no dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html` (amends `docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html` §2).

**Requirements cited:** REQ-SSS-0003, decomposed by the spec into 0003.9 (Best Buy `/product/` rule), 0003.10 (generic list, names compared lower-cased), 0003.11 (per-shop fall-through lists), 0003.12 (`tidyUrl` the only export), 0003.13 (emptied query loses `?`; a pair with `;` is never removed), 0003.14 (whitespace → notUrl). The earlier specs' 0003.3 (glued text survives) stands and is cited bare. Consulted, unchanged: REQ-SSS-0004 (nothing fetched), 0005 (no build step), 0006 and 0011 (codec and link format), 0007 (tool copy stays as written).

## Global Constraints

- `js/urls.js` exports `tidyUrl(url): string` only; `js/shorten.js` keeps its one export `shortenLink`.
- No dependency, no build step, no `fetch` (REQ-SSS-0004, 0005).
- Files changed by this plan, and no others: `js/urls.js`, `js/shorten.js`, `test/urls.test.js`, `test/shorten.test.js`, new `test/urls-corpus.test.js`, and this plan. No change to `js/ui/*`, `index.html`, `css/styles.css`, `README.md`, or any other file under `test/`.
- The lists of spec §3 and §4 are data at the top of `js/urls.js` with a comment naming the spec; one matcher (`nameList`) serves both.
- Parameter names are compared lower-cased; kept text is never re-cased or re-encoded.
- `npm test` is green at every commit (158/158 at the branch base b79b231). Commit per task on branch `url-cleanup-followup`; do not push; do not merge.

## Review Focus

1. **A link wrapped by a text message, with a line break inside it** — `new URL` silently drops internal newlines and tabs, so without the check it would be "shortened" into something the user never pasted. Expected: notUrl. Pinned in Task 3.
2. **A tracking name that is percent-encoded and upper-case, or has no `=`** (`?%47CLID=1&gclid&Size=M`) — removed like the plain name; `Size=M` stays as written. Pinned in Task 1.
3. **A Best Buy product link with a fragment, extra path after the BSIN, or a non-ASCII slug** — still cut to `/product/<slug>/<BSIN>`, slug byte-for-byte as written. Pinned in Task 1.
4. **One shop's tracking names on another host** (`mpid` on Etsy, `veh` on a blog) — left alone; each shop's list applies only on that shop's host. Pinned in Task 2.
5. **A path whose `..` would resolve to a different product** (`/dp/B0AAAAAAAA/../dp/B0BBBBBBBB`) — the written path is authoritative, one match only, no normalisation. Pinned in Task 1.

## File map

| File | Task | Change |
|---|---|---|
| `js/urls.js` | 1 | Rewritten: lists as data + `nameList`, `junk` on each shop row, second Best Buy row, `discardableTail` → `{ id, tail } \| null`, lower-cased `pairName`, `stripTracking` fixes, multi-row lookup, scanner deleted |
| `js/urls.js` | 2 | The `TRACKING` / `SHOP_COMMON` / `JUNK` block replaced with the full §3/§4 lists |
| `test/urls.test.js` | 1, 2 | Scanner-only tests deleted; Best Buy rows, guard, query, case tests (1); §3 and §4 list tests (2) |
| `test/urls-corpus.test.js` | 2 | New: the §7.1 corpus + idempotence |
| `js/shorten.js`, `test/shorten.test.js` | 3 | Whitespace → notUrl |

Tasks run in order 1 → 2 → 3 (Task 2 edits the block Task 1 writes; Task 3's Best Buy test needs Task 1's row).

---

### Task 1: urls.js — one-match lookup, Best Buy `/product/`, query fixes, lower-cased names, scanner removed

**Files:**
- Modify (full rewrite): `js/urls.js`
- Test: `test/urls.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function tidyUrl(url: string): string` (only export). Inside `js/urls.js`, Task 2 relies on this exact block, which it replaces: the text from the line `// Removed on every host (§3).` up to (not including) the line `// A test for one list of names: exact names, plus prefixes from entries ending in *.` It defines `const TRACKING` (array of strings), `const SHOP_COMMON`, and `const JUNK` with keys `amazon etsy ebay walmart target bestbuy`, each an array of strings; entries ending in `*` are prefixes.

- [ ] **Step 1: Edit `test/urls.test.js`**

(a) Replace the import line

```js
import { tidyUrl, tidyUrls } from '../js/urls.js';
```

with

```js
import { tidyUrl } from '../js/urls.js';
import * as urls from '../js/urls.js';
```

(b) Replace the comment line

```js
// Spec docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2, §5.1.
```

with

```js
// Spec docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2, §5.1,
// amended by docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html §7.2.
```

(c) In the `SHOPS` table, replace the last row and the closing `];`

```js
  ['Best Buy',
    'https://www.bestbuy.com/site/sony-wh-1000xm5-wireless-headphones-black/6505727.p?skuId=6505727&utm_campaign=gift',
    'https://www.bestbuy.com/site/6505727.p'],
];
```

with

```js
  ['Best Buy',
    'https://www.bestbuy.com/site/sony-wh-1000xm5-wireless-headphones-black/6505727.p?skuId=6505727&utm_campaign=gift',
    'https://www.bestbuy.com/site/6505727.p'],
  ['REQ-SSS-0003.9: Best Buy /product/<slug>/<BSIN>, the user\'s link',
    'https://www.bestbuy.com/product/sony-cyber-shot-rx100-vii-20-1-megapixel-digital-camera-black/J7XSRH4KQS?irclickid=U%3AxW%3ARQwtxyZRhcy-WznJwsKUkrwJAwAe26LSg0&irgwc=1&afsrc=1&loc=The%20WireCutter&acampID=&mpid=197432&affgroup=%22Content%22',
    'https://www.bestbuy.com/product/sony-cyber-shot-rx100-vii-20-1-megapixel-digital-camera-black/J7XSRH4KQS'],
  ['REQ-SSS-0003.9: Best Buy /product/<BSIN> with no slug falls to the generic rule',
    'https://www.bestbuy.com/product/J7XSRH4KQS?utm_source=x',
    'https://www.bestbuy.com/product/J7XSRH4KQS'],
];
```

(Task 2 changes `?utm_source=x` in the second new row to `?irgwc=1`, the spec's §7.1 row 3, once `irgwc` is on the list.)

(d) Delete every test that calls `tidyUrls` (REQ-SSS-0003.12; spec §7.2: none is rewritten):
- the contiguous run starting at `test('tidyUrls: upper-case scheme is found and cleaned', () => {` and ending with the closing `}` of the `for (const text of GLUED) {` loop — this includes the ten `tidyUrls:` tests, the comment `// Text glued onto a URL with no space is not part of it and must survive` with its second line, the `const GLUED = [...]` table and its loop;
- the last test in the file, `test('glued text survives while a tracking pair before it still goes', () => {` through its closing `});`.

Keep `test('an ID followed by more ID characters is not an ID', …)` and `test('a non-ASCII slug before the ID still shortens', …)`. Leave exactly one blank line between consecutive tests. After this step `grep -n tidyUrls test/urls.test.js` prints nothing.

(e) Append at the end of the file (after `a non-ASCII slug before the ID still shortens`, one blank line between):

```js
test('REQ-SSS-0003.3: text glued onto a shop URL is not discarded', () => {
  const url = 'https://www.amazon.com/dp/B0ABCDEFGH这个很好';
  assert.equal(tidyUrl(url), url);
});

test('REQ-SSS-0003.9: Best Buy /product/ keeps the slug as written, non-ASCII included', () => {
  assert.equal(tidyUrl('https://www.bestbuy.com/product/caméra-noire/J7XSRH4KQS/sku/123?loc=x'),
    'https://www.bestbuy.com/product/caméra-noire/J7XSRH4KQS');
  assert.equal(tidyUrl('http://bestbuy.com/product/x/J7XSRH4KQS#reviews'),
    'http://bestbuy.com/product/x/J7XSRH4KQS');
});

test('REQ-SSS-0003.9: Best Buy /product/ needs an upper-case 10-character BSIN', () => {
  for (const url of [
    'https://www.bestbuy.com/product/x/j7xsrh4kqs',
    'https://www.bestbuy.com/product/x/J7XSRH4KQ',
    'https://www.bestbuy.com/product/x/J7XSRH4KQSX',
  ]) assert.equal(tidyUrl(url), url);
});

test('REQ-SSS-0003.9: the ID is matched once, on the written path, .. not resolved', () => {
  // The parsed path resolves to /dp/B0BBBBBBBB; the written path names B0AAAAAAAA first.
  assert.equal(tidyUrl('https://www.amazon.com/dp/B0AAAAAAAA/../dp/B0BBBBBBBB'),
    'https://www.amazon.com/dp/B0AAAAAAAA');
  const url = 'https://www.amazon.com/dp/x/../B0ABCDEFGH';
  assert.equal(tidyUrl(url), url);
});

test('REQ-SSS-0003.12: urls.js exports tidyUrl only', () => {
  assert.equal(urls.tidyUrls, undefined);
  assert.deepEqual(Object.keys(urls), ['tidyUrl']);
});

test('REQ-SSS-0003.13: a query left with only empty pairs loses its ?', () => {
  assert.equal(tidyUrl('https://x.example/a?utm_source=1&'), 'https://x.example/a');
  assert.equal(tidyUrl('https://x.example/a?&utm_source=1'), 'https://x.example/a');
  assert.equal(tidyUrl('https://x.example/a?utm_source=1&#top'), 'https://x.example/a#top');
});

test('REQ-SSS-0003.13: otherwise the remaining pairs are re-joined as written, empties included', () => {
  assert.equal(tidyUrl('https://x.example/a?a=1&&utm_source=2'), 'https://x.example/a?a=1&');
  assert.equal(tidyUrl('https://x.example/a?a=1&'), 'https://x.example/a?a=1&');
  assert.equal(tidyUrl('https://x.example/a?'), 'https://x.example/a?');
});

test('REQ-SSS-0003.13: a pair containing ; is never removed', () => {
  assert.equal(tidyUrl('https://x.example/a?utm_source=1;b=2'), 'https://x.example/a?utm_source=1;b=2');
  assert.equal(tidyUrl('https://x.example/a?utm_source=1&c=3;d=4'), 'https://x.example/a?c=3;d=4');
  assert.equal(tidyUrl('https://www.amazon.com/s?k=a&ref=x;y'), 'https://www.amazon.com/s?k=a&ref=x;y');
});

test('REQ-SSS-0003.10: names are compared lower-cased; kept text is not re-cased', () => {
  assert.equal(tidyUrl('https://x.example/a?UTM_Source=1&GCLID=2&Size=M'), 'https://x.example/a?Size=M');
  assert.equal(tidyUrl('https://x.example/a?%47CLID=1&gclid&Size=M'), 'https://x.example/a?Size=M');
  assert.equal(tidyUrl('https://www.amazon.com/s?K=socks&TAG=x-20'), 'https://www.amazon.com/s?K=socks');
  assert.equal(tidyUrl('https://www.etsy.com/listing/123/scarf?Variation0=1&ref=x'),
    'https://www.etsy.com/listing/123?Variation0=1');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/urls.test.js`
Expected: FAIL. Among the failures: `shop rule: REQ-SSS-0003.9: Best Buy /product/<slug>/<BSIN>, the user's link`, `REQ-SSS-0003.12: urls.js exports tidyUrl only`, `REQ-SSS-0003.13: a query left with only empty pairs loses its ?`, `REQ-SSS-0003.13: a pair containing ; is never removed`, `REQ-SSS-0003.10: names are compared lower-cased; kept text is not re-cased`, `REQ-SSS-0003.9: the ID is matched once, on the written path, .. not resolved`. (`REQ-SSS-0003.3: text glued onto a shop URL is not discarded` passes already; it pins existing behaviour.)

- [ ] **Step 3: Replace the whole of `js/urls.js` with**

```js
// Shop-URL cleanup for wishlists (REQ-SSS-0003.3, .9-.13; spec
// docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2 as
// amended by docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html).
// Pure string work: no DOM, no imports, nothing fetched (REQ-SSS-0004).
// One export: tidyUrl(url) -> string.

// Name lists (follow-up spec §3, §4). Lower-case; an entry ending in * is a
// prefix. A query pair's name is lower-cased before it is looked up; the
// pair's text is never changed.

// Removed on every host (§3).
const TRACKING = ['utm_*', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid'];

// Removed on a shop host only when no product ID matched (§4). Every shop
// list includes ref, ref_ and tag (ruling B1 of the 2026-10-04 spec).
const SHOP_COMMON = ['ref', 'ref_', 'tag'];
const JUNK = {
  amazon: SHOP_COMMON,
  etsy: SHOP_COMMON,
  ebay: SHOP_COMMON,
  walmart: SHOP_COMMON,
  target: SHOP_COMMON,
  bestbuy: SHOP_COMMON,
};

// A test for one list of names: exact names, plus prefixes from entries ending in *.
function nameList(entries) {
  const exact = new Set(entries.filter(e => !e.endsWith('*')));
  const prefixes = entries.filter(e => e.endsWith('*')).map(e => e.slice(0, -1));
  return name => exact.has(name) || prefixes.some(p => name.startsWith(p));
}
const isGenericTracking = nameList(TRACKING);

// "Any TLD": at most one label before the brand, one or two short labels
// after it — www.amazon.co.uk matches, media-amazon.com does not.
const anyTld = brand =>
  new RegExp(`^(?:[a-z0-9-]+\\.)?${brand}\\.[a-z]{2,3}(?:\\.[a-z]{2})?$`);
const AMAZON = anyTld('amazon');
const EBAY = anyTld('ebay');
const bare = domain => host => host === domain || host === 'www.' + domain;

// A host may have several rows; the first whose `id` is found in the written
// path wins. `id`'s first group goes into `path`. `keep` names the
// variant-selecting query parameters the short form carries over (ruling B1).
// `junk` is the shop's own list for when no row of the host matched (§4).
const SHOPS = [
  { host: h => AMAZON.test(h),
    id: /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Za-z0-9])/,
    path: id => `/dp/${id}`, keep: [], junk: JUNK.amazon },
  { host: bare('etsy.com'), id: /\/listing\/(\d+)/, path: id => `/listing/${id}`,
    keep: ['variation0', 'variation1'], junk: JUNK.etsy },
  { host: h => EBAY.test(h), id: /\/itm\/(?:[^/]+\/)?(\d{9,15})/, path: id => `/itm/${id}`,
    keep: ['var'], junk: JUNK.ebay },
  { host: bare('walmart.com'), id: /\/ip\/(?:[^/]+\/)?(\d+)/, path: id => `/ip/${id}`,
    keep: [], junk: JUNK.walmart },
  { host: bare('target.com'), id: /\/p\/(?:[^/]+\/)?-\/A-(\d+)/, path: id => `/p/-/A-${id}`,
    keep: ['preselect'], junk: JUNK.target },
  // Best Buy, legacy form first: /site/<slug>/<sku>.p
  { host: bare('bestbuy.com'), id: /\/site\/(?:[^/]+\/)?(\d+)\.p/, path: id => `/site/${id}.p`,
    keep: [], junk: JUNK.bestbuy },
  // Best Buy, current form: /product/<slug>/<BSIN>. Best Buy needs a slug
  // segment but ignores its text, so the slug is kept exactly as written.
  { host: bare('bestbuy.com'), id: /\/product\/([^/?#]+\/[A-Z0-9]{10})(?![A-Za-z0-9])/,
    path: id => `/product/${id}`, keep: [], junk: JUNK.bestbuy },
];

// Characters a URL can hold as written: RFC 3986's unreserved and reserved
// sets, plus %. Anything else (CJK text, full-width punctuation), or a second
// scheme, means the text is not part of this URL. That text must survive
// (REQ-SSS-0003.3), so no rule may discard it.
const URL_CHARS = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/;
const foreign = s => !URL_CHARS.test(s) || /https?:\/\//i.test(s);

// The shop ID in `url` as written, or null. The pattern runs once, on the
// written path (the URL up to the first ? or #); `.` and `..` segments are not
// resolved. What follows the match must be empty or the rest of a URL —
// starting /, ? or # with nothing foreign in it — or nothing may be dropped.
function discardableTail(url, idPattern) {
  const pathEnd = url.search(/[?#]/);
  const m = idPattern.exec(pathEnd === -1 ? url : url.slice(0, pathEnd));
  if (!m) return null;
  const tail = url.slice(m.index + m[0].length);
  if (tail !== '' && (!/^[/?#]/.test(tail) || foreign(tail))) return null;
  return { id: m[1], tail };
}

// A pair's name: the part before the first =, percent-decoded where
// possible, lower-cased.
function pairName(pair) {
  const raw = pair.split('=')[0];
  let name;
  try { name = decodeURIComponent(raw); } catch { name = raw; }
  return name.toLowerCase();
}

// The query of `url` as written: where its ? sits, where it ends (the # or
// the end of the string), and its &-separated pairs. Null when there is none.
function queryOf(url) {
  const hash = url.indexOf('#');
  const end = hash === -1 ? url.length : hash;
  const q = url.indexOf('?');
  if (q === -1 || q > end) return null;
  return { q, end, pairs: url.slice(q + 1, end).split('&') };
}

// `shopJunk` is the host's own name test (§4), or null off the shop hosts.
function isTracking(pair, shopJunk) {
  const name = pairName(pair);
  return isGenericTracking(name) || (shopJunk !== null && shopJunk(name));
}

// Removes tracking pairs from the query as written in `url`, leaving every
// other character alone. A pair holding foreign text or a ; is never removed.
// When only empty pairs remain, the ? goes too. Returns `url` itself when
// nothing is removed.
function stripTracking(url, shopJunk) {
  const query = queryOf(url);
  if (!query) return url;
  const { q, end, pairs } = query;
  const kept = pairs.filter(pair =>
    !isTracking(pair, shopJunk) || foreign(pair) || pair.includes(';'));
  if (kept.length === pairs.length) return url;
  const rest = kept.some(pair => pair !== '') ? '?' + kept.join('&') : '';
  return url.slice(0, q) + rest + url.slice(end);
}

// The `keep` pairs of the query as written, in order and spelling, as a
// query string ('' when there are none).
function keptQuery(url, keep) {
  const query = queryOf(url);
  const kept = query ? query.pairs.filter(pair => keep.includes(pairName(pair))) : [];
  return kept.length ? '?' + kept.join('&') : '';
}

export function tidyUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return url; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url;
  const rows = SHOPS.filter(row => row.host(parsed.hostname));
  for (const row of rows) {
    const hit = discardableTail(url, row.id);
    if (hit) return parsed.origin + row.path(hit.id) + keptQuery(url, row.keep);
  }
  // The generic rule, plus the shop's own list on a shop host.
  const shopJunk = rows.length ? nameList(rows.flatMap(row => row.junk)) : null;
  return stripTracking(url, shopJunk);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/urls.test.js` — Expected: PASS, 56 tests, 0 fail.
Run: `npm test` — Expected: PASS, 152 tests, 0 fail.
Run: `grep -rn "tidyUrls\|URL_RUN\|TRAILING\|peel\|SHOP_TRACKING" js test` — Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add js/urls.js test/urls.test.js
git commit -m "feat: Best Buy /product/ rule, one-match shop lookup, query fixes, case-insensitive names; remove the unused tidyUrls scanner (REQ-SSS-0003.9, 0003.12, 0003.13)"
```

---

### Task 2: the borrowed strip lists and the link corpus

**Files:**
- Modify: `js/urls.js` (the list block only)
- Modify: `test/urls.test.js`
- Create: `test/urls-corpus.test.js`

**Interfaces:**
- Consumes: from Task 1, `tidyUrl` and, inside `js/urls.js`, the block from `// Removed on every host (§3).` up to (not including) `// A test for one list of names: exact names, plus prefixes from entries ending in *.`, defining `TRACKING`, `SHOP_COMMON`, `JUNK` (keys `amazon etsy ebay walmart target bestbuy`). `nameList`, the `SHOPS` rows (`junk: JUNK.<shop>`) and everything below stay as Task 1 wrote them.
- Produces: nothing new; the export stays `tidyUrl` only.

- [ ] **Step 1: Edit `test/urls.test.js`**

(a) In the `SHOPS` table, in the row `'REQ-SSS-0003.9: Best Buy /product/<BSIN> with no slug falls to the generic rule'`, replace

```js
    'https://www.bestbuy.com/product/J7XSRH4KQS?utm_source=x',
```

with

```js
    'https://www.bestbuy.com/product/J7XSRH4KQS?irgwc=1',
```

(b) Replace the whole test

```js
test('generic host: every listed parameter name is removed', () => {
  const names = ['utm_anything', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid'];
  const query = names.map(n => `${n}=1`).join('&');
  assert.equal(tidyUrl(`https://blog.example.org/post?${query}`), 'https://blog.example.org/post');
});
```

with

```js
// The follow-up spec's §3 list, copied here on purpose: drift between the
// spec and js/urls.js shows up as a failure (REQ-SSS-0003.10).
const GENERIC_NAMES = [
  'utm_anything',
  'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid',
  'dclid', 'wbraid', 'gbraid', 'yclid', 'ysclid', 'twclid', 'wickedid', '_hsenc', '__hssc',
  '__hstc', '__hsfp', 'hsctatracking', 'oly_anon_id', 'oly_enc_id', '__s', 'vero_id', 'mkt_tok',
  'gclsrc', 'gad_source', 'gad_campaignid', 'srsltid', 'ttclid', 'fbadid', '_gl', '_hsmi',
  'vero_conv', '_openstat', '_branch_match_id', '_branch_referrer',
  'irclickid', 'irgwc', 'ir_campaignid', 'ir_adid', 'ir_partnerid', 'sharedid', 'subid1',
  'subid2', 'subid3', 'afsrc', 'clickid', 'clkid', 'cjevent', 'cjdata', 'sscid', 'awc',
  'ranmid', 'raneaid', 'ransiteid',
];

test('generic host: every listed parameter name is removed', () => {
  const query = GENERIC_NAMES.map(n => `${n}=1`).join('&');
  assert.equal(tidyUrl(`https://blog.example.org/post?${query}`), 'https://blog.example.org/post');
});

test('REQ-SSS-0003.10: each §3 name is removed on any host, lower- and upper-cased', () => {
  for (const name of GENERIC_NAMES) {
    for (const n of [name, name.toUpperCase()]) {
      assert.equal(tidyUrl(`https://x.example/a?${n}=1&keep=2`), 'https://x.example/a?keep=2', n);
    }
  }
});

test('REQ-SSS-0003.10: content names stay on a generic host', () => {
  const url = 'https://x.example/a?id=1&loc=uk&q=2&k=3&keywords=4&si=5&ref=6&ref_=7&tag=8'
    + '&from=9&hash=10&campaign_id=11&source=12';
  assert.equal(tidyUrl(url), url);
});
```

(c) Append at the end of the file (one blank line before):

```js
// The follow-up spec's §4 lists, copied here on purpose; a prefix entry (*)
// appears as one concrete name. `keep` is the content the page needs.
const FALL_THROUGH = [
  ['Amazon', 'https://www.amazon.com/s',
    ['linkcode', 'ascsubtag', 'crid', 'sprefix', 'qid', 'sr', 'dib', 'dib_tag', 'th', 'psc',
      'pd_rd_w', 'pf_rd_p'],
    'k=1&keywords=2&node=3&rh=4&i=5',
    'https://www.amazon.com/Sony/dp/B07VGB9B5R', 'https://www.amazon.com/dp/B07VGB9B5R'],
  ['Etsy', 'https://www.etsy.com/search',
    ['click_key', 'click_sum', 'ga_order', 'ga_search_type', 'ga_view_type', 'ga_search_query',
      'frs', 'sts', 'organic_search_click', 'pro', 'content_source'],
    'q=1&section_id=2&explicit=3',
    'https://www.etsy.com/listing/4356277139/shawl', 'https://www.etsy.com/listing/4356277139'],
  ['eBay', 'https://www.ebay.com/sch/i.html',
    ['mkevt', 'mkcid', 'mkrid', 'campid', 'toolid', 'customid', 'siteid', 'mkgroupid', 'mkcrid',
      'hash', 'amdata', '_trkparms', '_trksid', 'itmmeta'],
    '_nkw=1&_sacat=2&epid=3&var=4',
    'https://www.ebay.com/itm/197949520578', 'https://www.ebay.com/itm/197949520578'],
  ['Walmart', 'https://www.walmart.com/search',
    ['from', 'wmlspartner', 'adid', 'veh', 'sourceid', 'affiliates_ad_id', 'campaign_id',
      'athbdg', 'wl12'],
    'q=1&cat_id=2&selectedsellerid=3',
    'https://www.walmart.com/ip/LEGO/5429704737', 'https://www.walmart.com/ip/5429704737'],
  ['Target', 'https://www.target.com/s',
    ['afid', 'cpng', 'lnm', 'lid', 'dfa', 'fndsrc', 'adgroup', 'network', 'device', 'location',
      'targetid', 'ds_rl', 'clkid'],
    'searchterm=1&category=2',
    'https://www.target.com/p/game/-/A-1004023797', 'https://www.target.com/p/-/A-1004023797'],
  ['Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp',
    ['mpid', 'acampid', 'affgroup', 'loc'],
    'st=1&id=2&skuid=3',
    'https://www.bestbuy.com/product/x/J7XSRH4KQS', 'https://www.bestbuy.com/product/x/J7XSRH4KQS'],
];

for (const [shop, page, junk, keep, product, short] of FALL_THROUGH) {
  const query = [...junk, 'ref', 'ref_', 'tag'].map(n => `${n}=x`).join('&');
  test(`REQ-SSS-0003.11: ${shop} with no product ID loses its own tracking names only`, () => {
    assert.equal(tidyUrl(`${page}?${keep}&${query}`), `${page}?${keep}`);
  });
  test(`REQ-SSS-0003.11: ${shop} with a product ID takes the short form regardless`, () => {
    assert.equal(tidyUrl(`${product}?${query}`), short);
  });
}

test('REQ-SSS-0003.11: a shop\'s own names stay off other hosts and other shops', () => {
  for (const url of [
    'https://x.example/a?mpid=1&veh=2&cpng=3&mkevt=4&crid=5&click_key=6&wl1=7&athbdg=8&pd_rd_w=9',
    'https://www.etsy.com/search?q=1&mpid=2&veh=3',
  ]) assert.equal(tidyUrl(url), url);
});
```

- [ ] **Step 2: Create `test/urls-corpus.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidyUrl } from '../js/urls.js';

// Real or documentation-shaped links through tidyUrl, spec
// docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html §7.1.
// [name, input, expected]; expected === input means "left as written".

const BESTBUY_SLUG = 'sony-cyber-shot-rx100-vii-20-1-megapixel-digital-camera-black';
const BESTBUY_SHORT = `https://www.bestbuy.com/product/${BESTBUY_SLUG}/J7XSRH4KQS`;

const CORPUS = [
  ['REQ-SSS-0003.9: Best Buy /product/, the user\'s Impact link',
    `${BESTBUY_SHORT}?irclickid=U%3AxW%3ARQwtxyZRhcy-WznJwsKUkrwJAwAe26LSg0&irgwc=1&afsrc=1&loc=The%20WireCutter&acampID=&mpid=197432&affgroup=%22Content%22`,
    BESTBUY_SHORT],
  ['REQ-SSS-0003.9: Best Buy /product/, already short',
    BESTBUY_SHORT, BESTBUY_SHORT],
  ['REQ-SSS-0003.9: Best Buy /product/ with no slug, generic rule only',
    'https://www.bestbuy.com/product/J7XSRH4KQS?irgwc=1',
    'https://www.bestbuy.com/product/J7XSRH4KQS'],
  ['REQ-SSS-0003.9: Best Buy legacy /site/…/<sku>.p',
    'https://www.bestbuy.com/site/sony-cyber-shot-rx100-vii-digital-camera-black/6364230.p?skuId=6364230&irclickid=xyz&irgwc=1&ref=198&loc=Wirecutter',
    'https://www.bestbuy.com/site/6364230.p'],
  ['REQ-SSS-0003.11: Best Buy search page keeps st and id',
    'https://www.bestbuy.com/site/searchpage.jsp?st=camera&id=pcat17071&irclickid=abc&loc=Wirecutter&mpid=1&acampID=2&affgroup=%22Content%22',
    'https://www.bestbuy.com/site/searchpage.jsp?st=camera&id=pcat17071'],
  ['REQ-SSS-0003.10: Target product with a Google Shopping query',
    'https://www.target.com/p/gracias-board-game/-/A-1004023797?afid=google&fndsrc=tgtao&DFA=7&CPNG=PLA_Toys&adgroup=SC&LID=7pgs&LNM=PRODUCT_GROUP&network=g&device=m&location=9&targetid=pla-4&ds_rl=1&gclid=abc&gclsrc=aw.ds',
    'https://www.target.com/p/-/A-1004023797'],
  ['REQ-SSS-0003.11: Target search keeps searchTerm',
    'https://www.target.com/s?searchTerm=board+game&afid=x&CPNG=y&clkid=z',
    'https://www.target.com/s?searchTerm=board+game'],
  ['Walmart product, slug only',
    'https://www.walmart.com/ip/seort/5429704737',
    'https://www.walmart.com/ip/5429704737'],
  ['Walmart product with an ad query',
    'https://www.walmart.com/ip/LEGO-Classic-11021/5429704737?athbdg=L1600&from=/search&athcpid=5&wmlspartner=wlpa&adid=2&wl0=&wl1=g&wl12=5&veh=sem&gclid=abc',
    'https://www.walmart.com/ip/5429704737'],
  ['REQ-SSS-0003.11: Walmart search keeps q',
    'https://www.walmart.com/search?q=lego&athcpid=5&wl1=g&veh=aff&irgwc=1&sourceid=imp_x&clickid=y',
    'https://www.walmart.com/search?q=lego'],
  ['eBay item with an eBay Partner Network query',
    'https://www.ebay.com/itm/197949520578?mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=5338722076&toolid=10001&customid=wc',
    'https://www.ebay.com/itm/197949520578'],
  ['REQ-SSS-0003.11: eBay search keeps _nkw and _sacat',
    'https://www.ebay.co.uk/sch/i.html?_nkw=seiko&_sacat=0&mkevt=1&mkcid=1&campid=5',
    'https://www.ebay.co.uk/sch/i.html?_nkw=seiko&_sacat=0'],
  ['Etsy listing from search',
    'https://www.etsy.com/listing/4356277139/striped-shawl?click_key=f4a2%3A4356277139&click_sum=9d8c&ga_order=most_relevant&ref=sr_gallery-1-3&frs=1&sts=1&organic_search_click=1',
    'https://www.etsy.com/listing/4356277139'],
  ['REQ-SSS-0003.11: Etsy search keeps q',
    'https://www.etsy.com/search?q=wool+scarf&ref=search_bar&ga_order=most_relevant&ga_search_type=all&awc=6220_1_ab',
    'https://www.etsy.com/search?q=wool+scarf'],
  ['Amazon product from search',
    'https://www.amazon.com/Sony-RX100-VII/dp/B07VGB9B5R/ref=sr_1_3?crid=1A&dib=eyJ2&dib_tag=se&keywords=sony&qid=1&sprefix=sony%2Caps%2C150&sr=8-3&th=1&psc=1',
    'https://www.amazon.com/dp/B07VGB9B5R'],
  ['Amazon product with an Associates tag',
    'https://www.amazon.com/dp/B07VGB9B5R?tag=thewirecutter-20&linkCode=ogi&th=1&psc=1&ascsubtag=%5Bartid',
    'https://www.amazon.com/dp/B07VGB9B5R'],
  ['REQ-SSS-0003.11: Amazon search keeps k',
    'https://www.amazon.com/s?k=sony+rx100&crid=1A&sprefix=sony%2Caps%2C150&ref=nb_sb_noss&linkCode=ll2&tag=x-20',
    'https://www.amazon.com/s?k=sony+rx100'],
  ['Amazon /sspa/click is out of scope and pinned unchanged',
    'https://www.amazon.com/sspa/click?ie=UTF8&spc=MTo&url=%2FSony%2Fdp%2FB07VGB9B5R%2Fref%3Dsr_1_1_sspa',
    'https://www.amazon.com/sspa/click?ie=UTF8&spc=MTo&url=%2FSony%2Fdp%2FB07VGB9B5R%2Fref%3Dsr_1_1_sspa'],
  ['Amazon short link a.co is unchanged',
    'https://a.co/d/0abcDEF', 'https://a.co/d/0abcDEF'],
  ['Amazon short link amzn.com is unchanged',
    'https://amzn.com/B07VGB9B5R', 'https://amzn.com/B07VGB9B5R'],
  ['REQ-SSS-0003.10: REI with an Impact query',
    'https://www.rei.com/product/176839/x?irclickid=abc&irgwc=1&afsrc=1&sharedid=wc',
    'https://www.rei.com/product/176839/x'],
  ['REQ-SSS-0003.10: Uniqlo with a CJ query keeps its colour',
    'https://www.uniqlo.com/us/en/products/E455359-000?cjevent=abc&cjdata=x&utm_source=cj&colorDisplayCode=09',
    'https://www.uniqlo.com/us/en/products/E455359-000?colorDisplayCode=09'],
  ['REQ-SSS-0003.10: ShareASale, Awin, Rakuten and ad click IDs',
    'https://shop.example/p?sscid=1&awc=2&ranMID=3&srsltid=4&gclsrc=aw.ds&ttclid=5&size=M',
    'https://shop.example/p?size=M'],
  ['REQ-SSS-0003.10: names compared without case, kept text untouched',
    'https://shop.example/p?GCLID=x&Fbclid=y&Size=M',
    'https://shop.example/p?Size=M'],
  ['REQ-SSS-0003.10: content names on a blog are not on the generic list',
    'https://blog.example.com/posts?tag=wool&ref=rss&id=7&loc=uk&from=home',
    'https://blog.example.com/posts?tag=wool&ref=rss&id=7&loc=uk&from=home'],
];

for (const [name, input, expected] of CORPUS) {
  test(`corpus: ${name}`, () => {
    assert.equal(tidyUrl(input), expected);
  });
}

test('corpus: tidyUrl is idempotent over every row', () => {
  for (const [name, input] of CORPUS) {
    const once = tidyUrl(input);
    assert.equal(tidyUrl(once), once, name);
  }
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test test/urls.test.js test/urls-corpus.test.js`
Expected: FAIL — among others `generic host: every listed parameter name is removed`, `shop rule: REQ-SSS-0003.9: Best Buy /product/<BSIN> with no slug falls to the generic rule`, `REQ-SSS-0003.11: Amazon with no product ID loses its own tracking names only`, `corpus: REQ-SSS-0003.10: REI with an Impact query`.

- [ ] **Step 4: Replace the list block in `js/urls.js`**

Replace everything from the line `// Removed on every host (§3).` up to (not including) the line `// A test for one list of names: exact names, plus prefixes from entries ending in *.` — that is, this text:

```js
// Removed on every host (§3).
const TRACKING = ['utm_*', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid'];

// Removed on a shop host only when no product ID matched (§4). Every shop
// list includes ref, ref_ and tag (ruling B1 of the 2026-10-04 spec).
const SHOP_COMMON = ['ref', 'ref_', 'tag'];
const JUNK = {
  amazon: SHOP_COMMON,
  etsy: SHOP_COMMON,
  ebay: SHOP_COMMON,
  walmart: SHOP_COMMON,
  target: SHOP_COMMON,
  bestbuy: SHOP_COMMON,
};
```

with:

```js
// Removed on every host (§3): names that only ever carry a click or affiliate
// identifier, borrowed from Firefox's release query-stripping list, AdGuard's
// TrackParamFilter and the affiliate networks' own docs. Never a name a page
// may use for content (id, loc, q, k, keywords, si, ref, tag, from, source…).
const TRACKING = [
  'utm_*',
  // the original list
  'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid',
  // Firefox query-stripping (release)
  'dclid', 'wbraid', 'gbraid', 'yclid', 'ysclid', 'twclid', 'wickedid', '_hsenc', '__hssc',
  '__hstc', '__hsfp', 'hsctatracking', 'oly_anon_id', 'oly_enc_id', '__s', 'vero_id', 'mkt_tok',
  // ad click IDs (AdGuard general)
  'gclsrc', 'gad_source', 'gad_campaignid', 'srsltid', 'ttclid', 'fbadid', '_gl', '_hsmi',
  'vero_conv', '_openstat', '_branch_match_id', '_branch_referrer',
  // affiliate networks: Impact; CJ; ShareASale; Awin; Rakuten
  'irclickid', 'irgwc', 'ir_campaignid', 'ir_adid', 'ir_partnerid', 'sharedid', 'subid1',
  'subid2', 'subid3', 'afsrc', 'clickid', 'clkid',
  'cjevent', 'cjdata',
  'sscid',
  'awc',
  'ranmid', 'raneaid', 'ransiteid',
];

// Removed on a shop host only when no product ID matched (§4), as well as the
// list above. Every shop list includes ref, ref_ and tag (ruling B1 of the
// 2026-10-04 spec). Nothing here identifies a search, category, seller or product.
const SHOP_COMMON = ['ref', 'ref_', 'tag'];
const JUNK = {
  amazon: [...SHOP_COMMON, 'linkcode', 'ascsubtag', 'crid', 'sprefix', 'qid', 'sr', 'dib',
    'dib_tag', 'th', 'psc', 'pd_rd_*', 'pf_rd_*'],
  etsy: [...SHOP_COMMON, 'click_key', 'click_sum', 'ga_order', 'ga_search_type', 'ga_view_type',
    'ga_search_query', 'frs', 'sts', 'organic_search_click', 'pro', 'content_source'],
  ebay: [...SHOP_COMMON, 'mkevt', 'mkcid', 'mkrid', 'campid', 'toolid', 'customid', 'siteid',
    'mkgroupid', 'mkcrid', 'hash', 'amdata', '_trkparms', '_trksid', 'itmmeta'],
  walmart: [...SHOP_COMMON, 'from', 'wmlspartner', 'adid', 'veh', 'sourceid', 'affiliates_ad_id',
    'campaign_id', 'ath*', 'wl*'],
  target: [...SHOP_COMMON, 'afid', 'cpng', 'lnm', 'lid', 'dfa', 'fndsrc', 'adgroup', 'network',
    'device', 'location', 'targetid', 'ds_rl', 'clkid'],
  bestbuy: [...SHOP_COMMON, 'mpid', 'acampid', 'affgroup', 'loc'],
};
```

Nothing else in `js/urls.js` changes.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test test/urls.test.js` — Expected: PASS, 71 tests, 0 fail.
Run: `node --test test/urls-corpus.test.js` — Expected: PASS, 26 tests, 0 fail.
Run: `npm test` — Expected: PASS, 193 tests, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add js/urls.js test/urls.test.js test/urls-corpus.test.js
git commit -m "feat: borrowed click/affiliate strip list on every host, per-shop lists on fall-through, link corpus (REQ-SSS-0003.10, 0003.11)"
```

---

### Task 3: shortenLink — whitespace inside the link is not a link

**Files:**
- Modify: `js/shorten.js`
- Test: `test/shorten.test.js`

**Interfaces:**
- Consumes: `tidyUrl` from `js/urls.js` (Task 1's Best Buy `/product/` row).
- Produces: `export function shortenLink(input): { state: 'empty' } | { state: 'notUrl' } | { state: 'unchanged' } | { state: 'short', url: string }` — signature unchanged.

- [ ] **Step 1: Edit `test/shorten.test.js`**

(a) Delete the line (it is used only by the test replaced in (b)):

```js
const STATES = new Set(['empty', 'notUrl', 'unchanged', 'short']);
```

(b) Replace the last test

```js
test('REQ-SSS-0003.6: two links pasted at once do not throw', () => {
  const r = shortenLink(`${LONG_AMAZON} https://www.etsy.com/listing/1/x?ref=y`);
  assert.ok(STATES.has(r.state), JSON.stringify(r));
});
```

with

```js
test('REQ-SSS-0003.14: two links pasted at once are notUrl', () => {
  assert.deepEqual(shortenLink(`${LONG_AMAZON} https://www.etsy.com/listing/1/x?ref=y`), { state: 'notUrl' });
  assert.deepEqual(shortenLink(`${LONG_AMAZON}\nhttps://www.etsy.com/listing/1/x?ref=y`), { state: 'notUrl' });
});

test('REQ-SSS-0003.14: a link followed by words is notUrl', () => {
  assert.deepEqual(shortenLink(`${LONG_AMAZON}, nice`), { state: 'notUrl' });
});

test('REQ-SSS-0003.14: a link with an internal newline or tab is notUrl', () => {
  assert.deepEqual(shortenLink('https://www.amazon.com/Cozy-Wool-Socks/dp/B0ABCDEFGH\n/ref=sr_1_3?tag=abc-20'),
    { state: 'notUrl' });
  assert.deepEqual(shortenLink('https://www.amazon.com/Cozy-Wool-Socks/dp/B0ABCDEFGH\t?tag=abc-20'),
    { state: 'notUrl' });
});

test('REQ-SSS-0003.9: the user\'s Best Buy link is cut to the product', () => {
  const short = 'https://www.bestbuy.com/product/sony-cyber-shot-rx100-vii-20-1-megapixel-digital-camera-black/J7XSRH4KQS';
  assert.deepEqual(
    shortenLink(`${short}?irclickid=U%3AxW%3ARQwtxyZRhcy-WznJwsKUkrwJAwAe26LSg0&irgwc=1&afsrc=1&loc=The%20WireCutter&acampID=&mpid=197432&affgroup=%22Content%22`),
    { state: 'short', url: short });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/shorten.test.js`
Expected: FAIL — `REQ-SSS-0003.14: two links pasted at once are notUrl`, `REQ-SSS-0003.14: a link followed by words is notUrl`, `REQ-SSS-0003.14: a link with an internal newline or tab is notUrl`. (`REQ-SSS-0003.9: the user's Best Buy link is cut to the product` passes already, through Task 1.)

- [ ] **Step 3: Edit `js/shorten.js`**

Replace

```js
// (spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3).
```

with

```js
// (spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3;
// whitespace rule: docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html §6).
```

and replace

```js
  if (!trimmed) return { state: 'empty' };
```

with

```js
  if (!trimmed) return { state: 'empty' };
  // Two links, or a link and words: not one link (REQ-SSS-0003.14). new URL
  // would silently drop an internal newline or tab, so this check comes first.
  if (/\s/.test(trimmed)) return { state: 'notUrl' };
```

The resulting file is:

```js
import { tidyUrl } from './urls.js';

// The shorten-a-link tool's logic, kept out of js/ui so node can test it
// (spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3;
// whitespace rule: docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html §6).
// string -> { state: 'empty' } | { state: 'notUrl' } | { state: 'unchanged' } | { state: 'short', url: string }
// No scheme is guessed: 'www.amazon.com/dp/…' is notUrl. Never throws.
export function shortenLink(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return { state: 'empty' };
  // Two links, or a link and words: not one link (REQ-SSS-0003.14). new URL
  // would silently drop an internal newline or tab, so this check comes first.
  if (/\s/.test(trimmed)) return { state: 'notUrl' };
  let parsed;
  try { parsed = new URL(trimmed); } catch { return { state: 'notUrl' }; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { state: 'notUrl' };
  const url = tidyUrl(trimmed);
  return url === trimmed ? { state: 'unchanged' } : { state: 'short', url };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/shorten.test.js` — Expected: PASS, 13 tests, 0 fail.
Run: `npm test` — Expected: PASS, 196 tests, 0 fail.
Run: `git diff b79b231 --stat` — Expected: only `js/urls.js`, `js/shorten.js`, `test/urls.test.js`, `test/shorten.test.js`, `test/urls-corpus.test.js` (plus this plan file if committed on the branch).

- [ ] **Step 5: Commit**

```bash
git add js/shorten.js test/shorten.test.js
git commit -m "feat: shortenLink reports input with whitespace inside as not a link (REQ-SSS-0003.14)"
```

---

## Manual check (spec §8, director after merge)

On the VM copy: open the shorten-a-link tool; paste the user's Best Buy link → the short form of corpus row 1 and "Copy short link". Paste `https://www.bestbuy.com/product/J7XSRH4KQS` → "That link is already as short as it gets." Paste the Best Buy link followed by `, nice` → "Paste one full link, starting with http." Paste the REI or Uniqlo link from the corpus → query gone. Open the Best Buy short link in a browser: the camera page loads.
