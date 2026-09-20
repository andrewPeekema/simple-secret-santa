# Browser walk-through — Simple Secret Santa (2026-09-20)

Verifies Part B of `docs/superpowers/specs/2026-09-20-salt-source-and-browser-verification.md`
against local `main` after Part A (`makeSalt()` drawing from
`crypto.getRandomValues`, commit `080ee17`). Driven interactively over the
Chrome DevTools Protocol against Chrome for Android on an emulator, plus one
desktop Firefox render. Screenshots referenced below live outside the repo,
under `$SS_SCRATCH/shots/` (`$SS_SCRATCH` =
`/tmp/claude-1000/-home-andrew-ClaudeSandbox-simple-secret-santa-salt-and-walkthrough/9a546ecf-2ae7-46b6-9817-df0836663b94/scratchpad`).

Work was split across four tasks (2–5); each produced a findings note under
`$SS_SCRATCH/notes/`. This report collates all four, plus the full-journey
work done directly in this task, into the spec's checklist order.

## Checklist results

| Check | What was done | Result | Evidence |
|---|---|---|---|
| **1. "How It Works" panel divider** | Opened the `<details class="how-it-works">` panel on the landing page (phone viewport), read the computed border/padding/margin of both `.how-it-works-content p` elements, and screenshotted it. | **Pass.** Second paragraph: `borderTop: 0px`, `paddingTop: 0px` (the `p + p` rule at `css/styles.css:528` wins). First paragraph: `paddingTop: 12px` as expected; `borderTop` reads `0.761905px`, not the literal `1px` the plan expected — explained below, not a defect. | `$SS_SCRATCH/notes/01-how-it-works.md`; computed-style JSON `[{"text":"Wishlists are gift-wrapped, no...","borderTop":"0.761905px","paddingTop":"12px","marginTop":"14px"},{"text":"This site doesn't store or col...","borderTop":"0px","paddingTop":"0px","marginTop":"10px"}]`; `$SS_SCRATCH/shots/01-how-it-works-open.png` (one faint divider above paragraph 1, none between the two, 🎁 renders as a colour emoji, no overflow at phone width). |
| **2. Wishlist creation screen** | From a real assignment link, clicked the real `Create Wishlist` button; read the two gift-wrap `<p>` lines verbatim; drove the 1500-char and 2000-char thresholds through the real `hintsText` input and `generateHintLink()`; measured the geometry of the gift-wrap line against `#hintLengthWarning` while the warning was visible. | **Pass.** Both gift-wrap lines present with 🎁 intact. `hintLengthWarning` `display: none` at 1499 chars, `block`/`"Note: 1501 characters may create a long URL."` at 1501. Collision check: `{"giftBottom":357.28,"warnTop":369.28,"gap":12,"overlap":false}` — 12px gap, confirmed by eye on the screenshot, not just the numbers. Declining the 2000-char `confirm()` (`__ssConfirmReturns=false`) correctly aborted generation (`confirm: Your hints are very long...` recorded, `hintLinkDisplay` stayed `none`); accepting it produced the link. | `$SS_SCRATCH/notes/02-wishlist-screen.md`; `$SS_SCRATCH/shots/02-wishlist-empty.png`, `$SS_SCRATCH/shots/02-length-warning.png`. |
| **3. Post-creation message** | Generated a short, ordinary wishlist (`"Wool socks, a good mug, nothing electronic."`) and read `#hintLinkDisplay h3`, the gift-wrap `<p>`'s visibility/position, and the share line. | **Pass.** `#hintLinkDisplay h3` reads `Link Ready`. Gift-wrap line still `visible: true`, positioned above (`top: 321.28`) the new "Link Ready" block. Share line reads exactly `Share this with your group — it's wrapped so only your Secret Santa should peek.` | `$SS_SCRATCH/notes/02-wishlist-screen.md`; `$SS_SCRATCH/shots/03-link-ready.png`. |
| **4. Name validation at the form** | Drove all eight required shapes (`\|Andrew`, `Andrew\|`, `And\|rew`, `\|`, `{Andrew`, `Andrew{`, `And{rew`, `{`) as person 1 through the real `generateSecretSanta()`, then a passing case with an apostrophe and two hyphens (`O'Brien` / `Mary-Jane` / `Jean-Luc P.`). | **Pass.** All eight reject shapes produced exactly one recorded `alert()`, `resultsShown: none`, and the correct reason (`Name cannot contain '\|'` or `Name cannot contain '{'`); the bare `\|`/`{` cases were rejected for the disallowed character, not the "must contain a letter or number" check, confirming `getInvalidNameReason()`'s check order. The apostrophe/hyphen case produced no dialogs, `results: block`, and all three names preserved (`["O'Brien","Mary-Jane","Jean-Luc P."]`). | `$SS_SCRATCH/notes/04-name-validation.md`; `$SS_SCRATCH/shots/04-apostrophe-hyphen-ok.png` (see Not Verified — this frame shows the form, not the scrolled results). |
| **5. Five-character password retry** | The spec's own example name, `Kathryn`, is unrealisable (see Not Verified #5). Found `Olivia` instead: for every one of the 1,679,616 possible 4-character salts, `simpleHash('pair-Olivia-' + salt)` is exactly 5 raw base-36 characters, so `padStart(6,'0')` adds a leading zero unconditionally. Used salt `0000` → password `0fn288`. Built a real assignment link with Olivia as giver, created a wishlist through the real UI, then entered the password without its leading zero (`fn288`) on the `#h-` link. | **Pass.** `tryDecodeHintsWithPassword()`'s `'0'`-prefix retry decoded the wishlist: `"Wishlist Decoded\n\n... A cozy blanket, dark chocolate, and a new paperback novel."` Console clean (`{"errs":[],"dialogs":[]}`). | `$SS_SCRATCH/notes/05-password-retry.md`; `$SS_SCRATCH/shots/05-assignment-leading-zero.png`, `$SS_SCRATCH/shots/05-five-char-retry.png`. |
| **6. Both clipboard paths** | Exercised `navigator.clipboard.writeText` (the real path, requiring document focus and a trusted click — a plain synthetic `.click()` left the promise hanging, worked around with `Page.bringToFront` + `Input.dispatchMouseEvent`) and the `execCommand('copy')` fallback (hid `navigator.clipboard` first), plus `copyAllLinks()`. | **Pass at the UI/promise-resolution level; clipboard contents not verified** (see Not Verified #2). Real path: button flipped to `Copied!` on `rgb(56, 161, 105)` (`#38a169`), no dialog. Fallback path: same `Copied!`/green, no "Failed to copy" dialog. Copy All Links: `Copied!`, no dialogs, `count: 3`. | `$SS_SCRATCH/notes/06-clipboard.md`; `$SS_SCRATCH/shots/06-copied-state.png`, `$SS_SCRATCH/shots/06-copy-all.png`. |
| **7. Wrong password** | Entered several wrong passwords against a real wishlist link and read both the page and the console. First round used a 58-character plaintext that stores uncompressed (format byte `0x00`) and found the console clean for all shapes. Re-tested with a 943-character repetitive plaintext confirmed (in Node, before use) to store compressed (format byte `0x01`), against three wrong-password shapes. | **Partial — page correct, console criterion FAILS.** The spec's item 7 is a conjunction ("the error screen shows **and** the console stays free of uncaught errors"); only the first half holds. Page: every shape, both rounds, showed the exact expected text `Invalid password. Only the assigned Secret Santa has the correct password.` Console: a real defect was found and reproduced — see "Defect" below — so the console half of the check fails. Against the compressed wishlist, password `0zzzzz` (first character matches the real `0fn288`, format byte survives corruption) produced three console entries; `0fn289` (also first-character-matching) and `zzzzzz` (format byte corrupted to an unrecognized value) stayed clean. | `$SS_SCRATCH/notes/07-wrong-password.md`; `$SS_SCRATCH/shots/07b-wrong-0fn289.png`, `$SS_SCRATCH/shots/07b-wrong-0zzzzz.png`, `$SS_SCRATCH/shots/07b-wrong-zzzzzz.png`. |
| **8. Full journey, zero console errors** | Generated for Andrew/Kathryn/Beatrix; opened all three assignment links and read giver/receiver/password off each; confirmed the payload length; created a wishlist from Kathryn's own link and decoded it from Kathryn's Santa's (Andrew's) page; opened the retired-format link; ran `errs` after every navigation. | **Pass — the journey driven here was clean.** Every `errs` call after every navigation in this journey returned `{"errs":[],"dialogs":[]}`. **Payload length: 26 characters** (see below — this is the number the spec asks for; 79 is the deployed-URL figure). Invariant held: nobody is their own recipient (Andrew→Kathryn, Kathryn→Beatrix, Beatrix→Andrew in one run), and the three recipients are the three participants. Retired link decoded to `{"heading":"Invalid Link","message":"This link was created with an older version of Simple Secret Santa. Ask the organiser for a new one."}`. This journey does not include a wrong-password step; that path's console errors are a separately-documented, known defect (item 7, above) and are not counted against this item. | This task's own CDP session (commands and output below); screenshots `$SS_SCRATCH/shots/08-three-links.png`, `08-andrew-link.png`, `08-kathryn-link.png`, `08-beatrix-link.png`, `08-wishlist-decoded.png`, `08-old-link.png`. |

### Item 8 detail — the payload-length and journey evidence

Generated pairings, one run, invariant confirmed by hand:

```
[{"name":"Andrew","url":".../index.html#QW5kcmV3fEthdGhyeW58b3p1bw"},
 {"name":"Kathryn","url":".../index.html#S2F0aHJ5bnxCZWF0cml4fG96dW8"},
 {"name":"Beatrix","url":".../index.html#QmVhdHJpeHxBbmRyZXd8b3p1bw"}]
```
Andrew→Kathryn, Kathryn→Beatrix, Beatrix→Andrew: nobody self-assigned, the
three recipients are exactly the three participants. `errs` after this nav
and after opening each of the three links: `{"errs":[],"dialogs":[]}` in all
four cases.

Payload length, a separate live-browser generation (Andrew paired with
Beatrix in this particular run — `QW5kcmV3fEJlYXRyaXh8cDE5eA` decodes to
`Andrew|Beatrix|p19x`):

```
{"payload":"QW5kcmV3fEJlYXRyaXh8cDE5eA","payloadLength":26,
 "urlLength":59,"url":"http://localhost:8000/index.html#QW5kcmV3fEJlYXRyaXh8cDE5eA"}
```

**`payloadLength: 26`** is the number the spec's item 8 asks to confirm, and
it holds for the spec's own Andrew/Kathryn pairing too: `Kathryn` and
`Beatrix` are both 7 characters, so the two payloads are the same length.
Confirmed directly for the spec's exact pairing at the module level in Node,
before the UI check: `encodeAssignment({giver:'Andrew', receiver:'Kathryn',
salt:'ab12'})` → `QW5kcmV3fEthdGhyeW58YWIxMg` (`Andrew|Kathryn|ab12`), also
length 26.

**The spec's "79 characters" is the deployed GitHub Pages URL length**
(`https://<user>.github.io/simple-secret-santa/index.html#<26-char payload>`
is materially longer than `http://localhost:8000/index.html#<payload>`,
which measured `urlLength: 59` here). The local number differs from 79
because the local origin and path are shorter, not because the payload
differs — the payload is the same 26 characters `encodeAssignment` always
produces for this name/salt length.

End-to-end wishlist claim (fresh run: Andrew→Kathryn, Kathryn→Beatrix,
Beatrix→Andrew): opened Andrew's page (Kathryn's Santa) and read
`{"receiver":"Kathryn","password":"jjtoly"}`; separately opened Kathryn's own
assignment link, clicked the real `Create Wishlist` button, entered `"A
telescope, warm mittens, and a board game."`, generated the `#h-` link;
opened that link fresh and entered `jjtoly` — `tryDecodeHintsWithPassword()`
returned `"Wishlist Decoded ... A telescope, warm mittens, and a board
game."` Console clean throughout (`{"errs":[],"dialogs":[]}` after every nav
in this sub-journey). Screenshot: `$SS_SCRATCH/shots/08-wishlist-decoded.png`.

Retired-format link, and the module-level facts it rests on
(`decodeAssignment` returns `null` for a four-field pipe payload,
`looksLikeOldLink` returns `true` for the same — confirmed both in Node and
through the real page, which showed exactly the expected `Invalid Link`
screen):

```
nav '#QW5kcmV3fEthdGhyeW58dW51c2Vka2V5fGs3ZjNtMnA5cTF4NGM'
→ {"heading":"Invalid Link",
   "message":"This link was created with an older version of Simple Secret Santa. Ask the organiser for a new one."}
errs → {"errs":[],"dialogs":[]}
```

## How it was driven

- **Browser:** Chrome for Android, on the `Pixel9_API34` AVD. The task-2
  build launched the emulator **windowed** (`-gpu host`, not `-no-window`),
  confirmed directly from the running process's own environment
  (`DISPLAY=:0`, `XAUTHORITY=/run/user/1000/.mutter-Xwaylandauth.NTXUV3`) —
  this agent session inherits neither `DISPLAY` nor `XAUTHORITY` by default,
  so a windowed launch needs them exported explicitly first (the emulator's
  own diagnostics, documented in the task-2 report, show that a missing
  `XAUTHORITY` fails identically under every `-gpu` mode including
  `-no-window`, so a windowed launch was used to diagnose, and the working
  configuration — `-gpu host`, windowed, with `XAUTHORITY` set — was kept
  running rather than relaunched headless). It rendered to Xwayland on the
  host, not to a monitor the operator watches; from this agent's perspective
  it behaves as an unattended, headless target reached entirely over CDP.
- **Wiring:** `python3 -m http.server 8000 --bind 127.0.0.1` served the
  worktree from the repo root (verified still running as pid 514508 at the
  start of this task). `adb reverse tcp:8000 tcp:8000` let the emulator
  reach it as `http://localhost:8000` — a secure context, which is what
  makes `navigator.clipboard` live for item 6. `adb forward tcp:9222
  localabstract:chrome_devtools_remote` exposed Chrome's DevTools socket on
  the host; `$SS_SCRATCH/cdp.mjs` (built in task 2, reused unmodified
  through tasks 3–5) drove it over the raw WebSocket protocol (`nav`,
  `eval`, `shot`, `errs`), installing an `error`/`unhandledrejection`/
  `console.error` collector and an `alert`/`confirm` override on every new
  document.
- **Secondary desktop render:** one `firefox --headless --window-size=1280,900
  --screenshot` capture of the landing page at 1280×900, in task 2.
- Nothing was installed; the emulator, `adb`, and Firefox were all already
  present on the host, per the Global Constraints.

## Not verified

1. **`alert()` and `confirm()` were captured by an override, not clicked.**
   `cdp.mjs`'s injected hooks replace `window.alert`/`window.confirm` before
   any page script runs (a real dialog blocks the renderer and hangs every
   later `Runtime.evaluate`), recording the message text into
   `window.__ssDialogs` instead of showing it. Every "no dialogs" or
   "recorded alert: ..." result throughout this walk-through reflects that
   override's bookkeeping, not a screenshot of, or a click on, the browser's
   actual native dialog UI.
2. **Clipboard contents were never read back.** Item 6 confirmed that
   `copyToClipboard()` resolves without throwing and flips the button to
   `Copied!` with a green background on both the `navigator.clipboard` path
   and the `execCommand('copy')` fallback — but never called
   `navigator.clipboard.readText()` or inspected the OS clipboard to confirm
   the correct text actually landed there. This matters concretely for the
   fallback: `copyToClipboard()`'s fallback branch never checks
   `document.execCommand('copy')`'s boolean return value, so the button
   flips to `Copied!` whether or not the copy actually succeeded.
3. **`04-apostrophe-hyphen-ok.png` shows the form, not the scrolled results.**
   `Page.captureScreenshot` captures the current viewport as-is; it does not
   scroll to newly-rendered content below the fold. The apostrophe-rendering
   claim for item 4 therefore rests on that screenshot (which shows `O'Brien`
   as a literal apostrophe in the name input) plus the JSON evidence of
   `generatedLinks` (`["O'Brien","Mary-Jane","Jean-Luc P."]`) and the empty
   dialogs array — not on a screenshot of the scrolled-down results card
   itself.
4. **The desktop Firefox render is a capture artifact, not a layout defect.**
   `$SS_SCRATCH/shots/01b-desktop-landing.png` came back very dark (pixel
   brightness range 15–26 of 255) because `.container` in `css/styles.css`
   has a 0.6s `fadeIn` animation and `firefox --screenshot` captures
   immediately at load, with no settle time. A second capture in a
   throwaway profile with animations forced off matched the normal,
   high-contrast tonal range of the mobile screenshots. Not re-verified in
   this task; recorded here because it is exactly the kind of result that
   looks like a defect at a glance.
5. **The spec's item 5 example name, `Kathryn`, is unrealisable.** No salt in
   `[0-9a-z]{4}` gives `Kathryn` a leading-zero password: `simpleHash('pair-
   Kathryn-' + salt)` is always exactly 6 raw base-36 characters across the
   full 1,679,616-salt space, so `padStart(6,'0')` never has anything to
   pad. `Olivia`/salt `0000` was substituted (password `0fn288`); for
   `Olivia`, the raw hash is always exactly 5 characters, so *every* salt
   gives her a leading-zero password, not just the one used here.
6. **Only one browser/device combination was exercised.** Chrome for Android
   on the `Pixel9_API34` emulator (devicePixelRatio 2.625, 411 CSS px
   viewport) for the whole interactive walk-through, plus one static
   desktop-width Firefox render. No other browser (Safari, real Chrome
   desktop, Edge) and no physical device were tried.

## Defect found: a wrong password against a compressed wishlist leaves console errors

**Found in task 4, re-verified there after an initial false negative; not
re-produced independently in this task, which did not re-run the
wrong-password path (see item 8's evidence above — the journey it drove
was clean and did not need to include this path).**

**What happens:** entering a wrong password against a wishlist whose
plaintext was long/repetitive enough to compress (`compressBytes()` chose
`FORMAT_UNCOMPRESSED` = `0x00` for a 58-character test string in the first
attempt, which is why round 1 of the investigation initially, and
incorrectly, reported a clean console — that plaintext never reached
`DecompressionStream` for any password) produces console errors, for some
wrong-password shapes:

- `console.error: Decompression failed: The compressed data was not valid: invalid block type.`
- Two separate `unhandledrejection: The compressed data was not valid: invalid block type.` entries.

**Reproduction:** needs both (1) a plaintext that compresses (format byte
`0x01` — confirmed in Node before use, with a 943-character repetitive
string; a 58-character wishlist stores uncompressed and never reaches
`DecompressionStream` regardless of password) and (2) a wrong password whose
corrupted payload happens to form structurally invalid deflate-raw while
still preserving the format byte. Against the real password `0fn288`:
password `0zzzzz` triggers it (three console entries); `0fn289` does not,
though both preserve the format byte `0x01` after corruption; `zzzzzz`
corrupts the format byte itself to an unrecognized value and never reaches
`DecompressionStream` at all.

**Cause:** `decompressBytes()` in `js/compress.js` calls `writer.write(payload)`
and `writer.close()` without awaiting either promise. The paired
`reader.read()` loop is awaited and does land in the function's own `catch`
(producing the `console.error`), but the two un-awaited write-side promises
each separately reject and escape the `try`/`catch`, each becoming its own
`unhandledrejection` — three console entries from one decode attempt, all
reporting the same underlying error. The file's own comment at
`js/compress.js:97-112` predicts exactly this and says an `await` fix
changes behaviour and needs the user's sign-off first.

**User-visible impact:** none found. The page still shows the correct
`Invalid password. Only the assigned Secret Santa has the correct password.`
text in every shape tried, whether or not the console was dirty underneath —
so this is invisible to a user, but real.

**Disposition: documented, not fixed, per the user's ruling carried into
this task.** It is pre-existing (predates this branch's salt-source change)
and out of scope for Part A. `js/compress.js` was not touched.

## Teardown

`adb forward --remove tcp:9222` and `adb reverse --remove tcp:8000` were run
at the end of this task, and the `python3 -m http.server 8000` process (pid
514508) was stopped. **The emulator (`Pixel9_API34`, pid 529241) was left
running**, rather than killed with `adb emu kill` — it is inexpensive to
leave up and a future verification pass can reuse it without repeating the
`XAUTHORITY`/`DISPLAY` diagnosis documented in task 2.
