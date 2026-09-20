# Sub-project 2 — Honest Wording, Name Validation, Short Salt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Base:** branch `sub-project-2`, forked from `main` at `4086098`. All line numbers below were read from the live files at that commit. The spec's own `index.html:NNNN` references predate sub-project 1's extraction and are stale — locate by content, never by the spec's numbers.

**Goal:** Make the privacy claim honest, reject the two characters that produce unusable links, and shorten the salt to four characters — with no wire-format change.

**Architecture:** Three independent changes, one per task, each shippable alone. Task 1 is copy only. Task 2 tightens `js/validate.js` and inverts the characterisation tests that sub-project 1 deliberately pinned. Task 3 adds a pure `makeSalt()` to `js/secret.js` and wires it into `js/ui/setup.js`, so the only new logic lives in a tested module rather than in the untested UI layer.

**Tech Stack:** Vanilla ES modules, no runtime dependencies, no build step. Tests use `node --test` (built in, Node v24.13.1). GitHub Pages serves `main` directly.

**Spec:** `docs/superpowers/specs/2026-09-14-restart-design.md` (revised 2026-09-19; see *Threat model* and *Design > Sub-project 2*)

## Global Constraints

- **Zero dependencies.** No `npm install`, no bundler, no build step. If a task seems to need a package, stop and ask.
- **No wire-format change.** XOR, `crc16`, `simpleHash`, the password screen, the five-character retry, `shuffle` and rejection sampling all stay exactly as they are. This sub-project changes copy, one validator, and the length of one random string.
- **The golden fixtures remain immutable.** `test/fixtures/v0-links.json` is never regenerated and `tools/gen-fixtures.mjs` can no longer run by design. Every existing fixture must still decode after all three tasks — the salt field is variable-length, so a shorter salt does not invalidate them.
- **User-facing copy is exact.** The three strings in Task 1 are quoted verbatim from the spec, emoji included. Do not reword, re-punctuate, or "improve" them.
- **Suite counts:** 30 at the start, 30 after Task 1, 30 after Task 2, **33** after Task 3. Any other number means something unintended happened.
- Commit after every task. Never commit with failing tests.

## Stop Conditions

Stop and ask the user — do not rule on these yourself:

- **Never `git push`.** Nothing on this branch has been pushed.
- **Never merge to `main`.** GitHub Pages serves `main` directly, so merging is a production deploy. That is the user's decision.

## Open decision for the user (surfaced, not silently taken)

The spec's wording bullet adds a line **under** the wishlist text box and softens the **post-creation** message. It says nothing about `js/ui/wishlist.js:32`, which sits directly **above** the text box and currently reads *"Only your Secret Santa can decode this."* — the same absolute claim the spec is removing everywhere else. Leaving it would place a false claim one line above the honest one.

Task 1 therefore also replaces that line with *"Only your Secret Santa gets the password."* — which is **true** as written (the password appears only on the right Santa's reveal page) and makes no claim about what decoding can be forced. This is the minimal edit that removes the contradiction without inventing new voice. If the user prefers the spec's literal scope, revert that one line; nothing else depends on it.

## File Structure

| File | Change | Task |
|---|---|---|
| `README.md` | Replace the false unlock claim with the gift-wrapping paragraph | 1 |
| `js/ui/wishlist.js` | Three copy strings (above box, under box, post-creation) + stale retry comment | 1 |
| `js/format.js` | Stale comment only — no code change | 1 |
| `js/validate.js` | Reject `\|` and `{`; two new reason messages | 2 |
| `test/validate.test.js` | Invert the two KNOWN BUG pins; add reason assertions | 2 |
| `js/secret.js` | New pure `makeSalt()` | 3 |
| `js/ui/setup.js` | Use `makeSalt()` at both salt sites | 3 |
| `test/secret.test.js` | Salt length/alphabet test; salt variety test | 3 |
| `test/format.test.js` | Full encode → decode → password → wishlist round trip | 3 |

---

## Task 1: Honest, lighthearted wording

**Files:**
- Modify: `README.md` (the "How it works" list, line 11), `js/ui/wishlist.js` (lines 32, 34-35 region, 82, and the comment at 174-175), `js/format.js` (comment at 12-14 only)

**Interfaces:**
- Consumes: nothing. Produces: nothing importable. Copy only.

No tests change in this task — the spec says the wording is verified by eye in the browser walk-through. Expected suite result afterwards is unchanged at `pass 30`, `fail 0`.

- [ ] **Step 1: Replace the README's unlock claim**

`README.md` currently reads:

```markdown
4. Wishlists are optional — if shared, only the right Santa can unlock them

This site doesn't store or collect any data — everything runs locally in your browser.
```

Replace those two lines with:

```markdown
4. Wishlists are optional — if shared, they're gift-wrapped for the right Santa

Wishlists are gift-wrapped, not locked in a vault. Wrapping paper stops accidental peeking — it won't stop a determined snoop with scissors, so maybe leave your bank PIN off the list. 🎁

This site doesn't store or collect any data — everything runs locally in your browser.
```

The long sentence is quoted verbatim from the spec. Do not alter it.

- [ ] **Step 2: Soften the claim above the wishlist text box**

In `js/ui/wishlist.js`, inside `showCreateHints`, find:

```html
            <p style="margin-bottom: 14px; font-size: 13px;">
                Only your Secret Santa can decode this.
            </p>
```

Replace the text only, keeping the markup and style attribute byte-identical:

```html
            <p style="margin-bottom: 14px; font-size: 13px;">
                Only your Secret Santa gets the password.
            </p>
```

(See *Open decision for the user* above for why this line is in scope.)

- [ ] **Step 3: Add the gift-wrapping line under the text box**

Immediately below the `<textarea id="hintsText" ...>` line and above the `<p id="hintLengthWarning" ...>` line, add:

```html
            <p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
                Gift-wrapped, not vault-locked 🎁 — keep the bank PINs off your list.
            </p>
```

`--text-muted` is an existing CSS custom property used elsewhere in this file's templates; it needs no stylesheet change.

- [ ] **Step 4: Soften the post-creation message**

In `generateHintLink`, find:

```html
            <p style="font-size: 13px; margin: 10px 0;">
                Share this with your group. Only your Secret Santa can decode it.
            </p>
```

Replace the text only:

```html
            <p style="font-size: 13px; margin: 10px 0;">
                Share this with your group — it's wrapped so only your Secret Santa should peek.
            </p>
```

Quoted verbatim from the spec.

- [ ] **Step 5: Leave the "How it works" box alone**

Further down the same template is:

```
Anyone can open this link, but only your assigned Santa has the password to decode it.
```

This is already accurate — it claims only that the Santa *has the password*, which is true. Do not change it. Confirm it is still present and unmodified. The same applies to "Only the assigned Secret Santa has this password" on the decode screen and "Invalid password. Only the assigned Secret Santa has the correct password." in the error branches — all three are true as written.

- [ ] **Step 6: Correct two comments the spec revision invalidated**

These were written during sub-project 1 against the *previous* spec, which planned a v1 wire format with base32 passwords. That design was dropped when the threat model narrowed, so both comments now promise things that will never happen. They are only findable by reading the files in full.

In `js/format.js`, above `looksLikeOldLink`, replace:

```javascript
// Recognises links issued before the 2026 cleanup, so they can be reported
// as outdated rather than as corrupt. Replaced by a version-byte check in
// sub-project 2.
```

with:

```javascript
// Recognises links issued before the 2026 cleanup, so they can be reported
// as outdated rather than as corrupt. A version-byte replacement was planned
// for a v1 wire format; that format was dropped when the threat model
// narrowed, so this shape-based check is the permanent one.
```

In `js/ui/wishlist.js`, above the retained five-character retry, replace:

```javascript
        // Retained deliberately: a six-character password transcribed by hand
        // may lose a leading zero. This is usability, not legacy compatibility.
        // Removed in sub-project 2, where fixed-length base32 passwords make
        // the ambiguity impossible.
```

with:

```javascript
        // Retained deliberately: a six-character password transcribed by hand
        // may lose a leading zero. This is usability, not legacy compatibility.
        // An earlier plan removed this once base32 passwords made the ambiguity
        // impossible; that format was dropped, so passwords are still typed and
        // this affordance is retained indefinitely.
```

Do not change the retry logic itself — only the comment above it.

- [ ] **Step 7: Run the suite**

Run: `npm test`
Expected: `pass 30`, `fail 0`. No test touches this copy; a change here means you edited something you should not have.

- [ ] **Step 8: Verify no other absolute claim survives**

Run: `grep -rn "can decode\|can unlock\|only the right Santa" README.md js/`
Expected: exactly one match — the "has the password to decode it" line from Step 5. Any other match is a claim that needs softening; report it rather than editing beyond this task.

- [ ] **Step 9: Commit**

```bash
git add README.md js/ui/wishlist.js js/format.js
git commit -m "docs: describe wishlist privacy honestly"
```

---

## Task 2: Reject `|` and `{` in participant names

**Files:**
- Modify: `js/validate.js`
- Test: `test/validate.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `isValidName(name)` now returns `false` for any name containing `|` or `{`; `getInvalidNameReason(name)` returns `"Name cannot contain '|'"` or `"Name cannot contain '{'"` for those cases.

**Why both characters.** `encodeAssignment` joins `giver|receiver|salt` with `|`, so a name containing `|` produces a four-field payload that `decodeAssignment` rejects. `decodeAssignment` separately refuses any payload containing `{`. Both therefore yield links that never decode — and worse, `looksLikeOldLink` reports both as *older-version* links, so the recipient is told to ask the organiser for a new one, who regenerates the identical broken link. Sub-project 1 pinned both as characterisation tests; this task inverts them in the same commit that fixes them.

- [ ] **Step 1: Invert the characterisation test**

In `test/validate.test.js`, replace the whole `KNOWN BUG` test — its comment and both assertions — with:

```javascript
test('rejects the two characters that produce unusable links', () => {
  // '|' is the field separator in the encoded link format and '{' is refused
  // outright by decodeAssignment's guard, so a name containing either produces
  // a link that never decodes — and looksLikeOldLink then reports it as an
  // older-version link, sending the recipient back to an organiser who
  // regenerates the identical broken link. Sub-project 1 pinned this as a
  // KNOWN BUG; these assertions are the inversion that fixes it.
  for (const n of ['Bob|Ann', '{Bob}', 'a|b', 'x{y', 'Ann|', '{']) {
    assert.equal(isValidName(n), false, 'should reject ' + JSON.stringify(n));
  }
  assert.equal(getInvalidNameReason('Bob|Ann'), "Name cannot contain '|'");
  assert.equal(getInvalidNameReason('{Bob}'), "Name cannot contain '{'");
});
```

Note `'{'` on its own is rejected for two independent reasons (the new rule, and having no alphanumeric character). That is fine — the assertion only checks it is rejected.

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/validate.test.js`
Expected: FAIL — `should reject "Bob|Ann"`, because `isValidName` still returns `true`.

- [ ] **Step 3: Reject both characters in `isValidName`**

In `js/validate.js`, the disallowed-character check currently reads:

```javascript
    // Disallow characters that cause HTML escaping issues or security concerns
    const disallowed = /[&<>\x00-\x1F\x7F]/;
    if (disallowed.test(name)) return false;
```

Replace with:

```javascript
    // Disallow characters that cause HTML escaping issues or security concerns,
    // plus the two that break the link format: '|' is the field separator in
    // encodeAssignment, and decodeAssignment refuses any payload containing '{'.
    const disallowed = /[&<>|{\x00-\x1F\x7F]/;
    if (disallowed.test(name)) return false;
```

Also update the header comment above the function, which currently ends:

```javascript
// Disallows: & < > and control characters (which cause HTML escaping mismatches)
```

to:

```javascript
// Disallows: & < > | { and control characters (HTML escaping mismatches, and
// the two characters that make an encoded link undecodable)
```

- [ ] **Step 4: Add the two reason messages**

In `getInvalidNameReason`, after the existing `[>]` line and before the control-character line, add:

```javascript
    if (/[|]/.test(name)) return "Name cannot contain '|'";
    if (/[{]/.test(name)) return "Name cannot contain '{'";
```

Order matters: these must come before the `hasAlphanumeric` check at the end, or a name like `{` would report "must contain at least one letter or number" instead of naming the real problem.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: `pass 30`, `fail 0`. The count is unchanged — the KNOWN BUG test was replaced, not added to.

- [ ] **Step 6: Confirm no existing fixture or test used either character**

Run: `grep -rn "Bob|Ann\|{Bob}" test/ js/`
Expected: matches only inside `test/validate.test.js`. The golden fixtures use `Andrew`, `José`, `Zoë`, `Mary-Anne O'Brien`, `Bob Jr.` and `A`×50 — none contains `|` or `{`, so no fixture is invalidated.

- [ ] **Step 7: Commit**

```bash
git add js/validate.js test/validate.test.js
git commit -m "fix: reject | and { in names, which produced undecodable links"
```

---

## Task 3: Four-character salt

**Files:**
- Modify: `js/secret.js`, `js/ui/setup.js`
- Test: `test/secret.test.js`, `test/format.test.js`

**Interfaces:**
- Consumes: `simpleHash`, `xorDecrypt` from `js/secret.js`; `encodeAssignment`, `decodeAssignment`, `encodeHints`, `decodeHints` from `js/format.js`; `decompressBytes` from `js/compress.js`.
- Produces: `makeSalt() -> string` from `js/secret.js`, always exactly 4 characters from `[0-9a-z]`.

**Why `js/secret.js`.** The salt is random secret material, and `js/secret.js` already holds the other secret primitives and is a tested pure module. Putting `makeSalt()` there rather than inline in `js/ui/setup.js` is what makes the spec's "salt is exactly 4 characters, over many draws" test possible at all — `js/ui/setup.js` is DOM-bound and has no automated coverage.

**Measured baseline.** The current expression `Math.random().toString(36).substring(2, 15)` produces 9-13 characters over 2,000 draws (mostly 10-11), not the "10 or 11" the spec estimates. Either way it becomes exactly 4.

- [ ] **Step 1: Write the failing salt tests**

Append to `test/secret.test.js`, and add `makeSalt` to its existing import from `../js/secret.js`:

```javascript
test('makeSalt returns exactly four characters from [0-9a-z]', () => {
  for (let i = 0; i < 2000; i++) {
    const s = makeSalt();
    assert.equal(s.length, 4, 'wrong length: ' + JSON.stringify(s));
    assert.match(s, /^[0-9a-z]{4}$/, 'out-of-alphabet salt: ' + JSON.stringify(s));
  }
});

test('makeSalt is actually random, not a constant', () => {
  // Without this, `return 'aaaa'` passes the test above.
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(makeSalt());
  assert.ok(seen.size > 50, 'expected many distinct salts, got ' + seen.size);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test test/secret.test.js`
Expected: FAIL — `makeSalt is not a function` (or an import error naming `makeSalt`).

- [ ] **Step 3: Add `makeSalt` to `js/secret.js`**

Add at the end of the file, and include `makeSalt` in the module's existing `export { ... }` line:

```javascript
// Four characters of [0-9a-z]. Math.random().toString(36) yields "0.xxxx…", so
// slicing from index 2 drops the "0." and every remaining character is already
// in the alphabet. padEnd covers the rare short draw — Math.random() can return
// 0, whose base-36 form is just "0" with nothing after the point.
function makeSalt() {
    return Math.random().toString(36).substring(2, 6).padEnd(4, '0');
}
```

Under this threat model the salt only has to make passwords differ between groups, so four characters is sufficient; it is not a secret.

- [ ] **Step 4: Run the salt tests to confirm they pass**

Run: `node --test test/secret.test.js`
Expected: PASS, 5 tests in that file.

- [ ] **Step 5: Write the failing round-trip test**

Append to `test/format.test.js`. Its existing first import line is:

```javascript
import { encodeAssignment, decodeAssignment, looksLikeOldLink } from '../js/format.js';
```

**Extend that line** rather than adding a second import from the same module, then add the two new module imports below it:

```javascript
import { encodeAssignment, decodeAssignment, looksLikeOldLink, encodeHints, decodeHints } from '../js/format.js';
import { makeSalt, simpleHash, xorDecrypt } from '../js/secret.js';
import { decompressBytes } from '../js/compress.js';
```

`Buffer` is a Node global and needs no import — `test/golden.test.js` already uses it the same way.

```javascript
test('a 4-character salt round-trips: encode -> decode -> password -> wishlist', async () => {
  const salt = makeSalt();
  assert.equal(salt.length, 4);

  const data = { giver: 'Andrew', receiver: 'Kathryn', salt };
  const decoded = decodeAssignment(encodeAssignment(data));
  assert.deepEqual(decoded, data, 'assignment must survive the shorter salt');

  // The password Andrew is shown for Kathryn's wishlist, derived exactly as
  // js/ui/reveal.js derives it.
  const password = simpleHash('pair-' + decoded.receiver + '-' + decoded.salt)
    .padStart(6, '0').substring(0, 6);
  assert.equal(password.length, 6, 'a shorter salt must not shorten the password');

  const plaintext = 'Wool socks size 10, dark chocolate';
  const bytes = await decodeHints(await encodeHints(plaintext, password));
  const plain = await decompressBytes(xorDecrypt(bytes, password));
  assert.equal(Buffer.from(plain.slice(2)).toString('utf8'), plaintext,
    'the password derived from a 4-character salt must open the wishlist');
});
```

The `slice(2)` drops the two CRC bytes, matching how `test/golden.test.js` reads a decrypted payload.

- [ ] **Step 6: Run it to confirm it passes**

Run: `node --test test/format.test.js`
Expected: PASS, 4 tests in that file. This test exercises code that already works; it exists to prove the shorter salt changes nothing downstream.

- [ ] **Step 7: Use `makeSalt` in `js/ui/setup.js`**

Add `makeSalt` to the imports at the top of `js/ui/setup.js`:

```javascript
import { makeSalt } from '../secret.js';
```

Then replace **both** salt expressions. Verify with `grep -c 'substring(2, 15)' js/ui/setup.js`, which must print `2` before the edit and `0` after.

> **Do not grep for `toString(36)`.** It appears **three** times in this file, and the third is not a salt: line 182 is `const inputId = 'link-' + Math.random().toString(36).substring(2, 8);`, which generates a unique DOM element id for each result row. Replacing it with a four-character `makeSalt()` would risk id collisions on a page with several links. `js/secret.js:10` also uses `.toString(36)`, inside `simpleHash` — likewise untouchable. Match on `substring(2, 15)`, which is unique to the two salt sites.

The module-level initialiser:

```javascript
let sessionSalt = Math.random().toString(36).substring(2, 15);
```

becomes:

```javascript
let sessionSalt = makeSalt();
```

and inside `generateSecretSanta`:

```javascript
    sessionSalt = Math.random().toString(36).substring(2, 15);
```

becomes:

```javascript
    sessionSalt = makeSalt();
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: `pass 33`, `fail 0` — 30 before, plus two salt tests and one round-trip test.

- [ ] **Step 9: Confirm the golden fixtures still decode**

Run: `node --test test/golden.test.js`
Expected: PASS, 3 tests. The fixtures carry a 13-character salt; the salt field is variable-length, so shortening new salts cannot affect them. If these fail, the change touched the format, which it must not.

- [ ] **Step 10: Measure the link shortening**

Run:

```bash
node --input-type=module -e "
globalThis.window = {};
const { encodeAssignment } = await import('./js/format.js');
const { makeSalt } = await import('./js/secret.js');
const short = encodeAssignment({ giver: 'Andrew', receiver: 'Kathryn', salt: makeSalt() });
const long  = encodeAssignment({ giver: 'Andrew', receiver: 'Kathryn', salt: 'k7f3m2p9q1x4c' });
console.log('4-char salt payload:', short.length, 'chars');
console.log('13-char salt payload:', long.length, 'chars');
console.log('saved:', long.length - short.length, 'characters');
"
```

Expected: the shorter payload saves roughly 6-9 characters. Record the actual numbers in your report — the spec predicts a full link going from ~88 to ~79 characters.

- [ ] **Step 11: Commit**

```bash
git add js/secret.js js/ui/setup.js test/secret.test.js test/format.test.js
git commit -m "feat: shorten the salt to four characters"
```

---

## Definition of Done

- `npm test` reports `pass 33`, `fail 0`
- No absolute privacy claim survives in `README.md` or `js/` except "has the password to decode it"
- `isValidName` rejects `|` and `{`, each with its own reason message, and the sub-project 1 KNOWN BUG pins are inverted rather than deleted
- `grep -c 'substring(2, 15)' js/ui/setup.js` prints `0`, while `js/ui/setup.js:182`'s element-id generator and `simpleHash`'s own `toString(36)` are untouched
- Every golden fixture still decodes
- The wire format is unchanged: the only edit to `js/format.js` is a comment, and `js/codec.js`, `js/compress.js` and `crc16`/`xorEncrypt`/`simpleHash` in `js/secret.js` are untouched
- No comment anywhere still promises a v1 wire format, a version-byte check, base32 passwords, or the removal of the five-character retry

Then hand off to superpowers:finishing-a-development-branch. Whether and when to merge to `main` is the user's decision (see Stop Conditions).

## Browser walk-through (the wording is verified by eye)

Run `python3 -m http.server 8000` and confirm:

1. The wishlist creation screen reads "Only your Secret Santa gets the password." above the box and the gift-wrapping line below it, and the 🎁 renders as an emoji rather than mojibake.
2. After generating a wishlist link, the message reads "Share this with your group — it's wrapped so only your Secret Santa should peek."
3. Entering a participant named `Bob|Ann` shows "Name cannot contain '|'" and blocks generation; `{Bob}` shows "Name cannot contain '{'".
4. A generated assignment link is visibly shorter than before, still reveals correctly, and its wishlist still decodes with the password shown on the giver's page.
