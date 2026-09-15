# Simple Secret Santa — Restart Design

**Date:** 2026-09-14
**Status:** Awaiting review
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
**88-character URL** (down from 91).

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
excluding the ambiguous `I`, `L`, `O`, `U`. Fixed length is what removes the
leading-zero retry cascade (`:1481-1528`), which exists because
`simpleHash(...).toString(36)` produced variable-length output and
`padStart(6, '0')` was added later. The password input's "5-6 characters" rule
(`:1443`) becomes exactly 8.

### Breaking compatibility

The following are deleted outright (~110 lines): `legacyDecode` (`:834`), the
JSON and legacy branches of `decodeAssignment` (`:963-981`), the `JTdC` branch
of `decodeHints` (`:1011-1027`), the `VALID:` prefix path (`:1466`), the
`#hints-` route (`:1592`), and both leading-zero retry cascades
(`:1481-1528`).

Replaced by ~8 lines of old-link detection: if byte 0 is not `0x01` and the
decoded bytes are UTF-8 containing `|`, show *"This link was created with an
older version of Simple Secret Santa. Ask the organiser for a new one."*

Links issued for the 2025 exchange stop working. Accepted.

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

## Structure

`index.html` becomes markup only, loading `css/styles.css` and
`<script type="module" src="js/main.js">`. GitHub Pages serves ES modules with
the correct MIME type, so `git push` still deploys and the project keeps zero
runtime dependencies and zero build step.

```
index.html            markup only
css/styles.css        the 582-line <style> block, moved verbatim
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
test/                 one .test.js per pure module
```

The six modules above `ui/` are pure and DOM-free. They carry the entire
security model and every format decision, and they are the test target.

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

Three sub-projects, each independently shippable, each getting its own
implementation plan.

**Sub-project 1 — refactor and tests.** Mechanical extraction of CSS and ES
modules with *zero* behaviour change, then characterisation tests describing
current behaviour. Verified by capturing a set of links generated by today's
code and asserting the extracted modules decode them identically. Safe to
merge and deploy on its own; it is what makes sub-project 2 verifiable.

**Sub-project 2 — format v1.** Per-person keys, version byte, length-prefixed
names, base32 passwords, flags outside the cipher, deletion of the legacy
ladder, the `|`-in-names fix, and the crypto-grade shuffle. Ships the privacy
fix and the 88-character URL. Deploy well clear of an exchange in progress,
since it invalidates outstanding links; mid-September is a safe window.

**Sub-project 3 — sharing UX.** Deferred. Revisit with a tested codebase
underneath. The options explored: a pass-the-device in-person mode that needs
no links at all, and `navigator.share()` for one-tap-per-person remote
sending. QR was considered and set aside — it is a device-to-device channel,
useless when one person generates every link on a single phone, and it would
require a vendored local encoder, since an external QR API would transmit the
secret links to a third party and destroy the property the fragment
architecture exists to protect.

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
