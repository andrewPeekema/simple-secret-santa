# Salt Source and Browser Verification

**Date:** 2026-09-20
**Status:** Approved by the user (both parts decided in the director session)
**Parent spec:** `docs/superpowers/specs/2026-09-14-restart-design.md`
**Base:** local `main` at `0cf9a6e` — sub-projects 0, 1 and 2 complete, 33 tests
passing, nothing pushed.

Two pieces of work stand between local `main` and a deploy. Do them in this
order, so the walk-through exercises the final code once.

## Part A — `makeSalt` draws from `crypto.getRandomValues`

`makeSalt()` in `js/secret.js` builds the four-character salt from
`Math.random()`. The salt is public by design, so its entropy is not the
issue. The issue is that it is the only `Math.random()` output the app
publishes, and the same generator stream draws the shuffle that decides the
pairings — the one secret in this app that matters. Drawing the salt from a
separate source removes that link at no cost in link length.

- Still exactly 4 characters from `[0-9a-z]`. Link length must not change.
- Unbiased: reject bytes ≥ 252 (the largest multiple of 36 below 256) before
  taking `% 36`.
- `globalThis.crypto` exists in Node 24, so the pure-module tests need no shim.
- Tests: the existing length/alphabet test stays; add one that fails if
  `makeSalt` touches `Math.random` (stub it to throw for the call).
- Replace the comment recording the declined scanner finding with one that
  states the actual reason for this change.
- The shuffle keeps `Math.random()`. A crypto-grade shuffle was considered
  and dropped under the narrowed threat model; do not widen scope to it.

## Part B — interactive browser verification

Nothing automated renders the page. The previous lead closed what it could
with a jsdom run and left these open. Drive the real app in a real browser,
capture evidence, and report.

### How

Only Firefox is installed on this host; there is no Chrome or Chromium, and
installing software is the user's decision, not yours.

- **Primary: Chrome on the Android emulator, driven over the Chrome DevTools
  Protocol through adb** — the pattern the `noodle-webview-console` skill
  uses (`~/.claude/skills/noodle-webview-console/`; read it for the
  mechanics, but this is plain Chrome, not the Noodle WebView). Serve the
  worktree with `python3 -m http.server 8000`, `adb reverse tcp:8000
  tcp:8000` so the emulator reaches it as `http://localhost:8000` (a secure
  context, so the clipboard API is live), forward the DevTools socket, then
  click, read the DOM, read the console, and take screenshots over CDP. A
  phone viewport is the right target: relatives open these links on phones.
  Use the `start-emulator` skill if no device is attached.
- **Secondary: one desktop-width render** of the landing page with
  `firefox --headless --screenshot`.
- Any scripts, screenshots and tooling live **outside the repo** (your
  scratchpad). The project keeps zero dependencies.
- If the emulator route cannot be made to work with reasonable effort, stop
  and tell the user what is missing. Do not install browsers or packages.

### Checklist, in priority order

1. **"How It Works" panel on the landing page.** Sub-project 2 added a second
   paragraph to a box whose paragraphs each draw a top border, then fixed the
   resulting double divider in CSS. That fix has never been seen rendered.
2. **Wishlist creation screen.** The two new gift-wrap lines render, the 🎁
   displays, and they do not collide with the length warning when it appears.
   Trigger each length-warning threshold.
3. **Post-creation message.** The gift-wrap line is still visible above it.
4. **Name validation at the form.** `|` and `{` are blocked in every shape —
   leading, trailing, middle, and as a whole name — each with its reason
   message; an ordinary name with an apostrophe or hyphen still passes.
5. **Five-character password retry.** Needs a recipient whose six-character
   password begins with `0`; find a name and salt that produce one using the
   pure modules under Node, build that link, then enter the password without
   its leading zero and confirm the wishlist opens.
6. **Both clipboard paths** — `navigator.clipboard` and the `execCommand`
   fallback — including the "Copied!" button state and Copy All Links.
7. **Wrong password.** The error screen shows and the console stays free of
   uncaught errors.
8. **Full journey, zero console errors:** generate for three people, open all
   three links, create a wishlist from one, decode it from its Santa's page,
   and open the retired-format link
   `#QW5kcmV3fEthdGhyeW58dW51c2Vka2V5fGs3ZjNtMnA5cTF4NGM` to see the
   older-version message. Confirm a generated link is 79 characters for
   `Andrew`/`Kathryn` on `localhost` equivalents — i.e. the payload is 26
   characters after the `#`.

### Deliverable

Show the user the screenshots as you go. Finish with
`docs/superpowers/verification/2026-09-20-browser-walkthrough.md`: one row per
check — what was done, the result, and the evidence — plus anything you could
not verify, said plainly. Screenshots themselves stay out of the repo.

### Defects

A small, clearly-scoped defect found during the walk-through (a CSS rule, a
string) may be fixed on this branch, test-first where a pure module is
involved, and re-verified. Anything that changes behaviour or touches the
wire format goes to the user first.

## Stop conditions

- **Never `git push`.** The user has said so again today. A push to
  `origin/main` deploys the live site.
- **Ask the user before merging to `main`.**
- No new dependencies in the repo; no software installs on the host.
