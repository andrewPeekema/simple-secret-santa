# Compatibility Cleanup and Module Extraction — Implementation Plan

> **For the lead:** this plan is already written — skip `writing-plans`. Run the critic gate on this file (16 tasks, so the gate holds), surface the findings with proposed rulings, then execute with superpowers:subagent-driven-development in the worktree `launch-agent` created. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Base:** line numbers throughout are stated against `index.html` at `f0e0a91`. The worktree branch forks from `restart-2026`, which carries only documents on top of that commit.

**Goal:** Delete the dead backward-compatibility paths from `index.html`, then split the remaining single file into ES modules covered by unit tests — with no user-visible behaviour change.

**Architecture:** Sub-project 0 removes ~110 lines of legacy decoding *before* any restructuring, so the new module boundaries are shaped only by code that survives. Sub-project 1 then extracts `css/styles.css` and `js/*.js` modules one at a time. A set of golden links captured from today's code guards every step: they are generated in Task 1 and must keep decoding identically through Task 16.

**Tech Stack:** Vanilla ES modules, no runtime dependencies, no build step. Tests use `node --test` (built in, Node v24.13.1 verified). GitHub Pages serves `main` directly.

**Spec:** `docs/superpowers/specs/2026-09-14-restart-design.md`

## Global Constraints

- **Zero dependencies.** No `npm install`, no bundler, no test framework. `package.json` exists only to set `{"type": "module"}`. If a task seems to need a package, stop and ask.
- **No behaviour change in this plan.** Sub-project 2 changes the wire format; this plan must not. Every golden fixture that decodes in Task 1 must still decode in Task 16, byte for byte — except the four legacy fixtures deliberately retired in Tasks 2–4.
- **Origin is never hardcoded.** Links are built from `window.location` (`index.html:1219`). Keep it that way so a custom domain stays a DNS-only change.
- **The five-character password retry at `index.html:1507` is NOT legacy code.** It handles a user mis-transcribing a six-character password by dropping a leading zero. It stays until sub-project 2. Do not delete it in Task 4.
- **Deletions are justified branch by branch, never by region.** Three retry branches sit in one cascade and share a shape; only two are legacy.
- Commit after every task. Never commit with failing tests.
- **Where a step gives a verbatim replacement block, that block is authoritative** over the line
  range it cites and over any incidental comment or whitespace difference. Write the block as shown.
- **Quoted anchor text is binding; line numbers are navigational only.** Deletions in Tasks 2–5 shift everything below them, so positions cited in Tasks 2, 4 and 7 no longer hold by the time those tasks run — including within Task 2 itself, which deletes bottom-up. Locate every edit by the anchor text the task quotes; where a task gives no anchor, `grep` for the distinctive string. Task 7 slices on the `<script>` and `</script>` markers, not on `673-1620`.

## Stop Conditions

Stop and ask the user — do not rule on these yourself:

- **Never `git push`.** Nothing on this branch has been pushed to GitHub; it exists only locally.
- **Never merge to `main`.** GitHub Pages serves `main` directly, so a merge is a production deploy to the live site. That is a human decision.
- **Never re-run `tools/gen-fixtures.mjs` after Task 1.** It reads `index.html`, so regenerating after any deletion would quietly rewrite the golden data to match the new behaviour and destroy the only guard this plan has.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `package.json` | `{"type": "module"}` only | 1 |
| `tools/gen-fixtures.mjs` | One-shot generator for the golden fixtures | 1 |
| `test/harness-v0.mjs` | **Temporary.** Evals the inline `<script>` so pre-extraction code is testable. Deleted in Task 7 | 1 |
| `test/fixtures/v0-links.json` | Golden links captured from today's code. Outlives the harness | 1 |
| `test/golden.test.js` | Characterisation tests over the fixtures. Re-pointed at modules in Task 7 | 1 |
| `css/styles.css` | The `<style>` block, moved verbatim | 6 |
| `js/main.js` | Bootstrap and hash routing | 7, 16 |
| `js/codec.js` | UTF-8 and url-safe base64 conversion | 8 |
| `js/compress.js` | `deflate-raw` with capability probe and fallback | 9 |
| `js/secret.js` | `crc16`, XOR, `simpleHash` | 10 |
| `js/validate.js` | Participant name validation | 11 |
| `js/assign.js` | Shuffle and derangement | 12 |
| `js/format.js` | Assignment and wishlist payload encoding | 13 |
| `js/ui/dom.js` | `escapeHtml`, clipboard, error display | 14 |
| `js/ui/setup.js` | Participant form, exclusions, results list | 14 |
| `js/ui/reveal.js` | Assignment screen | 15 |
| `js/ui/wishlist.js` | Wishlist create and view screens | 15 |

---

# Sub-project 0 — Delete dead compatibility paths

## Task 1: Freeze v0 behaviour in golden fixtures

**Files:**
- Create: `package.json`, `tools/gen-fixtures.mjs`, `test/harness-v0.mjs`, `test/fixtures/v0-links.json`, `test/golden.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `loadV0()` from `test/harness-v0.mjs`, returning `{ encodeAssignment, decodeAssignment, encodeHints, decodeHints, simpleHash, crc16, xorEncrypt, compressBytes, decompressBytes }`. `test/fixtures/v0-links.json` with shape `{ salt: string, assignments: [{giver, receiver, salt, encoded}], wishlists: [{label, plaintext, password, encoded}], legacy: {pipe4Field, jsonFormat, urlEncodedJson} }`.

**Both directions are pinned.** The decode assertion proves old links still open; the encode
assertion proves this code still *produces* the same links. Without the second one an encoder
regression — reintroduced base64 padding, a changed separator — passes every task in this plan with a
green suite, because nothing else in the suite ever compares encoder output to a fixture.

**IMPORTANT — these are characterisation tests, not TDD.** They describe behaviour that already exists, so they must **pass on the first run** against unmodified `index.html`. That passing is the verification that the harness is wired correctly. Do not expect a red phase in this task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "simple-secret-santa",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create `test/harness-v0.mjs`**

This is deliberately temporary. The code under test is still inline in `index.html`, so it cannot be imported; this evals it with the minimum DOM stubs needed for the top-level statements (`document.addEventListener` at `index.html:1614` and `checkForReveal()` at `:1620`) to run without a browser.

```javascript
// TEMPORARY — deleted in Task 7, once js/main.js exists and can be imported.
// Loads the inline <script> from index.html so sub-project 0's deletions are
// testable before any code has been extracted into modules.
import { readFile } from 'node:fs/promises';

const OPEN = '<script>';

export async function loadV0() {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const src = html.slice(html.indexOf(OPEN) + OPEN.length, html.lastIndexOf('</script>'));

  globalThis.window = { location: { hash: '', origin: 'https://x.test', pathname: '/' } };
  globalThis.document = {
    addEventListener() {},
    createElement: () => ({ textContent: '', get innerHTML() { return this.textContent; } }),
  };
  globalThis.alert = () => {};

  const exports = '; return { encodeAssignment, decodeAssignment, encodeHints, '
    + 'decodeHints, simpleHash, crc16, xorEncrypt, compressBytes, decompressBytes };';
  return new Function(src + exports)();
}
```

- [ ] **Step 3: Create `tools/gen-fixtures.mjs`**

```javascript
// One-shot generator. Run once in Task 1; the output is committed and then
// treated as immutable golden data. Do not re-run after Task 2.
import { writeFile, mkdir } from 'node:fs/promises';
import { loadV0 } from '../test/harness-v0.mjs';

const api = await loadV0();
const SALT = 'k7f3m2p9q1x4c';

const assignments = [
  ['Andrew', 'Kathryn'],
  ['José', 'Zoë'],
  ["Mary-Anne O'Brien", 'Bob Jr.'],
  ['A'.repeat(50), 'B'],
].map(([giver, receiver]) => ({
  giver, receiver, salt: SALT,
  encoded: api.encodeAssignment({ giver, receiver, salt: SALT }),
}));

const password = api.simpleHash('pair-Kathryn-' + SALT).padStart(6, '0').substring(0, 6);
const wishlists = [];
for (const [label, plaintext] of [
  ['short (incompressible)', 'socks'],
  ['long (deflate wins)', 'Books about hiking, wool socks size 10, dark chocolate, a good pour-over coffee setup, nothing scented please. I like blue and green. No clothing unless its socks. Board games always welcome!'],
]) {
  wishlists.push({ label, plaintext, password, encoded: await api.encodeHints(plaintext, password) });
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const legacy = {
  pipe4Field: b64('Andrew|Kathryn|unusedkey|' + SALT),
  jsonFormat: b64(JSON.stringify({ giver: 'Andrew', receiver: 'Kathryn', salt: SALT })),
  urlEncodedJson: Buffer.from(
    encodeURIComponent(JSON.stringify({ giver: 'Andrew', receiver: 'Kathryn', salt: SALT })),
    'utf8').toString('base64').replace(/=/g, ''),
};

await mkdir('test/fixtures', { recursive: true });
await writeFile('test/fixtures/v0-links.json',
  JSON.stringify({ salt: SALT, assignments, wishlists, legacy }, null, 2) + '\n');
console.log('wrote test/fixtures/v0-links.json');
```

- [ ] **Step 4: Generate the fixtures**

Run: `node tools/gen-fixtures.mjs`
Expected: `wrote test/fixtures/v0-links.json`

Verify the known-good values (these were produced by the current code and must match exactly):

Run: `node -e "const f=require('./test/fixtures/v0-links.json');console.log(f.assignments[0].encoded);console.log(f.wishlists[0].password);console.log(f.legacy.urlEncodedJson.slice(0,4))"`

Expected output, exactly:
```
QW5kcmV3fEthdGhyeW58azdmM20ycDlxMXg0Yw
s921er
JTdC
```

The `JTdC` prefix matters: it is the marker `decodeHints` tests for at `index.html:1011`, so this fixture genuinely exercises the legacy path that Task 2 removes.

- [ ] **Step 5: Create `test/golden.test.js`**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadV0 } from './harness-v0.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/v0-links.json', import.meta.url), 'utf8'));
const api = await loadV0();

test('every assignment fixture round-trips', () => {
  for (const f of fixtures.assignments) {
    const decoded = api.decodeAssignment(f.encoded);
    assert.deepEqual(decoded, { giver: f.giver, receiver: f.receiver, salt: f.salt },
      'failed for giver ' + f.giver);
    assert.equal(api.encodeAssignment({ giver: f.giver, receiver: f.receiver, salt: f.salt }), f.encoded,
      'encoder drifted for giver ' + f.giver);
  }
});

test('every wishlist fixture decrypts with its password', async () => {
  for (const f of fixtures.wishlists) {
    const payload = await api.decodeHints(f.encoded);
    const plain = await api.decompressBytes(api.xorEncrypt(payload.bytes, f.password));
    assert.equal(Buffer.from(plain.slice(2)).toString('utf8'), f.plaintext,
      'failed for ' + f.label);
  }
});

// The guess below must not drive the format byte to 0x01: with password 's921er'
// and guess 'zzzzzz' byte 0 becomes 0x09, so decompressBytes returns the raw data
// and this test is deterministic. Changing either string can break that.
test('a wrong password does not yield the plaintext', async () => {
  const f = fixtures.wishlists[0];
  const payload = await api.decodeHints(f.encoded);
  const plain = await api.decompressBytes(api.xorEncrypt(payload.bytes, 'zzzzzz'));
  const text = plain ? Buffer.from(plain.slice(2)).toString('utf8') : '';
  assert.notEqual(text, f.plaintext);
});
```

- [ ] **Step 6: Run the suite — it must PASS immediately**

Run: `npm test`
Expected: `pass 4`, `fail 0`. If anything fails, the harness is wrong — fix it before continuing. Do not edit the fixtures to make tests pass.

The fourth "pass" is `test/harness-v0.mjs` itself: `node --test` globs `**/test/**/*.mjs`, so the
harness runs as a zero-test file and scores a pass. That is expected, and it is why every count
through Task 6 is one higher than the number of real tests. Task 7 deletes the harness, after which
the counts equal the test count.

- [ ] **Step 7: Commit**

```bash
git add package.json tools/gen-fixtures.mjs test/
git commit -m "test: capture golden v0 links before compatibility cleanup"
```

---

## Task 2: Delete the `#hints-` route and legacy hint decoding

**Files:**
- Modify: `index.html` (`decodeHints` at `:1009-1034`; `checkForReveal` at `:1592-1601`)
- Test: `test/legacy-removed.test.js`

**Interfaces:**
- Consumes: `loadV0()` from Task 1.
- Produces: `decodeHints(encoded)` now returns `Uint8Array | null` instead of `{ bytes, isLegacy } | null`. Task 4 depends on this shape change.

Apply edits **bottom-up** (highest line numbers first) so earlier line numbers stay valid.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadV0 } from './harness-v0.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('./fixtures/v0-links.json', import.meta.url), 'utf8'));
const api = await loadV0();

test('decodeHints returns raw bytes, with no legacy wrapper', async () => {
  const result = await api.decodeHints(fixtures.wishlists[0].encoded);
  assert.ok(result instanceof Uint8Array, 'expected a Uint8Array, got ' + typeof result);
});

test('the #hints- route is gone from the source', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes("hash.startsWith('hints-')"), 'legacy #hints- route still present');
  assert.ok(!html.includes("encoded.startsWith('JTdC')"), 'legacy JTdC branch still present');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/legacy-removed.test.js`
Expected: FAIL — `expected a Uint8Array, got object`, and `legacy #hints- route still present`.

- [ ] **Step 3: Delete the `#hints-` route**

Delete `index.html:1592-1601` — the entire `} else if (hash.startsWith('hints-')) { ... }` branch. Line `:1591` (`}`) closes the inner if/else and line `:1602` (`} else {`) closes the `h-` block and opens the final else, so removing exactly these ten lines leaves valid syntax.

Also update the now-stale comment at `:1582` from `// Handle hint links (new #h- and legacy #hints-)` to `// Handle wishlist links`.

- [ ] **Step 4: Simplify `decodeHints`**

Replace the whole of `index.html:1009-1034` with:

```javascript
        async function decodeHints(encoded) {
            try {
                return urlSafeBase64ToBytes(encoded);
            } catch (e) {
                return null;
            }
        }
```

- [ ] **Step 5: Update the two call sites of the old shape**

At `:1404`, `showViewHints(encryptedData)` stores the value on `window.currentEncryptedData`; it now receives a `Uint8Array`. Rename the parameter for clarity — change `function showViewHints(encryptedData) {` to `function showViewHints(encryptedBytes) {` and `window.currentEncryptedData = encryptedData;` to `window.currentEncryptedBytes = encryptedBytes;`.

At `:1436`, change `const encryptedData = window.currentEncryptedData;` to `const encryptedBytes = window.currentEncryptedBytes;`.

Then replace every `encryptedData.bytes` inside `tryDecodeHintsWithPassword` with `encryptedBytes`. There are six, at `:1479`, `:1485`, `:1494`, `:1500`, `:1509` and `:1521`.

**Also rename the property access at `:1477`** — `if (encryptedData.isLegacy) {` becomes
`if (encryptedBytes.isLegacy) {`. This branch is deleted wholesale in Task 4, but it must not be
left referencing a name that no longer exists: the resulting `ReferenceError` is swallowed by the
`catch` at `:1544`, so every wishlist decode would report "Invalid password" while the unit tests
stayed green. On a `Uint8Array` the property is simply `undefined`, so the correct non-legacy path
runs and this commit remains independently shippable. Do **not** delete the `isLegacy` branch here —
that would invalidate the `:1474-1528` anchor Task 4 replaces.

Run: `grep -c 'encryptedData\.' index.html`
Expected: `0`. A non-zero count means a property access was missed, and wishlist decoding will silently fail at runtime while the tests still pass — the golden wishlist test calls `decodeHints` and `xorEncrypt` directly and never goes through this function.

The bare name `encryptedData` legitimately survives as a local inside `checkForReveal`'s `#h-` branch
(`:1585-1588`), which is a different scope and still accurately named. Do not rename it.

The cascade this touches is still the full legacy one; Task 4 replaces it wholesale. Updating the references here rather than there is what keeps every commit in this plan independently shippable.

- [ ] **Step 6: Update `test/golden.test.js` for the new shape**

Change the wishlist test body from `api.xorEncrypt(payload.bytes, f.password)` to `api.xorEncrypt(payload, f.password)`, and the same in the wrong-password test.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: `pass 6`, `fail 0`.

- [ ] **Step 8: Smoke-test wishlist decoding**

The unit tests cannot catch a missed `encryptedData` reference, so check it in a browser. Run `python3 -m http.server 8000`, generate an exchange for three people, open one assignment link, create a wishlist, open its link, and decode it with the password shown on the assignment screen. The wishlist text must appear.

- [ ] **Step 9: Commit**

```bash
git add index.html test/
git commit -m "refactor: remove legacy #hints- route and JTdC hint format"
```

---

## Task 3: Delete legacy assignment formats and `legacyDecode`

**Files:**
- Modify: `index.html` (`decodeAssignment` at `:945-980`; `legacyDecode` at `:833-842`)
- Test: `test/legacy-removed.test.js`

**Interfaces:**
- Consumes: `loadV0()` from Task 1.
- Produces: `decodeAssignment(encoded)` accepts only the three-field pipe format and returns `{ giver, receiver, salt } | null`.

- [ ] **Step 1: Add the failing tests**

Append to `test/legacy-removed.test.js`:

```javascript
test('legacy assignment formats no longer decode', () => {
  assert.equal(api.decodeAssignment(fixtures.legacy.pipe4Field), null, 'four-field pipe');
  assert.equal(api.decodeAssignment(fixtures.legacy.jsonFormat), null, 'bare JSON');
  assert.equal(api.decodeAssignment(fixtures.legacy.urlEncodedJson), null, 'url-encoded JSON');
});

test('legacyDecode is gone from the source', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('function legacyDecode'), 'legacyDecode still present');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/legacy-removed.test.js`
Expected: FAIL — `four-field pipe` (it currently decodes) and `legacyDecode still present`.

- [ ] **Step 3: Replace `decodeAssignment`**

Replace `index.html:945-980` in full with:

```javascript
        function decodeAssignment(encoded) {
            try {
                const bytes = urlSafeBase64ToBytes(encoded);
                const decoded = bytesToUtf8(bytes);
                if (decoded.includes('|') && !decoded.includes('{')) {
                    const parts = decoded.split('|');
                    if (parts.length === 3) {
                        return { giver: parts[0], receiver: parts[1], salt: parts[2] };
                    }
                }
            } catch (e) {}

            return null;
        }
```

- [ ] **Step 4: Delete `legacyDecode`**

Delete `index.html:833-842` — the `// Legacy decoding for backward compatibility` comment and the whole `function legacyDecode(str) { ... }` block. It now has no callers.

- [ ] **Step 5: Confirm no references remain**

Run: `grep -n 'legacyDecode\|JSON.parse(legacy)\|parts.length === 4' index.html`
Expected: no output.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: `pass 8`, `fail 0`. The four assignment fixtures in `golden.test.js` must still decode — they are three-field links and are unaffected.

- [ ] **Step 7: Commit**

```bash
git add index.html test/
git commit -m "refactor: accept only the three-field assignment format"
```

---

## Task 4: Delete the legacy password-retry branches

**Files:**
- Modify: `index.html` (`validateHints` at `:1451-1472`; retry cascade at `:1474-1528`)
- Test: `test/legacy-removed.test.js`

**Interfaces:**
- Consumes: the `Uint8Array` return shape from Task 2.
- Produces: no signature changes.

**Read the Global Constraints before starting.** Three branches live in this cascade. Two are legacy and come out. The one at `:1507` stays.

- [ ] **Step 1: Add the failing test**

Append to `test/legacy-removed.test.js`:

```javascript
test('legacy password fallbacks are gone, transcription leniency is kept', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes("text.startsWith('VALID:')"), 'VALID: prefix still present');
  assert.ok(!html.includes('.isLegacy'), 'isLegacy branch still present');
  assert.ok(!html.includes("enteredPassword.startsWith('0')"), 'zero-stripping still present');
  assert.equal(html.split('enteredPassword.length === 5').length - 1, 1,
    'the five-character transcription retry must remain, exactly once');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/legacy-removed.test.js`
Expected: FAIL — `VALID: prefix still present`.

- [ ] **Step 3: Remove the `VALID:` fallback from `validateHints`**

Delete `index.html:1462-1470` — the blank line, the `// Try VALID: prefix (backward compatibility)` comment, and its `try { ... } catch (e) {}` block. `validateHints` becomes:

```javascript
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
```

- [ ] **Step 4: Replace the retry cascade**

Replace `index.html:1474-1528` — from `try {` down to and including the `}` that closes the `else` block — with the following. This drops the `isLegacy` branch entirely, unwraps the `else`, drops the zero-stripping loop, and keeps the transcription retry:

```javascript
            try {
                let hints = null;

                const decryptedBytes = xorDecrypt(encryptedBytes, enteredPassword);
                const decompressed = await decompressBytes(decryptedBytes);
                if (decompressed) {
                    hints = validateHints(decompressed);
                }

                // Retained deliberately: a six-character password transcribed by hand
                // may lose a leading zero. This is usability, not legacy compatibility.
                // Removed in sub-project 2, where fixed-length base32 passwords make
                // the ambiguity impossible.
                if (!hints && enteredPassword.length === 5) {
                    const paddedPassword = '0' + enteredPassword;
                    const decryptedBytes2 = xorDecrypt(encryptedBytes, paddedPassword);
                    const decompressed2 = await decompressBytes(decryptedBytes2);
                    if (decompressed2) {
                        hints = validateHints(decompressed2);
                    }
                }
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 9`, `fail 0`.

- [ ] **Step 6: Verify the retained branch by hand**

Run: `grep -n -A2 'enteredPassword.length === 5' index.html`
Expected: exactly one match, inside `tryDecodeHintsWithPassword`, with the retention comment above it.

- [ ] **Step 7: Commit**

```bash
git add index.html test/
git commit -m "refactor: drop legacy password fallbacks, keep transcription retry"
```

---

## Task 5: Add the older-link message

**Files:**
- Modify: `index.html` (`checkForReveal`, the final `else` branch)
- Test: `test/legacy-removed.test.js`

**Interfaces:**
- Consumes: `decodeAssignment` from Task 3.
- Produces: `looksLikeOldLink(encoded) -> boolean`, moved to `js/format.js` in Task 13.

**Note on the spec.** The spec describes this check as "byte 0 is not `0x01`". That formulation only works once v1 payloads exist, which is sub-project 2. Until then the detection is shape-based, as below. Sub-project 2 replaces it with the version-byte check.

- [ ] **Step 1: Write the failing test**

Append to `test/legacy-removed.test.js`:

```javascript
test('legacy links are recognised as old rather than merely invalid', () => {
  assert.equal(api.looksLikeOldLink(fixtures.legacy.pipe4Field), true, 'four-field pipe');
  assert.equal(api.looksLikeOldLink(fixtures.legacy.jsonFormat), true, 'bare JSON');
  assert.equal(api.looksLikeOldLink(fixtures.legacy.urlEncodedJson), true, 'url-encoded JSON');
  assert.equal(api.looksLikeOldLink('not-a-link-at-all'), false, 'genuine rubbish');
});
```

Add `looksLikeOldLink` to the export list in `test/harness-v0.mjs` (Step 2 of Task 1), so the line reads:

```javascript
  const exports = '; return { encodeAssignment, decodeAssignment, encodeHints, '
    + 'decodeHints, simpleHash, crc16, xorEncrypt, compressBytes, decompressBytes, '
    + 'looksLikeOldLink };';
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/legacy-removed.test.js`
Expected: FAIL — `looksLikeOldLink is not defined`.

- [ ] **Step 3: Add `looksLikeOldLink` directly above `decodeAssignment`**

```javascript
        // Recognises links issued before the 2026 cleanup, so they can be reported
        // as outdated rather than as corrupt. Replaced by a version-byte check in
        // sub-project 2.
        function looksLikeOldLink(encoded) {
            try {
                const decoded = bytesToUtf8(urlSafeBase64ToBytes(encoded));
                if (decoded.startsWith('{') || decoded.startsWith('%7B')) return true;
                return decoded.split('|').length === 4;
            } catch (e) {
                return false;
            }
        }
```

- [ ] **Step 4: Use it in `checkForReveal`**

In the final `else` branch, replace:

```javascript
                    if (data) {
                        revealAssignment(data);
                    } else {
                        showError("Invalid Secret Santa link!");
                    }
```

with:

```javascript
                    if (data) {
                        revealAssignment(data);
                    } else if (looksLikeOldLink(hash)) {
                        showError("This link was created with an older version of Simple Secret Santa. Ask the organiser for a new one.");
                    } else {
                        showError("Invalid Secret Santa link!");
                    }
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 10`, `fail 0`.

- [ ] **Step 6: Smoke-test in a browser**

Run: `python3 -m http.server 8000`

Open each and confirm:
1. `http://localhost:8000/#QW5kcmV3fEthdGhyeW58azdmM20ycDlxMXg0Yw` — reveals "Hello, Andrew" giving to "Kathryn".
2. `http://localhost:8000/#QW5kcmV3fEthdGhyeW58dW51c2Vka2V5fGs3ZjNtMnA5cTF4NGM` — shows the older-version message.
3. `http://localhost:8000/#total-rubbish` — shows "Invalid Secret Santa link!".
4. `http://localhost:8000/` — generate an exchange for three people, open one link, create a wishlist, then open the wishlist link and decode it with the password shown on the assignment screen.

Step 4 is the important one: it exercises the wishlist path end to end after the Task 2 and Task 4 surgery.

- [ ] **Step 7: Commit**

```bash
git add index.html test/
git commit -m "feat: tell holders of pre-2026 links to ask for a new one"
```

**CHECKPOINT — sub-project 0 complete.** Confirm with `git diff --stat f0e0a91 -- index.html` that `index.html` has shrunk by roughly 90 lines. (Task 2 removes ~29, Task 3 ~32, Task 4 ~42, and Task 5 adds back ~14. The spec's "~110" predates the Task 5 addition — do not go hunting for a missed deletion.) Stop here for review before starting Task 6.

---

# Sub-project 1 — Extract modules and tests

## Task 6: Extract the stylesheet

**Files:**
- Create: `css/styles.css`
- Modify: `index.html:10-592`

**Interfaces:**
- Consumes: nothing. Produces: nothing importable. Pure file move.

- [ ] **Step 1: Move the stylesheet**

Copy `index.html:11-591` (every line between `<style>` and `</style>`, excluding both tags) into `css/styles.css`, verbatim, preserving order. Then delete `index.html:10-592` inclusive and put this in their place, after the Google Fonts `<link>`:

```html
    <link rel="stylesheet" href="css/styles.css">
```

- [ ] **Step 2: Verify nothing was lost**

Run: `git show HEAD:index.html | sed -n '11,591p' > /tmp/before.css && diff /tmp/before.css css/styles.css && echo IDENTICAL`
Expected: `IDENTICAL`

- [ ] **Step 3: Confirm the tests are unaffected**

Run: `npm test`
Expected: `pass 10`, `fail 0`. The harness slices on `<script>`, so moving CSS cannot affect it.

- [ ] **Step 4: Smoke-test**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/`, and confirm the page is styled identically — dark background, serif headings, green buttons. An unstyled page means the `<link>` path is wrong.

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css
git commit -m "refactor: move stylesheet to css/styles.css"
```

---

## Task 7: Move the script into `js/main.js` as an ES module

**Files:**
- Create: `js/main.js`
- Modify: `index.html` (script tag), `test/golden.test.js`
- Delete: `test/harness-v0.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `js/main.js` exporting `encodeAssignment`, `decodeAssignment`, `looksLikeOldLink`, `encodeHints`, `decodeHints`, `simpleHash`, `crc16`, `xorEncrypt`, `xorDecrypt`, `compressBytes`, `decompressBytes`, `shuffle`, `isValidAssignment`, `isValidName`, `getInvalidNameReason`. Every later task imports from here until it moves code elsewhere.

**This is the riskiest task in the plan.** Module scope is not global scope, so the 14 inline `onclick` attributes stop working the moment the script becomes a module. Step 3 is what keeps them working.

- [ ] **Step 1: Move the script body**

Copy `index.html:673-1620` (everything between `<script>` and `</script>`) into `js/main.js` verbatim. Replace `index.html:672-1621` with:

```html
    <script type="module" src="js/main.js"></script>
```

- [ ] **Step 2: Guard the bootstrap so the module is importable in Node**

At the end of `js/main.js`, replace the trailing `document.addEventListener(...)` block and the bare `checkForReveal();` call with:

```javascript
// Bootstrap only in a browser. Guarding this is what lets the test suite
// import this module directly, with no DOM stubs.
if (typeof document !== 'undefined') {
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('person-name')) {
            updateExclusionDropdowns();
        }
    });

    checkForReveal();
}
```

- [ ] **Step 3: Re-expose the inline event handlers**

Inline `onclick` attributes resolve against the global scope, which module scope is not. Add directly above the bootstrap guard:

```javascript
// The markup and several innerHTML templates use inline onclick attributes,
// which resolve against globals. Module scope is not global, so these must be
// published explicitly. Replacing them with addEventListener wiring is
// deliberately out of scope for this refactor.
if (typeof window !== 'undefined') {
    Object.assign(window, {
        addPerson,
        addExclusion,
        generateSecretSanta,
        copyAllLinks,
        copyToClipboard,
        showCreateHints,
        generateHintLink,
        tryDecodeHintsWithPassword,
        updateExclusionDropdowns,
    });
}
```

`updateExclusionDropdowns` is in that list because of `index.html:1046`, inside `addPerson`'s
innerHTML template: `onclick="this.parentElement.remove(); updateExclusionDropdowns();"`. It is the
**second** call in the attribute, which is exactly the shape a first-identifier-only grep misses.

Before moving on, confirm that list is complete. This grep reads every call target in every handler,
not just the first:

Run: `grep -oE 'onclick="[^"]*"' index.html js/main.js | grep -oE '(^|[^.a-zA-Z0-9_$])[a-zA-Z_$][a-zA-Z0-9_$]*\(' | grep -oE '[a-zA-Z_$][a-zA-Z0-9_$]*' | sort -u`

Expected: exactly the nine names in the `Object.assign` call above. Property accesses
(`this.parentElement.remove`, `location.reload`) are filtered out by the leading-dot guard, so every
name in the output must appear in the call. If one is missing, add it.

- [ ] **Step 4: Export the pure functions**

Append to `js/main.js`:

```javascript
export {
    encodeAssignment, decodeAssignment, looksLikeOldLink,
    encodeHints, decodeHints,
    simpleHash, crc16, xorEncrypt, xorDecrypt,
    compressBytes, decompressBytes,
    shuffle, isValidAssignment,
    isValidName, getInvalidNameReason,
};
```

- [ ] **Step 5: Re-point the tests at the module and delete the harness**

In both `test/golden.test.js` and `test/legacy-removed.test.js`, replace:

```javascript
import { loadV0 } from './harness-v0.mjs';
const api = await loadV0();
```

with:

```javascript
import * as api from '../js/main.js';
```

In `test/legacy-removed.test.js`, the source-scanning assertions now need to read `js/main.js` rather than `index.html`. Change each `new URL('../index.html', import.meta.url)` to `new URL('../js/main.js', import.meta.url)`.

Then: `git rm test/harness-v0.mjs`

The harness has done its job. The fixtures it produced stay.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: `pass 9`, `fail 0`. Identical results through a completely different loading mechanism is the proof that the move was faithful.

- [ ] **Step 7: Smoke-test every interactive path**

Run: `python3 -m http.server 8000`

`file://` will no longer work — ES modules are blocked by CORS there. A local server is now mandatory for development.

Click through, and confirm no `Uncaught ReferenceError` appears in the browser console: add a person, add an exclusion, generate an exchange, copy one link, copy all links, open an assignment link, create a wishlist, generate its link, open it, decode it with the right password, then try a wrong password.

Any `ReferenceError: <name> is not defined` means Step 3's list is incomplete.

- [ ] **Step 8: Commit**

```bash
git add index.html js/main.js test/
git commit -m "refactor: load the app as an ES module from js/main.js"
```

---

## Task 8: Extract `js/codec.js`

**Files:**
- Create: `js/codec.js`, `test/codec.test.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `js/main.js` from Task 7.
- Produces: `utf8ToBytes(str) -> Uint8Array`, `bytesToUtf8(bytes) -> string`, `bytesToUrlSafeBase64(bytes) -> string`, `urlSafeBase64ToBytes(str) -> Uint8Array`.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes } from '../js/codec.js';

test('utf8 round-trips, including non-ASCII', () => {
  for (const s of ['Andrew', 'José', 'Zoë', "Mary-Anne O'Brien", 'hello']) {
    assert.equal(bytesToUtf8(utf8ToBytes(s)), s);
  }
});

test('base64url output is url-safe and unpadded', () => {
  // Five bytes, deliberately NOT a multiple of three: plain base64 of this input is
  // `+/++AAE=`, so the `=` half of the assertion below can actually fire. A 6-byte
  // input produces no padding at all, which would let an encoder that forgot
  // `.replace(/=/g, '')` pass unnoticed — the round-trip test cannot catch it either,
  // because its decoder re-pads before calling atob.
  const bytes = new Uint8Array([251, 255, 190, 0, 1]);
  const encoded = bytesToUrlSafeBase64(bytes);
  assert.ok(!/[+/=]/.test(encoded), 'found +, / or = in ' + encoded);
});

test('base64url round-trips arbitrary bytes at every length mod 3', () => {
  for (let n = 0; n < 12; n++) {
    const bytes = new Uint8Array(Array.from({ length: n }, (_, i) => (i * 37) % 256));
    assert.deepEqual(urlSafeBase64ToBytes(bytesToUrlSafeBase64(bytes)), bytes, 'length ' + n);
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/codec.test.js`
Expected: FAIL — `Cannot find module .../js/codec.js`.

- [ ] **Step 3: Create `js/codec.js`**

Move these four functions out of `js/main.js` verbatim and add `export`. The two base64 functions read exactly:

```javascript
export function bytesToUrlSafeBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function urlSafeBase64ToBytes(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
```

Copy `utf8ToBytes` and `bytesToUtf8` from `js/main.js` as they stand — faithfulness beats tidiness in this task.

- [ ] **Step 4: Import them in `js/main.js`**

Delete the four function definitions from `js/main.js` and add at the top:

```javascript
import { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes } from './codec.js';
```

Task 7's `export { ... }` block never listed these four, so there is nothing to remove from it. Add a re-export so existing importers keep working:

```javascript
export { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes };
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 12`, `fail 0`. The golden tests are the guard here — if base64 handling changed at all, they fail.

- [ ] **Step 6: Commit**

```bash
git add js/ test/
git commit -m "refactor: extract js/codec.js"
```

---

## Task 9: Extract `js/compress.js`

**Files:**
- Create: `js/compress.js`, `test/compress.test.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `compressBytes(data) -> Promise<Uint8Array>`, `decompressBytes(data) -> Promise<Uint8Array>`, constants `FORMAT_UNCOMPRESSED = 0x00`, `FORMAT_DEFLATE_RAW = 0x01`. Both functions prepend or consume a one-byte format header.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compressBytes, decompressBytes, FORMAT_UNCOMPRESSED, FORMAT_DEFLATE_RAW } from '../js/compress.js';

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);

test('round-trips text that compresses well', async () => {
  const text = 'Books about hiking, wool socks size 10, dark chocolate, a good pour-over coffee setup, nothing scented please. I like blue and green. No clothing unless its socks. Board games always welcome!';
  const packed = await compressBytes(enc(text));
  assert.equal(packed[0], FORMAT_DEFLATE_RAW, 'long text should use deflate');
  assert.ok(packed.length < text.length, 'deflate should have saved space');
  assert.equal(dec(await decompressBytes(packed)), text);
});

test('falls back to uncompressed when deflate would not help', async () => {
  const packed = await compressBytes(enc('socks'));
  assert.equal(packed[0], FORMAT_UNCOMPRESSED, 'short text should stay uncompressed');
  assert.equal(dec(await decompressBytes(packed)), 'socks');
});

test('round-trips empty input', async () => {
  assert.equal(dec(await decompressBytes(await compressBytes(enc('')))), '');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/compress.test.js`
Expected: FAIL — `Cannot find module .../js/compress.js`.

- [ ] **Step 3: Create `js/compress.js`**

Move `supportsCompression`, `FORMAT_UNCOMPRESSED`, `FORMAT_DEFLATE_RAW`, `compressBytes` and `decompressBytes` out of `js/main.js` verbatim. Export the two constants and the two functions; keep `supportsCompression` module-private.

Do not "improve" the `compressed.length < data.length + 1` guard — it is what makes the second test pass, and sub-project 2 depends on this behaviour.

- [ ] **Step 4: Import in `js/main.js`**

```javascript
import { compressBytes, decompressBytes } from './compress.js';
```

Then re-export so existing importers keep working: `export { compressBytes, decompressBytes };`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 15`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add js/ test/
git commit -m "refactor: extract js/compress.js"
```

---

## Task 10: Extract `js/secret.js`

**Files:**
- Create: `js/secret.js`, `test/secret.test.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `utf8ToBytes` from `js/codec.js`.
- Produces: `simpleHash(str) -> string`, `crc16(bytes) -> number`, `xorEncrypt(bytes, key) -> Uint8Array`, `xorDecrypt` (an alias of `xorEncrypt`).

`simpleHash` is deleted in sub-project 2. It is extracted here anyway so the golden fixtures keep passing.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simpleHash, crc16, xorEncrypt, xorDecrypt } from '../js/secret.js';

const enc = (s) => new TextEncoder().encode(s);

test('simpleHash reproduces the known fixture password', () => {
  const pw = simpleHash('pair-Kathryn-k7f3m2p9q1x4c').padStart(6, '0').substring(0, 6);
  assert.equal(pw, 's921er');
});

test('crc16 is stable and detects a single-character change', () => {
  const a = crc16(enc('wool socks'));
  assert.equal(a, crc16(enc('wool socks')), 'must be deterministic');
  assert.notEqual(a, crc16(enc('wool socky')));
  assert.ok(a >= 0 && a <= 0xFFFF, 'must fit in 16 bits');
  // Pins the ALGORITHM, not just byte-sensitivity: without this a stub returning the
  // byte sum passes every other assertion here. 0x29B1 is CRC-16/CCITT-FALSE's own
  // published check value for '123456789', so a failure names the algorithm.
  assert.equal(crc16(enc('123456789')), 0x29B1,
    'must remain CRC-16/CCITT-FALSE: 0x29B1 is that algorithm\'s published check value');
});

test('xor is symmetric and leaves length unchanged', () => {
  const plain = enc('gift ideas');
  const cipher = xorEncrypt(plain, 'abc123');
  assert.equal(cipher.length, plain.length);
  assert.notDeepEqual(cipher, plain);
  assert.deepEqual(xorDecrypt(cipher, 'abc123'), plain);
  // Without these two, a stub that XORs with a constant and ignores the key entirely
  // passes — and the wishlist password IS the key, so that stub would silently destroy
  // per-password secrecy while the suite stayed green.
  const other = xorEncrypt(plain, 'zzzzzz');
  assert.notDeepEqual(other, cipher, 'a different key must produce different ciphertext');
  assert.notDeepEqual(xorDecrypt(cipher, 'zzzzzz'), plain, 'the wrong key must not recover the plaintext');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/secret.test.js`
Expected: FAIL — `Cannot find module .../js/secret.js`.

- [ ] **Step 3: Create `js/secret.js`**

Move `simpleHash`, `crc16`, `xorEncrypt` and the `xorDecrypt` alias out of `js/main.js` verbatim, add `export` to each, and import `utf8ToBytes` from `./codec.js` for `xorEncrypt`.

- [ ] **Step 4: Import in `js/main.js`**

```javascript
import { simpleHash, crc16, xorEncrypt, xorDecrypt } from './secret.js';
```

Re-export: `export { simpleHash, crc16, xorEncrypt, xorDecrypt };`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 18`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add js/ test/
git commit -m "refactor: extract js/secret.js"
```

---

## Task 11: Extract `js/validate.js`

**Files:**
- Create: `js/validate.js`, `test/validate.test.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `isValidName(name) -> boolean`, `getInvalidNameReason(name) -> string | null`.

- [ ] **Step 1: Write the failing test**

Note the last case. `|` is currently *accepted* even though it is the field separator, which is the latent bug sub-project 2 fixes with length-prefixed names. This test documents today's behaviour deliberately; sub-project 2 will change it.

Note also that the reject list uses `'a\x00b'` (a control character, barred by the `/[&<>\x00-\x1F\x7F]/`
test at `index.html:893-905`) and **not** `'a b'`. Spaces are explicitly allowed — `isValidName('a b')`
returns `true` today. Asserting otherwise would force a behaviour change, which this plan forbids.

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidName, getInvalidNameReason } from '../js/validate.js';

test('accepts ordinary and international names', () => {
  for (const n of ['Andrew', 'José', "Mary-Anne O'Brien", 'Bob Jr.']) {
    assert.equal(isValidName(n), true, 'should accept ' + n);
    assert.equal(getInvalidNameReason(n), null);
  }
});

test('rejects empty, overlong, markup and punctuation-only names', () => {
  for (const n of ['', 'A'.repeat(51), 'a&b', 'a<b', 'a>b', '...', 'a\x00b']) {
    assert.equal(isValidName(n), false, 'should reject ' + JSON.stringify(n));
    assert.ok(getInvalidNameReason(n), 'should give a reason for ' + JSON.stringify(n));
  }
});

test('accepts a name at exactly the 50-character limit', () => {
  assert.equal(isValidName('A'.repeat(50)), true);
});

test('KNOWN BUG: the pipe separator is still accepted (fixed in sub-project 2)', () => {
  assert.equal(isValidName('Bob|Ann'), true);
});
```

> **The KNOWN BUG test is intentional — reviewers who flag it are overruled.** This plan's binding constraint is *no behaviour change*, and a characterisation test pinning today's behaviour is how that is enforced. Sub-project 2 inverts this assertion in the same commit that fixes the bug.

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/validate.test.js`
Expected: FAIL — `Cannot find module .../js/validate.js`.

- [ ] **Step 3: Create `js/validate.js`**

Move `isValidName` and `getInvalidNameReason` out of `js/main.js` verbatim, including their explanatory comments, and add `export` to each.

- [ ] **Step 4: Import in `js/main.js`**

```javascript
import { isValidName, getInvalidNameReason } from './validate.js';
```

Re-export: `export { isValidName, getInvalidNameReason };`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 22`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add js/ test/
git commit -m "refactor: extract js/validate.js"
```

---

## Task 12: Extract `js/assign.js`

**Files:**
- Create: `js/assign.js`, `test/assign.test.js`
- Modify: `js/main.js` (`generateSecretSanta`)

**Interfaces:**
- Consumes: nothing.
- Produces: `shuffle(array) -> Array`, `isValidAssignment(givers, receivers, exclusions) -> boolean`, and a new pure function `buildAssignment(people, exclusions, maxAttempts = 1000) -> string[] | null` returning receivers aligned by index with `people`, or `null` when no valid arrangement was found.

This is the one task that is not a pure move. `generateSecretSanta` currently interleaves DOM reading, validation, the search, and rendering. Only the search moves; everything else stays put and calls into it.

**Do not replace the rejection-sampling search with backtracking here.** That is a behaviour change and belongs to sub-project 2. Preserve the 1,000-attempt loop exactly as written.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, isValidAssignment, buildAssignment } from '../js/assign.js';

test('shuffle preserves membership and does not mutate', () => {
  const input = ['a', 'b', 'c', 'd', 'e'];
  const out = shuffle(input);
  assert.deepEqual([...out].sort(), [...input].sort());
  assert.deepEqual(input, ['a', 'b', 'c', 'd', 'e'], 'must not mutate its argument');
});

test('isValidAssignment rejects self-assignment and exclusions', () => {
  assert.equal(isValidAssignment(['a', 'b'], ['a', 'b'], {}), false);
  assert.equal(isValidAssignment(['a', 'b'], ['b', 'a'], {}), true);
  assert.equal(isValidAssignment(['a', 'b'], ['b', 'a'], { a: ['b'] }), false);
});

test('nobody ever draws themselves, over many runs', () => {
  const people = ['a', 'b', 'c', 'd', 'e'];
  for (let i = 0; i < 200; i++) {
    const receivers = buildAssignment(people, {});
    assert.ok(receivers, 'should always find an arrangement for 5 unconstrained people');
    people.forEach((p, idx) => assert.notEqual(receivers[idx], p));
  }
});

test('honours exclusions when it succeeds', () => {
  const people = ['a', 'b', 'c', 'd'];
  const exclusions = { a: ['b'], c: ['d'] };
  let succeeded = 0;
  for (let i = 0; i < 100; i++) {
    const receivers = buildAssignment(people, exclusions);
    if (!receivers) continue; // rejection sampling may give up
    succeeded++;
    assert.notEqual(receivers[0], 'b');
    assert.notEqual(receivers[2], 'd');
  }
  // Without this, a buildAssignment that always returned null would pass silently.
  assert.ok(succeeded > 0, 'rejection sampling never succeeded in 100 attempts');
});

test('returns null when no arrangement can exist', () => {
  assert.equal(buildAssignment(['a', 'b'], { a: ['b'], b: ['a'] }), null);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/assign.test.js`
Expected: FAIL — `Cannot find module .../js/assign.js`.

- [ ] **Step 3: Create `js/assign.js`**

`shuffle` and `isValidAssignment` move verbatim. `buildAssignment` is the search loop lifted out of `generateSecretSanta` unchanged:

```javascript
export function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function isValidAssignment(givers, receivers, exclusions) {
    for (let i = 0; i < givers.length; i++) {
        if (givers[i] === receivers[i]) return false;
        if (exclusions[givers[i]] && exclusions[givers[i]].includes(receivers[i])) return false;
    }
    return true;
}

// Rejection sampling, preserved exactly as it behaved inline. Sub-project 2
// replaces this with backtracking, which reports impossibility definitively
// rather than giving up after a fixed number of attempts.
export function buildAssignment(people, exclusions, maxAttempts = 1000) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const receivers = shuffle([...people]);
        if (isValidAssignment(people, receivers, exclusions)) return receivers;
        attempts++;
    }
    return null;
}
```

- [ ] **Step 4: Call it from `generateSecretSanta`**

In `js/main.js`, replace the local search — the `let givers`/`let receivers`/`attempts`/`while` block and the `if (attempts === maxAttempts)` guard — with:

```javascript
            sessionSalt = Math.random().toString(36).substring(2, 15);

            const givers = [...people];
            const receivers = buildAssignment(people, exclusions);

            if (!receivers) {
                alert('Could not generate a valid Secret Santa with these exclusions. Try removing some exclusion rules.');
                return;
            }
```

Keep the `alert` text character-for-character identical. Add the import:

```javascript
import { shuffle, isValidAssignment, buildAssignment } from './assign.js';
```

Re-export: `export { shuffle, isValidAssignment, buildAssignment };`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 27`, `fail 0`.

- [ ] **Step 6: Smoke-test generation**

Run: `python3 -m http.server 8000`, generate an exchange for four people with two exclusion rules, and confirm links appear and nobody is assigned to themselves.

- [ ] **Step 7: Commit**

```bash
git add js/ test/
git commit -m "refactor: extract js/assign.js with a pure search function"
```

---

## Task 13: Extract `js/format.js`

**Files:**
- Create: `js/format.js`, `test/format.test.js`
- Modify: `js/main.js`, `test/golden.test.js`, `test/legacy-removed.test.js`

**Interfaces:**
- Consumes: `js/codec.js`, `js/compress.js`, `js/secret.js`.
- Produces: `encodeAssignment(data) -> string`, `decodeAssignment(encoded) -> {giver, receiver, salt} | null`, `looksLikeOldLink(encoded) -> boolean`, `encodeHints(plaintext, password) -> Promise<string>`, `decodeHints(encoded) -> Promise<Uint8Array | null>`.

This is the module sub-project 2 rewrites wholesale. Getting its boundary right matters more than the others.

- [ ] **Step 1: Write the failing test**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeAssignment, decodeAssignment, looksLikeOldLink } from '../js/format.js';

test('assignment round-trips, including awkward names', () => {
  for (const [giver, receiver] of [
    ['Andrew', 'Kathryn'],
    ["Mary-Anne O'Brien", 'Bob Jr.'],
    ['A'.repeat(50), 'B'],
  ]) {
    const data = { giver, receiver, salt: 'k7f3m2p9q1x4c' };
    assert.deepEqual(decodeAssignment(encodeAssignment(data)), data, 'failed for ' + giver);
  }
});

test('rubbish decodes to null rather than throwing', () => {
  assert.equal(decodeAssignment('not-valid-at-all'), null);
  assert.equal(decodeAssignment(''), null);
});

test('looksLikeOldLink distinguishes outdated links from rubbish', () => {
  assert.equal(looksLikeOldLink('not-a-link-at-all'), false);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/format.test.js`
Expected: FAIL — `Cannot find module .../js/format.js`.

- [ ] **Step 3: Create `js/format.js`**

Move `encodeAssignment`, `decodeAssignment`, `looksLikeOldLink`, `encodeHints` and `decodeHints` out of `js/main.js` verbatim, adding `export` to each, with these imports at the top:

```javascript
import { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes } from './codec.js';
import { compressBytes } from './compress.js';
import { crc16, xorEncrypt } from './secret.js';
```

- [ ] **Step 4: Import in `js/main.js`**

```javascript
import { encodeAssignment, decodeAssignment, looksLikeOldLink, encodeHints, decodeHints } from './format.js';
```

Re-export: `export { encodeAssignment, decodeAssignment, looksLikeOldLink, encodeHints, decodeHints };`

- [ ] **Step 5: Point the golden tests at `js/format.js` directly**

In `test/golden.test.js` and `test/legacy-removed.test.js`, change `import * as api from '../js/main.js';` to `import * as api from '../js/format.js';`, and add a second import for the pieces the wishlist assertions use:

```javascript
import { xorEncrypt } from '../js/secret.js';
import { decompressBytes } from '../js/compress.js';
```

Replace `api.xorEncrypt` with `xorEncrypt` and `api.decompressBytes` with `decompressBytes` throughout.

In `test/legacy-removed.test.js`, re-point each source-scanning assertion at the file that actually
owns the code it scans. They do not all move to the same place:

| Assertion (from Task) | Reads | Why |
|---|---|---|
| `hash.startsWith('hints-')` (T2) | `js/main.js` | `checkForReveal` stays in `main.js` |
| `encoded.startsWith('JTdC')` (T2) | `js/format.js` | `decodeHints` moved to `format.js` in this task |
| `function legacyDecode` (T3) | `js/format.js` | decoding lives there now |
| the password-fallback assertions (T4) | `js/main.js` | `tryDecodeHintsWithPassword` is still in `main.js`; it moves in Task 15 |

The `JTdC` check currently sits inside the `#hints-` route test, which now reads a different file.
Move that one assertion into the existing `legacyDecode is gone from the source` test, which already
reads `js/format.js`. Do not add a new `test(...)` call — the suite must still report 30.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: `pass 30`, `fail 0`. The golden fixtures now decode through fully extracted modules — this is the strongest evidence that the refactor preserved behaviour.

- [ ] **Step 7: Commit**

```bash
git add js/ test/
git commit -m "refactor: extract js/format.js"
```

---

## Task 14: Extract `js/ui/dom.js` and `js/ui/setup.js`

**Files:**
- Create: `js/ui/dom.js`, `js/ui/setup.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `js/format.js`, `js/assign.js`, `js/validate.js`.
- Produces: from `dom.js` — `escapeHtml(text) -> string`, `copyToClipboard(text, button) -> Promise<void>`, `showError(message) -> void`. From `setup.js` — `addPerson()`, `addExclusion()`, `updateExclusionDropdowns()`, `getExclusions()`, `generateSecretSanta()`, `displayResults(assignments)`, `copyAllLinks()`, `getSessionSalt() -> string`.

These modules touch the DOM, so they get no unit tests. The golden tests and the browser smoke test are their coverage.

- [ ] **Step 1: Create `js/ui/dom.js`**

Move `escapeHtml`, `copyToClipboard` and `showError` out of `js/main.js` verbatim, adding `export` to each.

- [ ] **Step 2: Create `js/ui/setup.js`**

Move `addPerson`, `addExclusion`, `updateExclusionDropdowns`, `getExclusions`, `generateSecretSanta`, `displayResults` and `copyAllLinks` out of `js/main.js` verbatim, adding `export` to each, with:

```javascript
import { escapeHtml, copyToClipboard } from './dom.js';
import { encodeAssignment } from '../format.js';
import { buildAssignment } from '../assign.js';
import { isValidName, getInvalidNameReason } from '../validate.js';
```

`generateSecretSanta` assigns `sessionSalt`, which lives in `js/main.js`. Move that declaration into `js/ui/setup.js` and expose it through a getter so `reveal.js` can read it in Task 15:

```javascript
let sessionSalt = Math.random().toString(36).substring(2, 15);
export function getSessionSalt() { return sessionSalt; }
```

- [ ] **Step 3: Wire them into `js/main.js`**

```javascript
import { escapeHtml, copyToClipboard, showError } from './ui/dom.js';
import { addPerson, addExclusion, updateExclusionDropdowns, generateSecretSanta, copyAllLinks, getSessionSalt } from './ui/setup.js';
```

`revealAssignment` is still in `js/main.js` at this point and reads the bare name `sessionSalt`,
whose declaration has just moved into `setup.js`. Replace both of its references — the two
`data.salt || sessionSalt` expressions — with `data.salt || getSessionSalt()` **now**, in this task.
Do not defer it to Task 15: leaving the bare name would work only by accident, because
`decodeAssignment` always returns a truthy `salt` and `||` short-circuits before evaluating it.
Task 15 then moves code that is already correct.

The `Object.assign(window, { ... })` block from Task 7 stays exactly as it is — the names it publishes are now imported rather than locally defined, which does not change how inline handlers resolve them.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: `pass 30`, `fail 0`.

- [ ] **Step 5: Smoke-test the setup screen**

Run: `python3 -m http.server 8000`. Add a person, remove one, add an exclusion, watch the exclusion dropdowns repopulate as you type names, generate an exchange, copy one link, copy all links. The console must stay free of `ReferenceError`.

- [ ] **Step 6: Commit**

```bash
git add js/
git commit -m "refactor: extract js/ui/dom.js and js/ui/setup.js"
```

---

## Task 15: Extract `js/ui/reveal.js` and `js/ui/wishlist.js`

**Files:**
- Create: `js/ui/reveal.js`, `js/ui/wishlist.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `js/ui/dom.js`, `js/format.js`, `js/secret.js`, `js/compress.js`, `getSessionSalt` from `js/ui/setup.js`.
- Produces: from `reveal.js` — `revealAssignment(data)`. From `wishlist.js` — `showCreateHints(recipientName, salt)`, `generateHintLink()`, `showViewHints(encryptedBytes)`, `tryDecodeHintsWithPassword()`.

- [ ] **Step 1: Create `js/ui/reveal.js`**

Move `revealAssignment` out of `js/main.js` verbatim, with:

```javascript
import { escapeHtml } from './dom.js';
import { simpleHash } from '../secret.js';
import { getSessionSalt } from './setup.js';
```

Replace its bare references to `sessionSalt` with `getSessionSalt()`. There are two, both inside `data.salt || sessionSalt` expressions.

- [ ] **Step 2: Create `js/ui/wishlist.js`**

Move `showCreateHints`, `generateHintLink`, `showViewHints` and `tryDecodeHintsWithPassword` out of `js/main.js` verbatim, with:

```javascript
import { escapeHtml, copyToClipboard } from './dom.js';
import { encodeHints } from '../format.js';
import { simpleHash, crc16, xorDecrypt } from '../secret.js';
import { decompressBytes } from '../compress.js';
import { bytesToUtf8 } from '../codec.js';
```

The retained five-character transcription retry and its comment move across unchanged. Do not tidy it.

- [ ] **Step 3: Re-point the password-fallback assertions at `js/ui/wishlist.js`**

`tryDecodeHintsWithPassword` has just moved out of `js/main.js`. In `test/legacy-removed.test.js`,
the four assertions Task 4 added — `VALID:`, `.isLegacy`, `enteredPassword.startsWith('0')`, and the
count of `enteredPassword.length === 5` — must now read `new URL('../js/ui/wishlist.js', import.meta.url)`.

The count assertion is the one that matters: it asserts the retained transcription retry appears
**exactly once**, so if it scans a file that no longer contains the code it reads 0 and fails. Leaving
it on `js/main.js` fails here; it was already re-pointed away from `js/format.js` in Task 13.

- [ ] **Step 4: Wire them into `js/main.js`**

```javascript
import { revealAssignment } from './ui/reveal.js';
import { showCreateHints, generateHintLink, showViewHints, tryDecodeHintsWithPassword } from './ui/wishlist.js';
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 30`, `fail 0`.

- [ ] **Step 6: Smoke-test the full wishlist journey**

Run: `python3 -m http.server 8000`. Generate an exchange, open an assignment link, note the wishlist password, create a wishlist, generate its link, open that link, decode with the correct password, then reload and try a wrong password and confirm the error message appears.

- [ ] **Step 7: Commit**

```bash
git add js/ test/
git commit -m "refactor: extract js/ui/reveal.js and js/ui/wishlist.js"
```

---

## Task 16: Slim `js/main.js`, update the README, verify end to end

**Files:**
- Modify: `js/main.js`, `README.md`

**Interfaces:**
- Consumes: every module.
- Produces: `js/main.js` containing only imports, the `window` handler exposure, `checkForReveal`, and the bootstrap guard.

- [ ] **Step 1: Reduce `js/main.js` to routing and bootstrap**

Everything except `checkForReveal`, the `Object.assign(window, ...)` block and the bootstrap guard should now be imported. Delete any re-export lines added along the way that no longer have consumers — as of Task 13 the tests import from the owning modules directly.

Run: `wc -l js/main.js`
Expected: under 80 lines. If it is much larger, something was not moved.

- [ ] **Step 2: Confirm nothing is orphaned**

Run: `grep -cE '\bfunction\b' js/main.js`
Expected: exactly `2` — `async function checkForReveal()` and the anonymous input listener inside the bootstrap guard added in Task 7. This form matches whether the listener is written `function(e)` (as in the original source at `index.html:1614`) or `function (e)`. Any third match is code that should have moved to a module.

- [ ] **Step 3: Document the new development workflow in `README.md`**

Add a `## Development` section at the end, stating that: the app is plain ES modules with no build step, so `git push` deploys it; browsers block ES modules on `file://`, so it must be opened through a local server (`python3 -m http.server 8000`) rather than by double-clicking `index.html`; and tests run with `npm test`, with no dependencies to install.

- [ ] **Step 4: Run the full suite one final time**

Run: `npm test`
Expected: `pass 30`, `fail 0`.

- [ ] **Step 5: Verify the refactor changed no behaviour**

Run: `git diff f0e0a91 --stat -- index.html`

`index.html` should now be roughly 80 lines of markup, down from 1,623.

Then walk the full journey once more against `python3 -m http.server 8000`: generate for three people, open each of the three links, create a wishlist from one, decode it from another, and confirm the older-link message appears on `#QW5kcmV3fEthdGhyeW58dW51c2Vka2V5fGs3ZjNtMnA5cTF4NGM`.

- [ ] **Step 6: Commit**

```bash
git add js/main.js README.md
git commit -m "docs: record the local-server development workflow"
```

**CHECKPOINT — sub-project 1 complete.** `index.html` is markup only, every pure module has unit tests, and the golden fixtures captured in Task 1 still decode identically. Sub-project 2 (wire format v1) gets its own plan.

---

## Definition of Done

Sub-project 0 is complete when `index.html` has shrunk by roughly 90 lines and `npm test` reports `pass 10` (nine real tests plus the zero-test harness file — see Task 1, Step 6).

Sub-project 1 is complete when all of the following hold:

- `npm test` reports `pass 30`, `fail 0`
- `index.html` is roughly 80 lines of markup
- `js/main.js` is under 80 lines and defines only `checkForReveal` (plus the bootstrap listener)
- the four legacy fixtures do not decode; every other fixture decodes exactly as it did at `f0e0a91`
- a browser walk-through of the full journey — generate, reveal, create wishlist, decode wishlist, wrong password, old link — produces no console errors

Then hand off to superpowers:finishing-a-development-branch. Whether and when to merge to `main` is the user's decision (see Stop Conditions).
