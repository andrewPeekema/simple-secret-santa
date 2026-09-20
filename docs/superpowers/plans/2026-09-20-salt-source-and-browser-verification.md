# Salt Source and Browser Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `makeSalt()` off the `Math.random()` stream that draws the pairings, then verify the whole app by hand in a real mobile browser and write down what was seen.

**Architecture:** Part A is a five-line change to one pure module plus a test that fails if `Math.random` is touched. Part B is not code: a throwaway Chrome DevTools Protocol harness, living entirely in the scratchpad, drives Chrome on the Android emulator against a `python3 -m http.server` copy of the worktree, reached through `adb reverse`. Each verification task works a slice of the spec's checklist, saves screenshots and notes to the scratchpad, and the last task collates them into the report.

**Tech Stack:** Vanilla ES modules, zero dependencies, `node --test`. Harness: Android emulator (`Pixel9_API34`), `adb`, Chrome for Android over CDP, `python3 -m http.server`, one `firefox --headless --screenshot` render.

**Spec:** `docs/superpowers/specs/2026-09-20-salt-source-and-browser-verification.md`
(parent: `docs/superpowers/specs/2026-09-14-restart-design.md` — read its *Threat model*)

## Global Constraints

- **Never `git push`.** A push to `origin/main` deploys the live site. The user has said so again today.
- **Ask the user before merging to `main`.**
- **No new dependencies in the repo, and no software installs on the host.** The project has zero dependencies and no build step; it must stay that way.
- **Every script, screenshot and scratch file for Part B lives outside the repo**, under `$SS_SCRATCH` (see Task 2). The only repo file Part B creates is the report.
- **The shuffle keeps `Math.random()`.** A crypto-grade shuffle was considered and dropped under the narrowed threat model (parent spec, *Threat model*). Do not widen scope to it.
- **The salt stays exactly 4 characters from `[0-9a-z]`.** Link length must not change.
- **Do not "fix" the unbalanced `<div>` nesting in `index.html`.** The stray closing tag is what leaves `#revealSection`, `#hintsSection` and `#viewHintsSection` outside `#mainContainer`; the comment above them in the file explains why correcting it breaks every reveal while the tests stay green.
- **Defects found during the walk-through:** a small, clearly-scoped one (a CSS rule, a string) may be fixed on this branch, test-first where a pure module is involved, and re-verified. Anything that changes behaviour or touches the wire format goes to the user first — stop and ask.

### Harness convention — wrap every evaluated expression in an IIFE

`Runtime.evaluate` runs each expression in the page's **one shared global
scope**, as a classic script. Two consequences bite immediately, and both
look like harness failures rather than your mistake:

- A top-level `const`/`let` **persists between calls**, so sending
  `const n = [...]` twice throws `Identifier 'n' has already been declared`.
- Top-level `await` is a **syntax error** — the DevTools console wraps it for
  you, `Runtime.evaluate` does not.

So every expression with a statement or an `await` is wrapped, and returns its
value:

```js
(() => { const n = [...document.querySelectorAll('.person-name')]; n[0].value = 'Andrew'; return n.length; })()
```

```js
(async () => { await generateHintLink(); return document.querySelector('#hintLinkDisplay h3').textContent; })()
```

`cdp.mjs eval` passes `awaitPromise: true`, so the async form resolves before
it prints. Return primitives or a plain object of primitives — a DOM node or a
function serializes to `undefined`. The expressions in Tasks 3–5 are written
this way; keep any you add to the same rule.

---

### Task 1: `makeSalt` draws from `crypto.getRandomValues`

**Files:**
- Modify: `js/secret.js:44-56` (the comment block and `makeSalt`)
- Test: `test/secret.test.js` (add one test; leave the existing two `makeSalt` tests untouched)

**Interfaces:**
- Consumes: nothing new.
- Produces: `makeSalt(): string` — unchanged signature, still exactly 4 characters from `[0-9a-z]`. `js/ui/setup.js` imports it and calls it at module load and again in `generateSecretSanta()`; neither call site changes.

**Why:** the salt is the only `Math.random()` output the app publishes, and the same generator stream draws the shuffle that decides the pairings. Drawing the salt from a separate source removes that link at no cost in link length. The salt's *entropy* is not the point — it is public by design.

- [ ] **Step 1: Write the failing test**

Append to `test/secret.test.js`:

```js
test('makeSalt does not draw from Math.random', () => {
  // The salt is public, so this is not about entropy. It is about keeping the
  // one published draw off the generator stream that also draws the shuffle.
  const realRandom = Math.random;
  Math.random = () => { throw new Error('makeSalt must not call Math.random'); };
  try {
    for (let i = 0; i < 50; i++) {
      assert.match(makeSalt(), /^[0-9a-z]{4}$/);
    }
  } finally {
    Math.random = realRandom;
  }
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `node --test test/secret.test.js`
Expected: FAIL — `makeSalt must not call Math.random` thrown from the current implementation. The other 7 tests in the file pass.

- [ ] **Step 3: Replace `makeSalt` and its comment**

In `js/secret.js`, replace the whole comment block and function (from `// Four characters of [0-9a-z]. Math.random().toString(36) yields ...` through the closing brace of `makeSalt`) with:

```js
// Four characters of [0-9a-z], drawn from crypto.getRandomValues.
//
// Why not Math.random(): the salt is the only value this app publishes that
// comes from a generator, and the same Math.random() stream draws the shuffle
// in js/assign.js that decides the pairings — the one secret here that
// matters. Drawing the salt separately removes that link and costs nothing:
// the salt stays 4 characters, so links stay the same length.
//
// Bytes >= 252 are discarded rather than folded. 252 is the largest multiple
// of 36 below 256, so every accepted byte maps to exactly one of 7 values per
// character and the draw stays unbiased.
//
// This value is NOT a secret. It is stored in plaintext inside every
// participant's own assignment link, because it is the shared value that
// lets a giver and their recipient derive the same wishlist password
// without ever communicating. Its entropy therefore buys no confidentiality
// against anyone holding a link, and lengthening it would only lengthen
// every link.
const SALT_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function makeSalt() {
    const byte = new Uint8Array(1);
    let salt = '';
    while (salt.length < 4) {
        crypto.getRandomValues(byte);
        if (byte[0] >= 252) continue;
        salt += SALT_ALPHABET[byte[0] % 36];
    }
    return salt;
}
```

`crypto` is a global in Node 24 and in every browser that runs this app, so the pure-module tests need no shim.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS, 34 tests, 0 failures. In particular the existing `makeSalt returns exactly four characters from [0-9a-z]` (2000 draws) and `makeSalt is actually random, not a constant` (>190 distinct in 200) must still pass.

- [ ] **Step 5: Commit**

```bash
git add js/secret.js test/secret.test.js
git commit -m "feat: draw the salt from crypto.getRandomValues"
```

---

### Task 2: Verification harness, and the "How It Works" panel

Covers spec checklist item **1**, and the secondary desktop render.

**Files:**
- Create: `$SS_SCRATCH/cdp.mjs` (harness — **outside the repo**)
- Create: `$SS_SCRATCH/notes/01-how-it-works.md` (findings — outside the repo)
- Create: `$SS_SCRATCH/shots/*.png` (screenshots — outside the repo)
- Read only: `index.html:25-40`, `css/styles.css:454-533`

**Interfaces:**
- Produces, for Tasks 3–5: the running stack (emulator + `http.server` on 8000 + `adb reverse` + `adb forward tcp:9222`), the env vars `SS_SCRATCH` and `SS_WS`, and the four `cdp.mjs` verbs `nav`, `eval`, `shot`, `errs`.

**Background — what is being checked:** sub-project 2 added a second `<p>` to `.how-it-works-content`, whose `p` rule draws `border-top: 1px solid var(--border)` on every paragraph. `css/styles.css:528` adds a `p + p` rule that removes the border and the padding on the second one. That fix has never been seen rendered. The panel is a `<details>`, closed by default, so it has to be opened first.

- [ ] **Step 1: Set the scratchpad up and start the static server**

```bash
export SS_SCRATCH=/tmp/claude-1000/-home-andrew-ClaudeSandbox-simple-secret-santa-salt-and-walkthrough/9a546ecf-2ae7-46b6-9817-df0836663b94/scratchpad
mkdir -p "$SS_SCRATCH/shots" "$SS_SCRATCH/notes"
```

Serve the worktree (run in the background, from the repo root):

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Check it: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/index.html` → `200`.

- [ ] **Step 2: Confirm the emulator is up and reachable**

```bash
adb devices                       # expect one "emulator-5554   device"
adb shell getprop sys.boot_completed   # expect 1
```

If no device is attached, start one. **The emulator needs both `DISPLAY` and `XAUTHORITY`**, and this agent session inherits neither:

```bash
rm -f ~/.android/avd/*.avd/*.lock
export DISPLAY=:0
export XAUTHORITY=$(ls /run/user/1000/.mutter-Xwaylandauth.* | head -1)
export XDG_RUNTIME_DIR=/run/user/1000
~/Android/Sdk/emulator/emulator -avd Pixel9_API34 -gpu host -no-snapshot-load
```

Run that in the background **without** a trailing `&`. It reaches `sys.boot_completed=1` in about 10 seconds.

**Diagnosing a failure to launch — read this before tuning flags.** On 2026-09-20 this cost six attempts. The signature of a *missing X authority* is that the emulator core-dumps at the identical last log line, `Activated packet streamer for bluetooth emulation`, under **every** `-gpu` mode (`host`, `swiftshader_indirect`, `off`, `guest`, `auto`), with `-no-window`, and with `QT_QPA_PLATFORM=offscreen`. That looks exactly like the stale-lock-file failure documented in `~/.claude/memory/environment/android-setup.md`, and exactly like a graphics-driver crash, and it is neither:

- if the locks are genuinely absent and it still dies, it is not locks;
- if changing `-gpu` does not move the failure point, it is not graphics;
- if `emulator -accel-check` says "KVM (version 12) is installed and usable", it is not acceleration.

The tell is `Authorization required, but no authorization protocol specified` followed by `could not connect to display :0` — visible only on a **windowed** launch. `-no-window` hides that line and dies silently instead, so **diagnose with a windowed launch even when you intend to run headless.** The fix is `XAUTHORITY`, above. A `-no-window` run needs the cookie just as much.

Do not poll for the process with `pgrep -f "avd Pixel9_API34"` — that pattern matches your own shell's command line, so it never reports death and the loop spins forever. Poll `adb shell getprop sys.boot_completed` instead. For the same reason, never `pkill -f "avd Pixel9_API34"`: it kills the shell running the `pkill`. And **never** broaden a kill pattern to `qemu-system` or `qemu` — the Notes App VM runs on this host as `/usr/bin/qemu-system-x86_64 -name guest=notes-server` and that would take down the notes server, Authelia and the Yjs sync server.

- [ ] **Step 3: Point the emulator at the host server and open Chrome's DevTools socket**

```bash
adb reverse tcp:8000 tcp:8000          # emulator's localhost:8000 -> host's 8000
adb shell am start -a android.intent.action.VIEW \
  -d 'http://localhost:8000/index.html' com.android.chrome
adb forward --remove tcp:9222 2>/dev/null
adb forward tcp:9222 localabstract:chrome_devtools_remote
curl -s http://localhost:9222/json | head -c 400
```

`localabstract:` takes **one colon and no slashes**. `adb` accepts `localabstract://…` and prints the port as if it worked, but the forward goes nowhere and `/json` comes back empty.

`http://localhost:8000` is a secure context, which is what makes `navigator.clipboard` live in Task 4.

Stash the WebSocket URL of the `index.html` tab:

```bash
export SS_WS=$(curl -s http://localhost:9222/json \
  | python3 -c "import sys,json;print([t for t in json.load(sys.stdin) if 'localhost:8000' in t.get('url','')][0]['webSocketDebuggerUrl'])")
echo "$SS_WS"
```

If `/json` is `[]`: Chrome is not running, or the forward is stale.

- [ ] **Step 4: Write the CDP harness**

Create `$SS_SCRATCH/cdp.mjs`:

```js
#!/usr/bin/env node
/**
 * One-shot Chrome DevTools Protocol client for the Secret Santa walk-through.
 * Lives outside the repo on purpose: the project keeps zero dependencies.
 *
 *   node cdp.mjs nav  <url>        full document load, with the hooks installed
 *   node cdp.mjs eval <expression> returnByValue + awaitPromise
 *   node cdp.mjs shot <file.png>   Page.captureScreenshot
 *   node cdp.mjs errs              drain window.__ssErrs and window.__ssDialogs
 *
 * Reads $SS_WS. Borrows `ws` from the NotesApp checkout so it installs nothing.
 */
const WS_MODULE = process.env.SS_WS_MODULE ||
  '/home/andrew/ClaudeSandbox/NotesApp/notes-app/node_modules/ws/index.js';
const { default: WebSocket } = await import(WS_MODULE);

const WS_URL = process.env.SS_WS;
const [verb, arg] = process.argv.slice(2);
if (!WS_URL || !verb) {
  console.error('usage: SS_WS=<ws url> cdp.mjs nav|eval|shot|errs [arg]');
  process.exit(2);
}

// Installed before any page script runs, on every document.
//
// alert() and confirm() are overridden because a real dialog blocks the
// renderer and every later Runtime.evaluate hangs behind it. The messages are
// recorded instead, which is how the name-validation reasons get read. Note
// in the report that the dialogs were captured, not clicked.
const HOOKS = `
  window.__ssErrs = [];
  window.__ssDialogs = [];
  window.__ssConfirmReturns = true;
  addEventListener('error', (e) => {
    window.__ssErrs.push('error: ' + (e.message || String(e.error)));
  });
  addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    window.__ssErrs.push('unhandledrejection: ' + ((r && r.message) || String(r)));
  });
  (function () {
    const real = console.error;
    console.error = function (...a) {
      window.__ssErrs.push('console.error: ' + a.map((x) => String((x && x.message) || x)).join(' '));
      real.apply(console, a);
    };
  })();
  window.alert = function (m) { window.__ssDialogs.push('alert: ' + String(m)); };
  window.confirm = function (m) {
    window.__ssDialogs.push('confirm: ' + String(m));
    return window.__ssConfirmReturns;
  };
`;

const ws = new WebSocket(WS_URL);
let nextId = 1;
const pending = new Map();
const waiters = [];

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const waitFor = (method) =>
  new Promise((resolve) => waiters.push({ method, resolve }));

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  for (let i = waiters.length - 1; i >= 0; i--) {
    if (waiters[i].method === msg.method) waiters.splice(i, 1)[0].resolve(msg.params);
  }
});

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (r.exceptionDetails) {
    console.log('EXCEPTION:', r.exceptionDetails.exception?.description ??
      JSON.stringify(r.exceptionDetails));
    process.exit(1);
  }
  const v = r.result?.value;
  return typeof v === 'object' && v !== null ? JSON.stringify(v, null, 1) : String(v);
};

ws.on('error', (e) => { console.log('WS ERROR', e.message); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); },
  Number(process.env.CDP_TIMEOUT_MS || 30000));

await new Promise((r) => ws.on('open', r));
await send('Page.enable');
await send('Runtime.enable');

if (verb === 'nav') {
  await send('Page.addScriptToEvaluateOnNewDocument', { source: HOOKS });
  // Register the load waiter BEFORE sending the navigate, or the event can
  // arrive while the navigate response is still in flight and the wait hangs
  // until the timeout.
  //
  // about:blank first: Page.navigate to a URL that differs only in its hash
  // does not reload the document, and this app only reads the hash at load.
  let loaded = waitFor('Page.loadEventFired');
  await send('Page.navigate', { url: 'about:blank' });
  await loaded;
  loaded = waitFor('Page.loadEventFired');
  await send('Page.navigate', { url: arg });
  await loaded;
  console.log(await evaluate('document.title'));
} else if (verb === 'eval') {
  console.log(await evaluate(arg));
} else if (verb === 'shot') {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(arg, Buffer.from(data, 'base64'));
  console.log(arg);
} else if (verb === 'errs') {
  console.log(await evaluate(
    'JSON.stringify({errs: window.__ssErrs || null, dialogs: window.__ssDialogs || null})'));
} else {
  console.error('unknown verb: ' + verb);
  process.exit(2);
}
ws.close();
process.exit(0);
```

- [ ] **Step 5: Smoke-test the harness**

```bash
node "$SS_SCRATCH/cdp.mjs" nav 'http://localhost:8000/index.html'
node "$SS_SCRATCH/cdp.mjs" eval "document.querySelector('h1').textContent"
node "$SS_SCRATCH/cdp.mjs" errs
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/00-smoke.png"
```

Expected: `Secret Santa Generator`; `Simple Secret Santa`; `{"errs": [], "dialogs": []}`; a PNG that is not blank. **Check the PNG by opening it** — a harness that screenshots a white page is worse than no harness. If it is blank, the GPU mode is the first suspect; re-launch the emulator with `-gpu swiftshader_indirect` and retry.

If the emulator route cannot be made to work here, **stop and report what is missing.** Do not install a browser or a package.

- [ ] **Step 6: Open the panel and look at the divider**

```bash
node "$SS_SCRATCH/cdp.mjs" eval "document.querySelector('.how-it-works').open = true; 'opened'"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/01-how-it-works-open.png"
```

Read the computed borders, which is the objective half of the check:

```bash
node "$SS_SCRATCH/cdp.mjs" eval "JSON.stringify([...document.querySelectorAll('.how-it-works-content p')].map(p => ({text: p.textContent.trim().slice(0, 30), borderTop: getComputedStyle(p).borderTopWidth, paddingTop: getComputedStyle(p).paddingTop, marginTop: getComputedStyle(p).marginTop})))"
```

Expected: two paragraphs. The first (`Wishlists are gift-wrapped…`) has `borderTop: 1px` and `paddingTop: 12px`. The second (`This site doesn't store…`) has `borderTop: 0px`, `paddingTop: 0px`, `marginTop: 10px`. Anything else means the `p + p` rule is not winning.

- [ ] **Step 7: Look at the screenshot**

Open `01-how-it-works-open.png`. Confirm by eye: one divider line above the gift-wrap paragraph, none between the two paragraphs, the 🎁 renders as an emoji rather than a tofu box, and nothing overflows the panel at phone width. Record what you see — this is the check the spec called out as most in need of eyes.

- [ ] **Step 8: The one desktop-width render**

```bash
firefox --headless --window-size=1280,900 \
  --screenshot "$SS_SCRATCH/shots/01b-desktop-landing.png" \
  'http://127.0.0.1:8000/index.html'
```

Open it. The landing page should be centred and readable; the panel is closed here, which is expected — this render is for desktop layout only, not for the divider.

- [ ] **Step 9: Write the findings note**

Write `$SS_SCRATCH/notes/01-how-it-works.md`: for checklist item 1, what was done, pass/fail, the computed-style JSON, the screenshot paths, and anything that looked off. Note any harness limitation you hit (for example: dialogs are recorded by an override, not clicked).

No commit — nothing in the repo changed.

---

### Task 3: Wishlist creation screen, and name validation

Covers spec checklist items **2**, **3** and **4**.

**Files:**
- Create: `$SS_SCRATCH/notes/02-wishlist-screen.md`, `$SS_SCRATCH/notes/04-name-validation.md`
- Create: more `$SS_SCRATCH/shots/*.png`
- Read only: `js/ui/wishlist.js:34-57`, `js/ui/setup.js:104-111`, `js/validate.js`

**Interfaces:**
- Consumes: the running stack and `cdp.mjs` verbs from Task 2 (`SS_SCRATCH`, `SS_WS`). Re-export them if your shell is new; re-derive `SS_WS` with the Step-3 command from Task 2 if Chrome restarted.
- Produces: nothing later tasks depend on.

**Background:** `showCreateHints()` renders, in order, a `<textarea id="hintsText">`, then the gift-wrap line *"Gift-wrapped, not vault-locked 🎁 — keep the bank PINs off your list."*, then `<p id="hintLengthWarning">`, which is `display: none` until the `input` handler sees `length > 1500`. Above 2000 characters `generateHintLink()` also calls `confirm()`. The post-creation line in `#hintLinkDisplay` reads *"Share this with your group — it's wrapped so only your Secret Santa should peek."*

- [ ] **Step 1: Get to the wishlist screen the way a user does**

```bash
node "$SS_SCRATCH/cdp.mjs" nav 'http://localhost:8000/index.html'
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const n=[...document.querySelectorAll('.person-name')]; n[0].value='Andrew'; n[1].value='Kathryn'; n[2].value='Beatrix'; n.forEach(i=>i.dispatchEvent(new Event('input',{bubbles:true}))); generateSecretSanta(); return getComputedStyle(document.getElementById('results')).display})()"
node "$SS_SCRATCH/cdp.mjs" eval "window.generatedLinks[0].url"
```

Open Andrew's link with `nav`, then click through to the wishlist screen:

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Create Wishlist').click(); return getComputedStyle(document.getElementById('hintsSection')).display})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/02-wishlist-empty.png"
```

- [ ] **Step 2: Check the gift-wrap lines render**

```bash
node "$SS_SCRATCH/cdp.mjs" eval "JSON.stringify([...document.querySelectorAll('#hintsSection p')].map(p=>p.textContent.trim()))"
```

Expected: the "Only your Secret Santa gets the password." line and the gift-wrap line, exactly as written, with the 🎁 present. Confirm on the screenshot that the emoji renders and the text does not overflow at phone width.

- [ ] **Step 3: Trigger the 1500-character warning**

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const t=document.getElementById('hintsText'); t.value='x'.repeat(1499); t.dispatchEvent(new Event('input')); return getComputedStyle(document.getElementById('hintLengthWarning')).display})()"
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const t=document.getElementById('hintsText'); t.value='x'.repeat(1501); t.dispatchEvent(new Event('input')); return JSON.stringify({display: getComputedStyle(document.getElementById('hintLengthWarning')).display, text: document.getElementById('hintLengthWarning').textContent})})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/02-length-warning.png"
```

Expected: `none` at 1499; `block` and `Note: 1501 characters may create a long URL.` at 1501.

**This is the collision check the spec asks for.** With the warning showing, read the geometry of the gift-wrap line and the warning:

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const ps=[...document.querySelectorAll('#hintsSection p')]; const gift=ps.find(p=>p.textContent.includes('Gift-wrapped')); const w=document.getElementById('hintLengthWarning'); const a=gift.getBoundingClientRect(), b=w.getBoundingClientRect(); return JSON.stringify({giftBottom:a.bottom, warnTop:b.top, gap:b.top-a.bottom, overlap:b.top<a.bottom})})()"
```

Expected: `overlap: false` and a non-negative gap. Look at the screenshot too — numbers not overlapping is not the same as looking right.

- [ ] **Step 4: Trigger the 2000-character confirm**

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(async()=>{const t=document.getElementById('hintsText'); t.value='x'.repeat(2001); t.dispatchEvent(new Event('input')); window.__ssConfirmReturns=false; await generateHintLink(); return 'called'})()"
node "$SS_SCRATCH/cdp.mjs" eval "JSON.stringify({dialogs: window.__ssDialogs, linkShown: getComputedStyle(document.getElementById('hintLinkDisplay')).display})"
```

Expected: a recorded `confirm: Your hints are very long…` and `linkShown: none` — declining the confirm must abort. Then set `window.__ssConfirmReturns=true`, call `generateHintLink()` again, and confirm the link appears.

- [ ] **Step 5: Check the post-creation message (checklist item 3)**

With a short, ordinary wishlist:

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(async()=>{const t=document.getElementById('hintsText'); t.value='Wool socks, a good mug, nothing electronic.'; t.dispatchEvent(new Event('input')); window.__ssConfirmReturns=true; await generateHintLink(); return document.querySelector('#hintLinkDisplay h3').textContent})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/03-link-ready.png"
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const gift=[...document.querySelectorAll('#hintsSection p')].find(p=>p.textContent.includes('Gift-wrapped')); const r=gift.getBoundingClientRect(); return JSON.stringify({visible: r.height>0 && getComputedStyle(gift).display!=='none', top:r.top, share:document.querySelector('#hintLinkDisplay p').textContent.trim()})})()"
```

Expected: `Link Ready`; the gift-wrap line still visible *above* the new block; the share line reads "Share this with your group — it's wrapped so only your Secret Santa should peek." Save the generated `#h-…` URL — Task 4 needs a wishlist link.

- [ ] **Step 6: Name validation at the form (checklist item 4)**

Back to the landing page, then drive each shape through the real form. `getInvalidNameReason()` reports `|` before `{`, and `generateSecretSanta()` alerts `Invalid name "X": <reason>` and returns.

```bash
node "$SS_SCRATCH/cdp.mjs" nav 'http://localhost:8000/index.html'
node "$SS_SCRATCH/cdp.mjs" eval "
const cases = ['|Andrew','Andrew|','And|rew','|','{Andrew','Andrew{','And{rew','{'];
const out = [];
for (const name of cases) {
  window.__ssDialogs = [];
  const n=[...document.querySelectorAll('.person-name')];
  n[0].value=name; n[1].value='Kathryn'; n[2].value='Beatrix';
  n.forEach(i=>i.dispatchEvent(new Event('input',{bubbles:true})));
  generateSecretSanta();
  out.push({name, dialogs: window.__ssDialogs.slice(), resultsShown: getComputedStyle(document.getElementById('results')).display});
}
JSON.stringify(out, null, 1)"
```

Expected, for every one of the eight: exactly one recorded alert, `resultsShown: none`, and the reason `Name cannot contain '|'` or `Name cannot contain '{'` as appropriate. A bare `|` or `{` is rejected for the disallowed character, not for "must contain at least one letter or number" — that check runs later.

Then the names that must pass:

```bash
node "$SS_SCRATCH/cdp.mjs" nav 'http://localhost:8000/index.html'
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{window.__ssDialogs=[]; const n=[...document.querySelectorAll('.person-name')]; n[0].value=\"O'Brien\"; n[1].value='Mary-Jane'; n[2].value='Jean-Luc P.'; n.forEach(i=>i.dispatchEvent(new Event('input',{bubbles:true}))); generateSecretSanta(); return JSON.stringify({dialogs: window.__ssDialogs, results: getComputedStyle(document.getElementById('results')).display, links: (window.generatedLinks||[]).map(l=>l.name)})})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/04-apostrophe-hyphen-ok.png"
```

Expected: no dialogs, `results: block`, three links. Confirm on the screenshot that `O'Brien` renders as an apostrophe, not `&#39;`.

- [ ] **Step 7: Write the findings notes**

Write `$SS_SCRATCH/notes/02-wishlist-screen.md` (items 2 and 3) and `$SS_SCRATCH/notes/04-name-validation.md` (item 4): what was done, pass/fail per shape, the JSON evidence, the screenshot paths, and anything that looked wrong. If you found a defect, do not fix it here — write it down and raise it; the Global Constraints say which kinds may be fixed at all.

No commit — nothing in the repo changed.

---

### Task 4: Password retry, clipboard, wrong password

Covers spec checklist items **5**, **6** and **7**.

**Files:**
- Create: `$SS_SCRATCH/find-leading-zero.mjs` (a search script — outside the repo)
- Create: `$SS_SCRATCH/notes/05-password-retry.md`, `06-clipboard.md`, `07-wrong-password.md`
- Create: more `$SS_SCRATCH/shots/*.png`
- Read only: `js/ui/wishlist.js:137-212`, `js/ui/dom.js:10-38`, `js/compress.js:84-133`

**Interfaces:**
- Consumes: the Task 2 stack and verbs.
- Produces: the leading-zero name/salt pair and its links, for the report.

**Background:** `tryDecodeHintsWithPassword()` lowercases and trims the entry, rejects anything outside 5–6 characters, and — if a 5-character password fails — retries once with a `'0'` prefix. That is the affordance item 5 exercises: a six-character password beginning with `0` that a relative transcribes without its leading zero.

`copyToClipboard()` uses `navigator.clipboard.writeText` when available and falls back to a hidden `<textarea>` plus `document.execCommand('copy')`, then flips the button to `Copied!` with a green background for 2000ms.

**Expect item 7 to fail.** `decompressBytes()` in `js/compress.js` calls `writer.write(payload)` and `writer.close()` un-awaited. A wrong password whose first byte happens to leave the format byte at `0x01` sends garbage into `DecompressionStream`, and the resulting rejection escapes the `try`/`catch` — in a browser that is an unhandled rejection in the console. The comment at `js/compress.js:97-112` says so outright, and adds that anyone adding a wrong-password test through the UI must fix the `await` first. **Do not fix it in this task.** Capture what the console actually shows and report it; awaiting those calls changes behaviour, so it goes to the user.

- [ ] **Step 1: Find a recipient whose password starts with `0`**

Create `$SS_SCRATCH/find-leading-zero.mjs`:

```js
import { simpleHash } from '/home/andrew/ClaudeSandbox/simple-secret-santa-salt-and-walkthrough/js/secret.js';
import { encodeAssignment } from '/home/andrew/ClaudeSandbox/simple-secret-santa-salt-and-walkthrough/js/format.js';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
const password = (name, salt) =>
  simpleHash('pair-' + name + '-' + salt).padStart(6, '0').substring(0, 6);

outer:
for (const a of alphabet) for (const b of alphabet) for (const c of alphabet) for (const d of alphabet) {
  const salt = a + b + c + d;
  const pw = password('Kathryn', salt);
  if (pw.startsWith('0')) {
    console.log(JSON.stringify({
      giver: 'Andrew', receiver: 'Kathryn', salt, password: pw,
      typedWithoutZero: pw.slice(1),
      assignmentHash: encodeAssignment({ giver: 'Andrew', receiver: 'Kathryn', salt }),
    }, null, 1));
    break outer;
  }
}
```

Run: `node "$SS_SCRATCH/find-leading-zero.mjs"`
Expected: a JSON object whose `password` starts with `0` and whose `typedWithoutZero` is 5 characters. `encodeAssignment` is imported from the repo but nothing is written to it.

- [ ] **Step 2: Open that assignment link and read the password off the page**

```bash
node "$SS_SCRATCH/cdp.mjs" nav "http://localhost:8000/index.html#<assignmentHash>"
node "$SS_SCRATCH/cdp.mjs" eval "JSON.stringify({heading:document.querySelector('#revealSection h2').textContent, receiver:document.querySelector('.reveal-name').textContent, password:document.querySelector('#revealSection strong').textContent})"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/05-assignment-leading-zero.png"
```

Expected: the password shown on the page equals the script's `password`, and it starts with `0`. If the page and the script disagree, stop — that is a real bug, not a harness problem.

- [ ] **Step 3: Make that recipient a wishlist**

Click `Create Wishlist`, type a short list, call `generateHintLink()`, and read the `#h-…` URL out of `#hint-link-input`. Save it.

- [ ] **Step 4: Enter the password without its leading zero**

```bash
node "$SS_SCRATCH/cdp.mjs" nav "<the #h- url>"
node "$SS_SCRATCH/cdp.mjs" eval "(async()=>{document.getElementById('passwordInput').value='<typedWithoutZero>'; await tryDecodeHintsWithPassword(); return document.getElementById('decodedHints').textContent.trim()})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/05-five-char-retry.png"
node "$SS_SCRATCH/cdp.mjs" errs
```

Expected: `Wishlist Decoded` and the list text. That is checklist item 5 closed. Note whatever `errs` reports — the five-character retry doubles the exposure to the un-awaited rejection described above.

- [ ] **Step 5: Wrong password (checklist item 7)**

```bash
node "$SS_SCRATCH/cdp.mjs" nav "<the #h- url>"
node "$SS_SCRATCH/cdp.mjs" eval "(async()=>{document.getElementById('passwordInput').value='zzzzzz'; await tryDecodeHintsWithPassword(); return document.querySelector('#decodedHints .error').textContent.trim()})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/07-wrong-password.png"
node "$SS_SCRATCH/cdp.mjs" errs
```

Expected on the page: `Invalid password. Only the assigned Secret Santa has the correct password.` Record exactly what `errs` returns. Repeat with a wrong password whose **first character matches** the correct one (take the real password and change only its last character) — that is the shape most likely to reach `DecompressionStream` with the format byte intact. Report both results honestly, including a clean console if that is what you find.

- [ ] **Step 6: Both clipboard paths (checklist item 6)**

Generate links for three people, then the real path:

```bash
node "$SS_SCRATCH/cdp.mjs" eval "JSON.stringify({secure: window.isSecureContext, hasClipboard: !!(navigator.clipboard && navigator.clipboard.writeText)})"
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const b=document.querySelector('#linksList .copy-btn'); b.click(); return 'clicked'})()"
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const b=document.querySelector('#linksList .copy-btn'); return JSON.stringify({text:b.textContent, bg:b.style.background})})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/06-copied-state.png"
```

Expected: `secure: true`, `hasClipboard: true`, and the button reading `Copied!` on a green background. Chrome may require the tab to be focused for `writeText` to resolve; if it rejects, `copyToClipboard` alerts "Failed to copy" — that alert is recorded in `window.__ssDialogs`, so check there before calling it a pass.

Then force the fallback by hiding the API, which is the branch a non-secure context or an older browser takes:

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{window.__realClipboard = navigator.clipboard; Object.defineProperty(navigator, 'clipboard', {value: undefined, configurable: true}); return 'hidden'})()"
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{window.__ssDialogs=[]; const b=document.querySelectorAll('#linksList .copy-btn')[1]; b.click(); return JSON.stringify({text:b.textContent, bg:b.style.background, dialogs:window.__ssDialogs})})()"
```

Expected: `Copied!` again, no "Failed to copy" alert. `document.execCommand('copy')` is deprecated but still present in Chrome; if it returns false the button still flips, so also confirm no dialog fired. Restore with `Object.defineProperty(navigator,'clipboard',{value: window.__realClipboard, configurable: true})`.

Finally Copy All Links:

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{window.__ssDialogs=[]; copyAllLinks(); const b=document.getElementById('copyAllBtn'); return JSON.stringify({text:b.textContent, dialogs:window.__ssDialogs, count:(window.generatedLinks||[]).length})})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/06-copy-all.png"
```

Expected: `Copied!`, no dialogs, three links.

- [ ] **Step 7: Write the findings notes**

Write the three notes files with what was done, pass/fail, the evidence, and the screenshot paths. State plainly anything the harness could not settle — for example whether a real clipboard *read-back* was possible, which it may not be without a focused tab and a permission grant.

No commit — nothing in the repo changed.

---

### Task 5: Full journey, and the verification report

Covers spec checklist item **8**, and produces the deliverable.

**Files:**
- Create: `docs/superpowers/verification/2026-09-20-browser-walkthrough.md` (**the only repo file Part B adds**)
- Read only: `$SS_SCRATCH/notes/*.md`, `$SS_SCRATCH/shots/*.png`
- Read only: `js/format.js:17-40`, `js/main.js:7-32`

**Interfaces:**
- Consumes: the Task 2 stack and verbs, and every notes file from Tasks 2–4.
- Produces: the report. Nothing depends on it.

**Background:** `encodeAssignment` joins `giver|receiver|salt` as UTF-8 and base64url-encodes it. For `Andrew`/`Kathryn` with a 4-character salt that is 19 bytes, which is 26 base64 characters once the `=` padding is stripped — the number the spec asks you to confirm. The 79-character figure in the spec is the deployed GitHub Pages URL; on `localhost:8000` the URL is shorter, so **check the payload length, not the URL length**. `looksLikeOldLink()` reports a four-field pipe payload as an older-version link, which is what the retired-format link in the checklist decodes to.

- [ ] **Step 1: The journey — generate for three, open all three**

```bash
node "$SS_SCRATCH/cdp.mjs" nav 'http://localhost:8000/index.html'
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const n=[...document.querySelectorAll('.person-name')]; n[0].value='Andrew'; n[1].value='Kathryn'; n[2].value='Beatrix'; n.forEach(i=>i.dispatchEvent(new Event('input',{bubbles:true}))); generateSecretSanta(); return JSON.stringify(window.generatedLinks)})()"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/08-three-links.png"
```

Open each of the three URLs with `nav`, and for each read the giver, the receiver and the password, and screenshot it. Check the obvious invariant by hand: nobody is their own recipient, and the three recipients are the three people.

- [ ] **Step 2: Confirm the payload is 26 characters**

```bash
node "$SS_SCRATCH/cdp.mjs" eval "(()=>{const u=window.generatedLinks.find(l=>l.name==='Andrew').url; const h=u.split('#')[1]; return JSON.stringify({payload:h, payloadLength:h.length, urlLength:u.length, url:u})})()"
```

Expected: `payloadLength: 26`. Record the localhost `urlLength` as well, and say in the report that the spec's 79 is the deployed-URL figure.

- [ ] **Step 3: Create a wishlist from one, decode it from its Santa's page**

Open Kathryn's *recipient's* Santa link — that is, whichever giver was assigned Kathryn — note the password shown there. Separately open Kathryn's own assignment link, click `Create Wishlist`, write a short list, generate the `#h-` link. Then open that `#h-` link, enter the password read from her Santa's page, and confirm it decodes. Screenshot the decoded wishlist.

This is the end-to-end claim the whole app rests on: the password on the Santa's page opens the recipient's wishlist.

- [ ] **Step 4: The retired-format link**

```bash
node "$SS_SCRATCH/cdp.mjs" nav 'http://localhost:8000/index.html#QW5kcmV3fEthdGhyeW58dW51c2Vka2V5fGs3ZjNtMnA5cTF4NGM'
node "$SS_SCRATCH/cdp.mjs" eval "JSON.stringify({heading:document.querySelector('#revealSection h1').textContent, message:document.querySelector('#revealSection .error').textContent.trim()})"
node "$SS_SCRATCH/cdp.mjs" shot "$SS_SCRATCH/shots/08-old-link.png"
```

Expected: `Invalid Link` and `This link was created with an older version of Simple Secret Santa. Ask the organiser for a new one.`

- [ ] **Step 5: Zero console errors across the journey**

Run `errs` after each navigation above, not only at the end — the hooks are per-document, so a reload empties them. Collect every non-empty result. The spec asks for a journey with zero console errors; if the wrong-password path from Task 4 is the only source, say exactly that rather than reporting a clean run.

- [ ] **Step 6: Write the report**

Create `docs/superpowers/verification/2026-09-20-browser-walkthrough.md`. One row per checklist item, in the spec's order, with four columns: **Check**, **What was done**, **Result**, **Evidence**. Then:

- a short section on how it was driven (headless `Pixel9_API34`, Chrome over CDP through `adb`, `python3 -m http.server` via `adb reverse`, one `firefox --headless` desktop render), including the emulator's GPU mode and why the window is headless on this host;
- a section named **Not verified**, listing plainly anything that could not be settled and why — including that `alert()` and `confirm()` were captured by an override rather than clicked, and whatever the clipboard read-back could not confirm;
- any defect found, with its evidence, and whether it was fixed or referred to the user.

Screenshots stay out of the repo; reference them by their `$SS_SCRATCH/shots/...` paths.

- [ ] **Step 7: Verify the report against the notes**

Re-read the four notes files and confirm every claim in the report traces to one. Any row that says "pass" without evidence is a plan failure — fix it or mark it not verified.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/verification/2026-09-20-browser-walkthrough.md
git commit -m "docs: record the browser walk-through of the app"
```

- [ ] **Step 9: Tear the harness down**

```bash
adb forward --remove tcp:9222
adb reverse --remove tcp:8000
```

Stop the `http.server`. Leave the emulator running or shut it down with `adb emu kill` — say which in the report.
