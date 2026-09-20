# Simple Secret Santa — Restart Design

**Date:** 2026-09-14
**Status:** Approved. Revised 2026-09-19 twice: corrected after an independent
critic review, then re-scoped when the threat model was narrowed (see *Threat
model*). Sub-project 2 shrank from a new wire format to three small changes.
**Repo:** https://github.com/andrewPeekema/simple-secret-santa

## Context

The project has been dormant since 2025-12-21 (16 commits, one 1,623-line
`index.html`). The GitHub Pages deployment is live and serves `main` verbatim.
Christmas 2026 is roughly 14 weeks out.

Three goals drove this design. *(2026-09-19)* Goal 1 was later restated as
"make the privacy claim **honest**" — see *Threat model*.

1. Make the privacy claim in the README true.
2. Make the codebase maintainable enough to change safely.
3. Shorten the links, or make them easier to hand out.

## The core problem

The README promises "only the right Santa can unlock them." The code does not
deliver that, and the reason is a design decision rather than a bug.

Kathryn must encrypt her wishlist *for her Santa*, but she does not know who
her Santa is. Her Santa knows her name but has never spoken to her. They must
agree on a key with no server and no prior contact. The current answer is for
both sides to compute:

```js
simpleHash('pair-' + recipientName + '-' + salt)   // index.html:1264, :1373
```

Kathryn knows her own name; her Santa reads it from their link. The **salt is
the shared value that makes both derivations agree**, so it must appear in
every link (`index.html:1177`, `:1195`).

The consequence: any participant can read the salt out of their own link,
combine it with the group's names — which they already know — and derive
**every** participant's wishlist password. The hole and the feature are the
same mechanism, so removing the salt is not a fix; closing it would mean
replacing the key agreement. *(2026-09-19)* The user has ruled that it need
not be closed — see *Threat model*.

### Threat model

*(Rewritten 2026-09-19.)* The user's ruling: this is a lighthearted app for
relatives and friends, wishlists are not sensitive, and the only thing worth
defending against is **someone reading a wishlist by accidentally opening the
wrong link**. A participant who deliberately decodes their own link and runs
the hash in a console is out of scope — they have earned their lump of coal.

Against that bar the existing mechanism already suffices: a wishlist link
shows nothing without a password, and the password appears only on the right
Santa's page. The salt hole described above is real but needs deliberate
effort, so it is accepted rather than fixed. Assignment links have never had
any protection and cannot: whoever opens one sees the assignment.

What is *not* acceptable is the README claiming more than the code delivers.
The fix for goal 1 is therefore honest wording, not cryptography.

The original design — per-person random keys, a versioned wire format, and
later AES-GCM with stretched keys — was explored in depth and set aside under
this ruling. It is summarised under *Decisions deferred* so the reasoning is
not lost.

## Design

### Sub-project 2: three small changes

No wire-format change. XOR, `crc16`, `simpleHash`, the password screen, the
five-character retry, the shuffle and rejection sampling all stay as they are.

**1. Honest, lighthearted wording.** The metaphor is wrapping paper.

- README: replace "only the right Santa can unlock them" with: *"Wishlists
  are gift-wrapped, not locked in a vault. Wrapping paper stops accidental
  peeking — it won't stop a determined snoop with scissors, so maybe leave
  your bank PIN off the list. 🎁"*
- Wishlist-creation screen: one short line under the text box — *"Gift-wrapped,
  not vault-locked 🎁 — keep the bank PINs off your list."*
- The post-creation message "Only your Secret Santa can decode it"
  (`index.html:1384` before extraction; `js/ui/wishlist.js` after) is softened
  to match, e.g. *"Share this with your group — it's wrapped so only your
  Secret Santa should peek."*

**2. Reject `|` and `{` in names.** `isValidName` permits both, and both
produce links that cannot work. `encodeAssignment` uses `|` as its separator,
so a participant named `Bob|Ann` silently decodes to the wrong people. And
`decodeAssignment` refuses any payload beginning with `{`, so a giver named
`{Bob}` gets a link that never decodes and tells them to ask the organiser
for a new one — who regenerates the identical broken link. (Found by the
sub-project 1 final review.) `js/validate.js` rejects both characters
anywhere in a name, and `getInvalidNameReason` gives a friendly message. The
`KNOWN BUG` characterisation tests pinned in sub-project 1 flip from `true`
to `false` in the same commit.

**3. Four-character salt.** The salt is
`Math.random().toString(36).substring(2, 15)` — 10 or 11 characters. Under
this threat model it only needs to make passwords differ between groups, so it
becomes exactly 4 characters (pad if `toString(36)` comes up short). For
`Andrew`/`Kathryn` the link goes from ~88 to ~79 characters. The salt field is
already variable-length, so existing links happen to keep decoding; that is a
side effect, not a requirement — the user has ruled that old links need not
work.

### Breaking compatibility

The following are deleted outright (~110 lines) in sub-project 0, ahead of
the refactor: `legacyDecode` (`:834`), the four-field pipe branch of
`decodeAssignment` (`:956-959`), its JSON and legacy branches (within
`:963-981` — that range also holds the function's closing `return null; }`,
which stays), the `JTdC` branch
of `decodeHints` (`:1011-1027`), the `VALID:` prefix path (`:1466`), the
`#hints-` route (`:1592`), and the legacy portions of the retry cascade (`:1477-1496` and
`:1517`). The five-character retry at `:1507` is retained
— see Build order for why it is not legacy code.

Replaced by ~8 lines of old-link detection showing *"This link was created
with an older version of Simple Secret Santa. Ask the organiser for a new
one."* *(2026-09-19)* The rule differs by sub-project. In sub-project 0 the
live format is itself `giver|receiver|salt` as UTF-8, so a "not `0x01` and
contains `|`" test would reject every working link; sub-project 0 instead
detects the *shape* of the retired formats (the plan's `looksLikeOldLink`).
(A version-byte rule was planned for the v1 format; v1 is no longer being
built.)

Links in the retired formats stop working in sub-project 0. Accepted.

## Structure

`index.html` becomes markup only, loading `css/styles.css` and
`<script type="module" src="js/main.js">`. GitHub Pages serves ES modules with
the correct MIME type, so `git push` still deploys and the project keeps zero
JavaScript dependencies and zero build step. (The page does load Google Fonts
from a third party at `index.html:9`; that is unchanged.)

```
index.html            markup only
css/styles.css        the <style> block (index.html:10-592), moved verbatim
js/
  main.js             bootstrap + hash routing
  codec.js            UTF-8 and url-safe base64 conversion
  format.js           assignment and wishlist payload encoding; old-link detection
  compress.js         deflate-raw with capability probe and uncompressed fallback
  secret.js           crc16, XOR, simpleHash
  assign.js           shuffle + derangement with exclusions
  validate.js         isValidName / getInvalidNameReason
  ui/dom.js           escapeHtml, copyToClipboard, section switching
  ui/setup.js         participant and exclusion form, generate, results list
  ui/reveal.js        assignment screen
  ui/wishlist.js      create and view wishlist screens
test/                 one .test.js per pure module, plus golden.test.js
test/fixtures/        golden v0 links captured before any deletion
tools/                one-shot fixture generator
package.json          {"type": "module"} only
```

The six modules between `main.js` and `ui/` are pure and DOM-free. They carry every
format decision, and they are the test target.

**Inline handlers.** *(2026-09-19)* `index.html` has 14 inline `onclick`
attributes, several inside `innerHTML` templates. Module scope is not global
scope, so all of them break the moment the script becomes `type="module"`.
The chosen approach is a shim: `main.js` assigns the handler functions onto
`window` (`Object.assign(window, {...})`). Rewiring to `addEventListener` is
not mechanical and is out of scope for a zero-behaviour-change refactor.

**Known regression:** ES modules are blocked under `file://` by CORS, so
double-clicking `index.html` will no longer work. Local development needs
`python3 -m http.server`. Documented in the README.

**Origin is never hardcoded.** Links are already built from `window.location`
(`:1219`) and must stay that way, so moving to a short custom domain later is
a DNS change plus a `CNAME` file, with no code edit. For reference, a
`santa.pk`-style domain would take the URL from 88 characters to roughly 48 —
a bigger win than every payload-encoding trick combined.

## Testing

`node --test`, built in, so the project gains **zero** test dependencies.

Sub-projects 0–1 are covered by the golden fixtures and the per-module
characterisation tests the plan specifies. Sub-project 2 adds:

- **validate** — `|` and `{` are each rejected with a reason message; the
  former `KNOWN BUG` assertions are inverted.
- **salt** — a generated salt is exactly 4 characters from `[0-9a-z]`, over
  many draws.
- **round trip** — an assignment built with a 4-character salt encodes,
  decodes, and yields a password that decrypts a wishlist encrypted for that
  recipient.

The wording changes are verified by eye in the browser walk-through.

## Build order

Four sub-projects. 0, 1 and 2 are each safe to ship on their own; 3 is
deferred without a design. Sub-projects 0 and 1 share one implementation plan
(`docs/superpowers/plans/2026-09-14-cleanup-and-modules.md`); 2 gets its own
spec revision and plan.

**Sub-project 0 — delete dead compatibility paths.** Runs first, before the
refactor, so that no doomed code is carried into the new module boundaries.
This is the larger saving: those ~110 lines would otherwise have to be read,
understood, and placed, and they would distort the structure — `format.js`
would grow a legacy section and `codec.js` would carry `legacyDecode` for a
format nobody uses.

Deleted: `legacyDecode` (`:834`), the four-field pipe branch of
`decodeAssignment` (`:956-959`) and its JSON and legacy branches (within
`:963-981`), the `JTdC` branch of `decodeHints`
(`:1011-1027`), the `VALID:` prefix path (`:1466`), the `#hints-` route
(`:1592`), the entire `isLegacy` branch of the retry cascade (`:1477-1496`),
and the leading-zero stripping at `:1517`. Added: the ~8-line old-link
message, keyed on the shape of the retired formats (see Breaking
compatibility).

**Explicitly retained:** the five-character retry at `:1507`. It is not
compatibility code. Current passwords are always exactly six characters, since
`padStart(6, '0').substring(0, 6)` guarantees it, so this branch fires when a
user transcribes `012345` as `12345` — a live usability affordance for today's
links. It shares a cascade, a shape, and a set of comments with the two legacy
branches around it, which is exactly why the deletion must be justified branch
by branch rather than by region. *(2026-09-19)* It is now retained
indefinitely: passwords are still typed, so the affordance is still needed.

Verified by capturing golden links from today's code beforehand — varied name
shapes, with and without wishlists, plus one per retired format — and
confirming the live ones still resolve afterwards. *(2026-09-19)* The plan
builds this as a small `node --test` suite over a temporary harness that evals
the inline script, rather than the throwaway script first envisaged here. The
fixtures are not wasted: sub-project 1 reuses them as characterisation tests,
and they remain the regression guard for sub-project 2.

Note that this ships a version that breaks some old links before the new
format exists. *(2026-09-19)* Only links in the retired formats break here;
the three-field pipe format dates from `258ab32` (2025-11-28), so most
2025-season links are in the current format and survive.
Acceptable either way: that exchange concluded in December.

**Sub-project 1 — refactor and tests.** Mechanical extraction of CSS and ES
modules with *zero* behaviour change, then characterisation tests describing
current behaviour. Operates on a file ~110 lines smaller, with module
boundaries shaped only by code that survives. Verified with the sub-project 0
fixtures. Safe to merge and deploy on its own; it is what makes sub-project 2
verifiable.

**Sub-project 2 — honest wording, `|` and `{` fix, short salt.** The three changes
under *Design*. Three small tasks, no separate plan document: handed to the
lead as a follow-up on the same branch once sub-project 1 is complete, so the
user reviews and merges once. No format break, so no deploy window to respect.

**Sub-project 3 — sharing UX.** **Deferred by the user, 2026-09-20.** Not
scheduled. A design was worked out on 2026-09-19 and is recorded here so it
need not be rediscovered:

- *Pass-the-device mode:* **dropped.** Every exchange so far has been remote.
- *Share buttons:* `navigator.share()` behind feature detection, beside the
  existing Copy Link buttons on the results rows and the wishlist screen; the
  link goes inside the message text (some targets drop `url` or `text`); a
  lasting "Sent ✓" per row. One tap per person is the ceiling — the browser
  needs a gesture per share and the page never sees contacts. Works on phones,
  Safari, and Chrome/Edge on Windows; not on Firefox desktop or Chrome on
  Linux, where the Copy buttons remain the whole story. Message building and
  feature detection would live in a DOM-free `js/share.js`, since only pure
  modules are testable here.
- *Known risk this would also have addressed — the draw is not persisted.*
  The generated draw lives only in memory (`sessionSalt` and
  `window.generatedLinks` in `js/ui/setup.js`); there is no storage and no
  `beforeunload` guard. If the organiser's tab reloads mid-send — mobile
  browsers discard background tabs routinely — the unsent links are gone, and
  generating again yields a different draw and salt, so the group ends up
  holding links from two incompatible draws with no warning. The proposed fix:
  keep the draw in `sessionStorage`, restore it on load, add a "Start over"
  button, and confirm before regenerating over an existing draw. This is a
  correctness risk independent of the Share button and is the part most worth
  picking up first if this sub-project is revived.
- *QR:* considered and set aside — it is a device-to-device channel, useless
  when one person generates every link on a single phone, and it would require
  a vendored local encoder, since an external QR API would transmit the secret
  links to a third party and destroy the property the fragment architecture
  exists to protect.

## Critic findings and their disposition

From the 2026-09-19 critic review of the original sub-project 2 design.

1. **Privacy claim false under 40-bit XOR** — accepted as true; resolved by
   narrowing the claim (see *Threat model*), not by stronger crypto.
2. **Format v1 does not shorten links** — moot; v1 dropped. The 4-character
   salt is the only shortening in scope (~9 characters).
3. **Case for backtracking unproven** — accepted; backtracking dropped.
   Rejection sampling stays (it samples uniformly, and two couples in four
   succeeds on 16.8% of attempts).
4. **Old `#h-` links under v1** — moot; no format break.
5. **XOR key material ambiguity** — moot; keying is unchanged.
6. **Crockford `I`/`L`/`O`** — moot; no base32 passwords.
7. **Password UI details** — moot; the password UI is unchanged.
8. **Deploy window** — moot; nothing invalidates outstanding links.

## Decisions deferred

- **Per-person random keys and a versioned wire format (the original design
  here).** Closes the salt hole, but only against a deliberate snoop, who is
  out of scope. Would also have broken every outstanding link.
- **AES-GCM with stretched short keys.** Worked through on 2026-09-19: two
  independent secrets per link is the minimum (hash chains and derived keys
  recreate the hole); two 6-byte secrets stretched with ~1M PBKDF2 iterations
  give ~2^68 work; pasting the wishlist link into one's own page removes the
  typed password. Lighter or classical ciphers save nothing — link length is
  set by key size, not cipher. Revisit only if wishlists ever become
  sensitive.
- **`santa.andrewpeekema.com` on GitHub Pages.** Saves 20 characters per link
  with no code change. De-scoped for now. If revisited: place it under the
  apex rather than under a subdomain that carries login cookies for other
  services, verify the domain in GitHub to close subdomain takeover, and
  delete the DNS record before ever retiring the site. Self-hosting was
  rejected: it would mean exposing a private network to serve a static page.
- **No-password honour-system gate** ("I'm her Santa" button). Simplest
  possible, but the user chose to keep a real speed bump.
- **AES-GCM instead of XOR (original note).** Now that compatibility is being broken, this
  would *delete* code — `crc16` and its framing exist only to detect a wrong
  password, which an AEAD tag does natively — at a cost of ~12 URL characters.
  It also closes the offline-cracking gap. Deferred as out of threat model.
- **5-bit name packing.** Restricted-alphabet bit-packing with a UTF-8 escape
  would take the URL from 88 to 83. Judged not worth a two-path codec and its
  test surface.
- **Short custom domain.** Costs ~$12/yr and no code. By far the largest
  available win; the design keeps it a one-file change.
