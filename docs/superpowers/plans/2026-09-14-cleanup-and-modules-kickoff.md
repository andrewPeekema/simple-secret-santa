# Kickoff — Subagent-Driven Execution

**Plan:** `docs/superpowers/plans/2026-09-14-cleanup-and-modules.md`
**Spec:** `docs/superpowers/specs/2026-09-14-restart-design.md`
**Base commit:** `c95aafa` on branch `restart-2026`
**Written:** 2026-09-14

This front-loads the Setup work the `superpowers:subagent-driven-development`
skill requires before Task 1: workspace, pre-flight conflict scan, rulings,
model assignments, and stop conditions. The controller should read this, copy
the scan table and rulings into the ledger, and dispatch Task 1.

---

## 1. Workspace and branch

The repository at `~/ClaudeSandbox/simple-secret-santa` is a clone that exists
solely for this work. `restart-2026` carries three commits — the spec, a spec
revision, and the plan — and nothing else is in flight.

**Decision: work directly on `restart-2026`; no worktree.** The skill's default
is an isolated worktree, but its purpose is isolating feature work from other
work in the same checkout, and there is none here. `main` is untouched and stays
that way until a human merges.

Ledger lives at `.superpowers/sdd/2026-09-14-cleanup-and-modules/progress.md`,
created by `scripts/sdd-workspace`, first line:

```
# SDD ledger — plan: docs/superpowers/plans/2026-09-14-cleanup-and-modules.md
```

Record the base commit before each dispatch. Review packages take that commit
as BASE, never `HEAD~1` — several tasks here produce a single commit, but Task 7
and Task 14 may not.

---

## 2. Global constraints

Copied verbatim from the plan. Every task's requirements implicitly include
these, and a reviewer finding that contradicts one loses to the constraint.

- **Zero dependencies.** No `npm install`, no bundler, no test framework.
  `package.json` exists only to set `{"type": "module"}`.
- **No behaviour change in this plan.** Every golden fixture that decodes in
  Task 1 must still decode in Task 16, except the four legacy fixtures
  deliberately retired in Tasks 2–4.
- **Origin is never hardcoded.** Links build from `window.location`.
- **The five-character password retry is NOT legacy code.** It survives this
  plan. Deleting it is a defect, not a cleanup.
- **Deletions are justified branch by branch, never by region.**
- Commit after every task. Never commit with failing tests.

---

## 3. Pre-flight conflict scan

The skill requires a table, not a verdict: one row per task pair sharing a file
or interface, one row per task for self-consistency. Four findings, all ruled on
in section 4.

### Interfaces produced and consumed

| Producer | Consumer | Interface | Finding |
|---|---|---|---|
| T1 | T2–T5 | `loadV0()` export list | Clean — T5 Step 1 explicitly extends the list with `looksLikeOldLink` before using it |
| T1 | T2–T16 | `v0-links.json` shape | Clean — shape is fixed at creation and only read thereafter |
| T2 | T4, T13, T15 | `decodeHints -> Uint8Array \| null` | Clean — T4 consumes `encryptedBytes`, T13 re-exports, T15 takes `showViewHints(encryptedBytes)` |
| T3 | T5, T13 | `decodeAssignment` three-field only | Clean |
| T5 | T7, T13 | `looksLikeOldLink` | Clean — T7 Step 4 exports it, T13 moves it to `format.js` |
| T7 | T8–T13 | `js/main.js` export surface | Clean — each task removes its names and re-exports from the new owner |
| T8 | T10, T13 | `codec.js` | Clean — T10 imports `utf8ToBytes`, T13 imports all four |
| T9 | T13, T15 | `compress.js` | Clean — T13 needs only `compressBytes` (for `encodeHints`), T15 only `decompressBytes` |
| T10 | T13, T15 | `secret.js` | Clean — T13 imports `crc16`/`xorEncrypt`, T15 imports `simpleHash`/`crc16`/`xorDecrypt` |
| T11 | T14 | `validate.js` | Clean |
| T12 | T14 | `buildAssignment` | Clean |
| T13 | T14, T15 | `format.js` | Clean |
| T14 | T15 | `getSessionSalt`, `dom.js` | Clean — **no import cycle**: `setup.js` never imports `reveal.js`; `main.js` imports both |

### Files touched by more than one task

| File | Tasks | Finding |
|---|---|---|
| `index.html` | T2–T7 | **FINDING 1** — line numbers go stale as deletions land |
| `js/main.js` | T7–T16 | Clean — re-export lines accumulate by design; T16 Step 1 removes them |
| `test/legacy-removed.test.js` | T2–T5, T7, T13 | Clean — appended to, then re-pointed twice |
| `test/golden.test.js` | T1, T2, T7, T13 | Clean |

### Per-task self-consistency

| Task | Finding |
|---|---|
| T1 | Clean — characterisation tests correctly expected to pass on first run |
| T2 | **FINDING 1** — bottom-up deletion invalidates the `:1404`/`:1436`/`:1479`–`:1521` references inside the same task |
| T3 | Clean |
| T4 | **FINDING 1** — line numbers stated against `f0e0a91`, but T3 removes ~26 lines above them |
| T5 | Clean — anchors on `decodeAssignment`, not a line number |
| T6 | Clean — `index.html:10-592` is stable, every SP0 deletion is below line 592 |
| T7 | **FINDING 1** — `index.html:673-1620` is pre-SP0; the script ends near line 1510 by then |
| T8 | Clean |
| T9 | Clean |
| T10 | Clean |
| T11 | **FINDING 2** — a test asserts a known bug is still present; a reviewer may read that as a defect |
| T12 | **FINDING 3** — the exclusions test can pass while asserting nothing |
| T13 | Clean |
| T14 | Clean |
| T15 | Clean |
| T16 | **FINDING 4** — `grep -c 'function '` expects `1`, but will return `2` |

---

## 4. Rulings

Record each in the ledger before dispatching Task 1.

### Ruling 1 — line numbers are navigational, anchors are binding

*Finding:* every line number in the plan is stated against `f0e0a91`. Deletions
in Tasks 2–5 shift everything below them, so Tasks 2, 4 and 7 cite positions
that no longer hold by the time they run.

*Ruling:* implementers locate every edit by the **quoted anchor text** the plan
supplies; line numbers are hints for navigation only. Where a task gives no
anchor, `grep` for the distinctive string. Task 7 in particular slices on the
`<script>` and `</script>` markers, not on `673-1620`.

*Cost if wrong:* an implementer deletes the wrong lines. Caught immediately —
`npm test` fails, and the deletions are small enough to re-do.

### Ruling 2 — Task 12's exclusions test must assert a success happened

*Finding:* `if (!receivers) continue;` means a `buildAssignment` that always
returned `null` would pass the test silently. The skill's rubric names
"a test that asserts nothing" as a defect, so the plan currently mandates
something a reviewer is obliged to flag.

*Ruling:* the implementer replaces that test body with a version that counts
successes and requires at least one:

```javascript
test('honours exclusions when it succeeds', () => {
  const people = ['a', 'b', 'c', 'd'];
  const exclusions = { a: ['b'], c: ['d'] };
  let succeeded = 0;
  for (let i = 0; i < 100; i++) {
    const receivers = buildAssignment(people, exclusions);
    if (!receivers) continue; // rejection sampling may give up; see sub-project 2
    succeeded++;
    assert.notEqual(receivers[0], 'b');
    assert.notEqual(receivers[2], 'd');
  }
  assert.ok(succeeded > 0, 'rejection sampling never succeeded in 100 attempts');
});
```

*Cost if wrong:* none — strictly stronger than what the plan specified.

### Ruling 3 — Task 16's orphan check expects 2, not 1

*Finding:* the bootstrap added in Task 7 contains
`document.addEventListener('input', function (e) {`, so `js/main.js` ends with
two lines matching `function ` — `checkForReveal` and the listener.

*Ruling:* Task 16 Step 2 becomes:

```
Run: grep -n 'function ' js/main.js
Expected: exactly two matches — `async function checkForReveal()` and the
`function (e)` listener inside the bootstrap guard. Any third match is code
that should have moved to a module.
```

*Cost if wrong:* a spurious failed check; no effect on shipped code.

### Ruling 4 — Task 11's known-bug test is intentional

*Finding:* `test('KNOWN BUG: the pipe separator is still accepted...')` asserts
that `isValidName('Bob|Ann') === true`, which is the latent bug sub-project 2
fixes. A reviewer could reasonably file this as "test locks in broken
behaviour".

*Ruling:* it stays. This plan's binding constraint is *no behaviour change*, and
a characterisation test that pins today's behaviour is how that gets enforced.
Sub-project 2 inverts this assertion in the same commit that fixes the bug.
Reviewers who flag it should be shown this ruling and overruled.

*Cost if wrong:* none — the test is accurate about today's behaviour either way.

---

## 5. Model selection and batching

| Task | Shape | Model | Why |
|---|---|---|---|
| 1 | Harness design, fixture generation | Sonnet | Judgment: the harness is novel code, not a move |
| 2 | Deletion + reference rewrite | Sonnet | Six references to rewrite; a miss is invisible to tests |
| 3 | Deletion | Haiku | Fully specified, anchors given, replacement code supplied |
| 4 | Deletion with a retention trap | **Opus** | The one task where deleting the obvious neighbour is wrong |
| 5 | Small addition | Haiku | Complete code supplied |
| 6 | File move | Haiku | Verified by `diff` |
| 7 | Module conversion | **Opus** | Riskiest task: module scope silently breaks 14 inline handlers |
| 8 | Extract + tests | Sonnet | Mechanical, tests supplied |
| 9 | Extract + tests | Sonnet | Mechanical, tests supplied |
| 10 + 11 | Extract + tests | Sonnet | **Batch these two** — same shape, both tiny, no shared interface |
| 12 | Extract + light refactor | Sonnet | Not a pure move; lifts a loop out of a DOM function |
| 13 | Extract + test re-pointing | Sonnet | Touches three test files |
| 14 | Multi-file UI extraction | Sonnet | Introduces `getSessionSalt` |
| 15 | Multi-file UI extraction | Sonnet | Consumes T14's interface |
| 16 | Cleanup + docs | Sonnet | Judgment about what is now orphaned |

Tasks 3, 5 and 6 are the cheapest in the plan and may also be batched if Task 2
goes smoothly. Do not batch Task 4 or Task 7 with anything.

---

## 6. Stop conditions

The skill's four, plus two specific to this project:

1. An irreversible or destructive operation.
2. A security-sensitive action.
3. A side effect outside this worktree — **including any `git push`**. Nothing
   has been pushed to GitHub; `restart-2026` exists only locally.
4. A plan so broken that every path forward is a guess.
5. **Project-specific: never merge to `main`.** GitHub Pages serves `main`
   directly, so a merge is a production deploy to the live site. That is a
   human decision, taken after sub-project 0 is reviewed.
6. **Project-specific: never re-run `tools/gen-fixtures.mjs` after Task 1.**
   It reads `index.html`, so regenerating after any deletion would quietly
   rewrite the golden data to match the new behaviour and destroy the only
   guard the plan has.

Everything else is a ruling, recorded in the ledger as
`Ruling: <decision> — <why> — <cost if wrong>`, not a question.

---

## 7. Definition of done

Sub-project 0 is complete when `index.html` has shrunk by roughly 110 lines and
`npm test` reports `pass 9`.

Sub-project 1 is complete when all of the following hold:

- `npm test` reports `pass 30`, `fail 0`
- `index.html` is roughly 80 lines of markup
- `js/main.js` is under 80 lines and defines only `checkForReveal`
- the four legacy fixtures do not decode; every other fixture decodes exactly
  as it did at `f0e0a91`
- a browser walk-through of the full journey — generate, reveal, create
  wishlist, decode wishlist, wrong password, old link — produces no console
  errors

Then hand off to `superpowers:finishing-a-development-branch`. Sub-project 2
gets its own spec-to-plan cycle.
