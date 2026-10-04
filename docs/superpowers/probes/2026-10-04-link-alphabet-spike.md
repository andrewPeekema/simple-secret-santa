# Spike: a denser alphabet for wishlist links (2026-10-04)

**Question.** Does a wishlist link whose ciphertext is written in a 11- or 15-bit Unicode alphabet (base2048 /
base32768) instead of base64url survive being texted and tapped — arrive as one tappable link, open with the
fragment intact, decode — and is it actually shorter on screen rather than percent-encoded into something longer?

**Ruling.** Keep base64url for now (user, 2026-10-04). Nothing from the probe is product code.

## Probe

A throwaway page outside the app, `https://notes.app.andrewpeekema.com:9443/ota/brainstorm/secret-santa-spike/`
(source in this session's scratchpad only), builds four links from the same deterministic 600 random bytes — about
what a 1000-character wishlist compresses to — and, when opened with a fragment, decodes it and compares byte for
byte. Encoders: qntm's `base2048` 3.0.0 and `base32768` 5.0.1, vendored into the page; plus a variant of base32768
with the alphabet swapped for CJK Extension A (U+3400–4DB5), CJK Unified Ideographs (U+4E00–9FA5) and Hangul
syllables (U+AC00–C12F) only, built after the first result below.

| encoding | bits/char | link length (76-char test origin) | UTF-8 bytes |
|---|---|---|---|
| base64url (control) | 6 | 878 | 878 |
| base2048 | 11 | 515 | 1138 |
| base32768 | 15 | 398 | 1038 |
| base32768-cjk | 15 | 398 | 960 |

## Results

Tested by the user in **Signal** only (iMessage, Android Messages, WhatsApp untested).

- base64url: works.
- base2048: works (tappable, decodes).
- base32768: **not viable** — part of the link renders as emoji. Its alphabet includes U+2500–275F, U+2780–27BF and
  U+2AE0–2B5F (Miscellaneous Symbols, Dingbats, arrows: ☀ ✂ ✈ ⭐ ⬛ …), which messaging apps show in emoji
  presentation and may rewrite with a variation selector.
- base32768-cjk: works (tappable, decodes 600/600).
- Headless Firefox (host): all four decode; `location.hash` arrives percent-encoded (320 code points → 2882
  characters), so a real decoder must `decodeURIComponent` the hash; the fragment should also be `normalize('NFC')`ed
  before decoding because Hangul syllables decompose under NFD.

## Why it was not adopted

1. CJK/Hangul glyphs are full-width: 398 of them occupy about the screen width of 800 Latin characters, so the
   texted link does not look much shorter; the saving is in what apps count, not what people see.
2. It reads as foreign or spam-like text after the `#`, which matters most for links sent by near-strangers.
3. Only Signal is proven; each other app has its own link detector.
4. Anything that percent-encodes the URL (some mail clients, QR generators, unfurlers) makes it 9 characters per
   15 bits — ~2,900 characters, three times longer than base64 ever was.
5. Font coverage of CJK Extension A is weaker on minimal fonts (tofu; data intact).
6. Nobody can read, type or dictate it.

base2048 (letters from ordinary scripts, half-width) suffers less from 1, 2 and 5 but is still unproven outside
Signal. Assignment links were never candidates: ~79 characters of which 53 are the site address.

## Compression alternatives measured alongside (node v24, bytes; realistic bulleted lists)

| wishlist chars | deflate-raw (browser native, levels 6 and 9 identical) | deflate + 400-byte wishlist dictionary | brotli q11 | zstd 19 | unishox2 |
|---|---|---|---|---|---|
| 97 | 93 | 70 | 86 | 97 | 70 |
| 315 | 229 | 211 | 206 | 244 | 220 |
| 1011 | 598 | 565 | 534 | 617 | 641 |
| 2019 | 807 | 761 | 725 | 835 | 900 |

`DecompressionStream` understands only gzip, deflate and deflate-raw; every other row needs a decoder shipped
with the page (brotli ≈ 200 KB+, unishox2 45 KB, a dictionary-capable inflater 8–45 KB). Brotli is the best at
−11%; the alphabet change was −55% by character count. The two stack.
