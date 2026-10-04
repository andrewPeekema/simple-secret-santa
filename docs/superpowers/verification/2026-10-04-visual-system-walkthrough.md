# Browser walk-through — visual system (2026-10-04)

Acceptance check for spec §8.2 of
`docs/superpowers/specs/2026-10-04-visual-system-design.html`, against branch
`visual-system` at `edf9a3e`.

**Who and how:** the user, by hand, in a 412 px viewport. The build ran at the VM
URL `https://notes.app.andrewpeekema.com:9443/ota/brainstorm/secret-santa/`. The
director rsynced `index.html`, `css/` and `js/` there from the lead's worktree.

**Result: passed.** The user reported no findings and chose to merge. The
director's decision record (`.handoff/visual-system/decision.md`, main checkout)
relays this.

The user did not report results check by check. The checks the spec lists are
copied below for reference. The user's overall pass covers them, but no
individual line has its own recorded observation:

| Check (spec §8.2) | Result |
|---|---|
| Setup: no horizontal scroll at 412 px; add and remove a fourth name; exclusion row stacks with the ↔ hidden; Remove and "Edit participants" are 42 px tall | Passed (overall) |
| Generate: the form is replaced by the results; Copy link shows "✓ Copied" for two seconds and leaves no colour behind; Edit participants restores the names | Passed (overall) |
| Reveal: one heading (the recipient, in gold); the password line; "Create your wishlist" is the only filled button | Passed (overall) |
| Wishlist: "✓ Link ready" replaces the form; a wrong password shows the danger tint and keeps the form; the right one shows "✓ Wishlist decoded" | Passed (overall) |
| Invalid link: "Invalid link" with a danger tint | Passed (overall) |
| Every §4 string reads as written; no ALL CAPS; no italics | Passed (overall) |

Ruling B1 (Back on the wishlist create and link-ready screens returns to the
assignment) was part of the build that was walked through.
