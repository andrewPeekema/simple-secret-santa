# Simple Secret Santa — Restart Design

**Date:** 2026-09-14
**Status:** Approved for sub-projects 0–1. Sub-project 2 is pending redesign —
see *Open questions for sub-project 2*. Revised 2026-09-19 after an independent
critic review; corrections are marked *(2026-09-19)*.
**Repo:** https://github.com/andrewPeekema/simple-secret-santa

## Context

The project has been dormant since 2025-12-21 (16 commits, one 1,623-line
`index.html`). The GitHub Pages deployment is live and serves `main` verbatim.
Christmas 2026 is roughly 14 weeks out.

Three goals drove this design:

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
same mechanism, so removing the salt is not a fix; the key agreement has to be
replaced.

### Threat model

The claim this design makes true is: **your own link reveals only your own
assignment.** A participant holding their own link learns their recipient and
nothing about anyone else's assignment or wishlist.

Explicitly *out* of scope: a participant who collects every link in the group
and is willing to run code offline. The wishlist cipher remains repeating-key
XOR, which such an attacker could break. Closing that would mean AES-GCM and a
password with real entropy; it is a deliberate deferral, not an oversight.

*(2026-09-19)* **Disputed — see open question 1.** Wishlist ciphertexts are
shared group-wide by design, so this boundary does not hold as drawn.

## Design

### Distributed keys instead of derived keys

At generation time, mint one random 5-byte key per participant, `W_person`,
using `crypto.getRandomValues`. Each assignment link carries exactly two:

```
Andrew's link:  giver=Andrew, receiver=Kathryn, W_Andrew, W_Kathryn
                                                 |          |
                        encrypt my own wishlist -+          +- decrypt Kathryn's
```

Andrew holds his own key and his recipient's. He cannot compute anyone else's,
because the keys are random rather than derived — there is no formula to run.
`simpleHash` is deleted.

Two keys is the minimum for this topology. `W_self` is required so a
participant can encrypt their own wishlist; `W_target` is required to read
their recipient's. Neither can be derived from the other without recreating
the hole.

### Wire format v1

Every payload begins with a version byte. The current format has no version
marker, which is exactly why breaking compatibility now is free and why the
next change must not be.

**Assignment link** — `#<base64url(payload)>`

| offset | size | field |
|---|---|---|
| 0 | 1 | version = `0x01` |
| 1 | 5 | `W_self` |
| 6 | 5 | `W_target` |
| 11 | 1 | `len(giver)` in bytes |
| 12 | n | giver, UTF-8 |
| 12+n | 1 | `len(receiver)` |
| 13+n | m | receiver, UTF-8 |

Total `13 + n + m` bytes. For `Andrew`/`Kathryn`: 26 B → 35 base64url chars →
**88-character URL**. *(2026-09-19)* This is not a shortening: today's salt is
`Math.random().toString(36).substring(2, 15)`, which is 11 characters 70% of
the time and 10 characters 26% of the time, so today's links are already 88 or
87 characters. The 91 originally quoted here was a 1-in-2,000 worst case.

Names are **length-prefixed, not delimiter-separated**. This fixes a latent
bug: `isValidName` (`:893`) permits `|`, but `encodeAssignment` (`:940`) uses
`|` as its separator, so a participant named `Bob|Ann` produces four fields,
matches the legacy four-field branch at `:956`, and silently decodes to the
wrong people. Length prefixes cost the same byte and admit any valid name.

**Wishlist link** — `#h-<base64url(payload)>`

| offset | size | field |
|---|---|---|
| 0 | 1 | version = `0x01` |
| 1 | 1 | flags; bit 0 = deflate-raw applied |
| 2 | .. | `XOR(key, CRC16(plaintext) ‖ plaintext)` |

Version and flags sit **outside** the encrypted region. The current code XORs
a known-constant format byte (`:705`, `:727`), handing an attacker the first
key byte as known plaintext. The CRC stays inside — it must, since detecting a
wrong key is its only job, and it is not attacker-known.

Deflate is retained for wishlists and only for wishlists. Measured on
representative payloads: a 200-character wishlist compresses 201 B → 144 B
(−28%), while every assignment-sized payload *grows* by 2 bytes, because 10 of
its 26 bytes are random key material and deflate's block header exceeds what
it can recover from ~13 bytes of names. The existing
`if (compressed.length < data.length + 1)` guard at `:736` already encodes
this empirically.

### Passwords

A 5-byte key renders as **8 Crockford base32 characters** — case-insensitive,
excluding the ambiguous `I`, `L`, `O`, `U`. Fixed length is what finally
retires the leading-zero retry cascade (`:1477-1528`), which exists because
`simpleHash(...).toString(36)` produced variable-length output and
`padStart(6, '0')` was added later. Sub-project 0 removes its two legacy
branches; this change removes the last one, since a fixed-length password
cannot be mis-transcribed by dropping a leading zero. The password input's
"5-6 characters" rule (`:1443`) becomes exactly 8.

### Breaking compatibility

The following are deleted outright (~110 lines) in sub-project 0, ahead of
the refactor: `legacyDecode` (`:834`), the four-field pipe branch of
`decodeAssignment` (`:956-959`), its JSON and legacy branches (within
`:963-981` — that range also holds the function's closing `return null; }`,
which stays), the `JTdC` branch
of `decodeHints` (`:1011-1027`), the `VALID:` prefix path (`:1466`), the
`#hints-` route (`:1592`), and the legacy portions of the retry cascade (`:1477-1496` and
`:1517`). The five-character retry at `:1507` is retained until sub-project 2
— see Build order for why it is not legacy code.

Replaced by ~8 lines of old-link detection showing *"This link was created
with an older version of Simple Secret Santa. Ask the organiser for a new
one."* *(2026-09-19)* The rule differs by sub-project. In sub-project 0 the
live format is itself `giver|receiver|salt` as UTF-8, so a "not `0x01` and
contains `|`" test would reject every working link; sub-project 0 instead
detects the *shape* of the retired formats (the plan's `looksLikeOldLink`).
The version-byte rule only becomes usable in sub-project 2, once v1 payloads
exist.

Links in the retired formats stop working in sub-project 0; every remaining
v0 link stops working in sub-project 2. Accepted.

### Assignment algorithm

Current generation shuffles with `Math.random()` (`:873`) and rejection-samples
up to 1,000 times (`:1179`). Two changes:

- Shuffle draws from `crypto.getRandomValues`.
- Rejection sampling is replaced by randomised backtracking over a shuffled
  candidate order. This finds a valid assignment whenever one exists and
  reports impossibility definitively. Today's message — *"Could not generate a
  valid Secret Santa with these exclusions"* — can be false: two couples in a
  group of four is satisfiable but tight enough that 1,000 random shuffles may
  all miss. At n ≤ 50 backtracking is instant.

**This is a scope addition** beyond the three stated goals — a correctness bug
found while reading. Flagged for explicit approval.

*(2026-09-19)* **Disputed — see open question 3.** The two-couples example is
wrong (a miss has probability ~2e-80), so no bug has been demonstrated.

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
  codec.js            base64url <-> bytes; Crockford base32 <-> key; length-prefixed strings
  format.js           pack/unpack v1 payloads; version byte; old-link detection
  compress.js         deflate-raw with capability probe and uncompressed fallback
  secret.js           key generation, XOR, CRC16
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

The six modules between `main.js` and `ui/` are pure and DOM-free. They carry the entire
security model and every format decision, and they are the test target.

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

`node --test`, built in, so the project gains **zero** test dependencies
alongside its zero runtime dependencies.

- **codec** — base64url and base32 round-trips; base32 rejects ambiguous
  characters and decodes case-insensitively; length-prefixed strings survive
  Unicode, 50-character names, apostrophes, hyphens, and `|`.
- **format** — pack/unpack round-trip; a v0 payload is rejected with the
  old-link message; truncated and corrupt payloads fail cleanly.
- **secret / compress** — wishlist encrypt/decrypt round-trip; a wrong key
  fails CRC; both the compressed and uncompressed paths round-trip; the
  capability probe's fallback path is exercised.
- **assign** — nobody draws themselves; exclusions are honoured; the
  two-couples-in-four case succeeds; a genuinely impossible set fails
  definitively; run over many random rosters.
- **The security property, tested directly** — for a roster of n, assert the n
  keys are distinct and that each link contains exactly two of them and never
  a third. This is the claim the README makes; it should fail loudly if a
  future change reintroduces derived keys.

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
by branch rather than by region. It becomes moot in sub-project 2, where
fixed-length base32 removes the ambiguity that makes it necessary, and is
deleted there.

Verified by capturing golden links from today's code beforehand — varied name
shapes, with and without wishlists, plus one per retired format — and
confirming the live ones still resolve afterwards. *(2026-09-19)* The plan
builds this as a small `node --test` suite over a temporary harness that evals
the inline script, rather than the throwaway script first envisaged here. The
fixtures are not wasted: sub-project 1 reuses them as characterisation tests,
and sub-project 2 repurposes them as "old link shows the older-version
message" tests.

Note that this ships a version that breaks some old links before the new
format exists. *(2026-09-19)* Only links in the retired formats break here;
the three-field pipe format dates from `258ab32` (2025-11-28), so most
2025-season links are in the current format and survive until sub-project 2.
Acceptable either way: that exchange concluded in December.

**Sub-project 1 — refactor and tests.** Mechanical extraction of CSS and ES
modules with *zero* behaviour change, then characterisation tests describing
current behaviour. Operates on a file ~110 lines smaller, with module
boundaries shaped only by code that survives. Verified with the sub-project 0
fixtures. Safe to merge and deploy on its own; it is what makes sub-project 2
verifiable.

**Sub-project 2 — format v1.** Per-person keys, version byte, length-prefixed
names, base32 passwords, flags outside the cipher, the `|`-in-names fix, the
crypto-grade shuffle, and deletion of the retained `:1507` retry. Its design
above is **not approved as written** — see *Open questions for sub-project 2*. Deploy well clear of an exchange in
progress, since it invalidates outstanding links. *(2026-09-19)* The
mid-September window first named here has passed without a sub-project 2 plan;
the deploy date is an open question below.

**Sub-project 3 — sharing UX.** Deferred. Revisit with a tested codebase
underneath. The options explored: a pass-the-device in-person mode that needs
no links at all, and `navigator.share()` for one-tap-per-person remote
sending. QR was considered and set aside — it is a device-to-device channel,
useless when one person generates every link on a single phone, and it would
require a vendored local encoder, since an external QR API would transmit the
secret links to a third party and destroy the property the fragment
architecture exists to protect.

## Open questions for sub-project 2

Raised by the 2026-09-19 critic review. None affects sub-projects 0–1. Each
must be settled in sub-project 2's own brainstorm before that work is planned;
until then the *Design* section above is a proposal, not a decision.

1. **The privacy claim stays false under 40-bit XOR.** Wishlist links are
   shared with the whole group by design (`index.html:1384`), so every
   participant holds every ciphertext without collecting anything. A
   repeating-key XOR with a 5-byte key falls to a 2^40 brute force filtered by
   the CRC16, and a short uncompressed wishlist falls to crib-dragging. The
   threat model's "willing to run code offline" boundary does not separate old
   from new — the salt attack needs a console too. Also, the hole and the fix
   concern wishlist confidentiality only; assignments were never exposed by
   it. Choose: move AES-GCM with a real-entropy key into scope (deletes
   `crc16` and its framing, ~12 more URL characters), or narrow the README
   claim to what XOR delivers.
2. **Format v1 does not shorten links** (see Wire format v1). Goal 3 is
   served only by the custom domain and sub-project 3. Restate the goal or
   pull one of those forward. The "5-bit name packing: 88 → 83" comparison
   inherits the same baseline.
3. **The case for backtracking is unproven.** Two couples in four succeeds on
   16.8% of attempts, so 1,000 attempts all missing has probability ~2e-80;
   no failing case for rejection sampling has been shown, and the
   "two-couples-in-four succeeds" test passes on today's code. Rejection
   sampling draws uniformly from valid assignments; randomised backtracking
   does not, and is worst-case exponential. "n ≤ 50" has no basis — the code
   caps name length at 50, not participants. Default unless a failing case
   appears: keep rejection sampling, adopt the crypto-grade shuffle, and
   soften the error message.
4. **Old `#h-` wishlist links under v1.** They are XOR ciphertext: byte 0 is
   effectively random (1 in 256 equals `0x01`) and there is no `|` to detect.
   Their behaviour and message are unspecified, and the test bullet "a v0
   payload is rejected with the old-link message" does not say which payload
   type it means.
5. **XOR key material.** `XOR(key, ...)` could mean the 5 raw bytes or the
   UTF-8 bytes of the 8-character base32 string; today's `xorEncrypt` uses the
   password string's UTF-8 bytes (`:983`). Moot if AES-GCM is adopted.
6. **Crockford `I`, `L`, `O`.** Standard Crockford decoding maps `I`/`L` → 1
   and `O` → 0; this spec says the decoder rejects them, which works against
   the transcription-robustness goal. Pick one.
7. **Password UI.** Beyond the length rule at `:1443`, the change also touches
   `maxlength="6"` and `text-transform: lowercase` at `:1419` and
   `.toLowerCase()` at `:1435`.
8. **Deploy window.** Must land well clear of any exchange in progress.

## Decisions deferred

- **AES-GCM instead of XOR.** Now that compatibility is being broken, this
  would *delete* code — `crc16` and its framing exist only to detect a wrong
  password, which an AEAD tag does natively — at a cost of ~12 URL characters.
  It also closes the offline-cracking gap. Deferred as out of threat model.
- **5-bit name packing.** Restricted-alphabet bit-packing with a UTF-8 escape
  would take the URL from 88 to 83. Judged not worth a two-path codec and its
  test surface.
- **Short custom domain.** Costs ~$12/yr and no code. By far the largest
  available win; the design keeps it a one-file change.
