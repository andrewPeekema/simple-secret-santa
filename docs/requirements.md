# Requirements — Simple Secret Santa
Project code: SSS. Top-level only. Specs decompose these; they do not restate them.

## Purpose
- REQ-SSS-0001. The app shall provide each participant with a private link that reveals only
  their own assignment.
  Rationale: Secret Santa works only if each person learns their recipient and nobody else's.
- REQ-SSS-0002. The organiser shall be able to forbid chosen pairs of participants from being
  matched in either direction.
  Rationale: Couples and household members usually exchange gifts already.
- REQ-SSS-0003. A participant shall be able to create an optional wishlist from the assignment
  link that only their Santa can open.
  Rationale: This allows for obscured wishlists.

## Architecture
- REQ-SSS-0004. The app shall run entirely in the browser, sending no participant data to any
  server.
  Rationale: No backend to run or secure, and the README promises it.
- REQ-SSS-0005. The site shall deploy as the repository's files served verbatim, with no build
  step.
  Rationale: GitHub Pages serves `main` as-is; there is no toolchain to maintain or break.
- REQ-SSS-0006. A wishlist shall open only with a password that appears on the corresponding
  Santa's assignment page.
  Rationale: The threat is someone accidentally opening the wrong link; a deliberate snoop is out
  of scope.
- REQ-SSS-0007. The README and the UI shall claim no more protection for wishlists than the code
  delivers.
  Rationale: We do not want to give a false sense of security.
- REQ-SSS-0008. Each assignment link shall carry the giver's name.
  Rationale: The reveal page can address the giver, so a misdelivered link is noticed at once.
- REQ-SSS-0009. The app shall be usable on a phone screen at least as narrow as 412 CSS px
  (Pixel 9).
  Rationale: Links are shared by text message, so most reveals happen on phones.
- REQ-SSS-0010. The UI shall use one fixed colour theme regardless of the device's light/dark
  preference.
  Rationale: One palette to get right, and the page looks the same in every screenshot and share.
- REQ-SSS-0011. Each wishlist link shall carry its owner's name, readable without the password.
  Rationale: The view page can say whose wishlist it is before the password is entered, so the
  Santa knows they have the right link.

## Draft
(none)

## Deviations
(none)

## Deleted
(none)
