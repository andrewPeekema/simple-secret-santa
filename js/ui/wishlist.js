// copyToClipboard is never called at module scope — it is only referenced
// from inside an onclick="..." string in a template below, resolved through
// the window shim at click time. Kept here as the only greppable trace of
// that dependency.
import { escapeHtml, copyToClipboard, STARS_HTML } from './dom.js';
import { encodeHints, encodeHintName } from '../format.js';
import { simpleHash, crc16, xorDecrypt } from '../secret.js';
import { decompressBytes } from '../compress.js';
import { bytesToUtf8 } from '../codec.js';
import { shortenLink } from '../shorten.js';

const INVALID_PASSWORD_HTML = `
            <div class="tint tint--danger note mt-3">Invalid password. Only the assigned Secret Santa has the correct password.</div>
        `;

// The shorten-a-link tool (spec 2026-10-04-shorten-link-tool-design §4.2).
// Reads and writes only the tool's own fields, never #hintsText (REQ-SSS-0003.8).
function renderShortener() {
    const result = shortenLink(document.getElementById('shortenIn').value);
    const box = document.getElementById('shortenResult');
    const note = document.getElementById('shortenNote');
    const notes = {
        notUrl: 'Paste one full link, starting with http.',
        unchanged: 'That link is already as short as it gets.',
    };
    if (result.state === 'short') {
        document.getElementById('shortenOut').value = result.url;
        box.style.display = '';
    } else {
        box.style.display = 'none';
    }
    if (notes[result.state]) {
        note.textContent = notes[result.state];
        note.style.display = '';
    } else {
        note.style.display = 'none';
    }
}

export function showCreateHints(recipientName, salt) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('revealSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const hintsSection = document.getElementById('hintsSection');
    hintsSection.style.display = 'block';

    window.hintRecipientName = recipientName;
    window.hintSalt = salt;

    hintsSection.innerHTML = `
        ${STARS_HTML}
        <h1>Your wishlist</h1>
        <div id="hintsForm" class="left mt-5">
            <textarea id="hintsText" class="in" placeholder="Gift ideas, preferences, sizes, favorite things…"></textarea>
            <p class="note mt-2">Wishlists are gift-wrapped, not locked up. Keep anything private off them. 🎁</p>
            <p id="hintLengthWarning" class="note text-danger mt-2" style="display: none;"></p>
            <button class="btn btn--primary btn--block mt-3" onclick="generateHintLink()">Generate link</button>
            <hr class="sep">
            <details class="tool">
                <summary><h2 class="section-title">Shorten a link <span class="optional">(optional)</span></h2></summary>
                <p class="note mt-2">Paste a link to get a shorter one for your wishlist. Product links from Amazon, Etsy, eBay, Walmart, Target and Best Buy are cut down to just the product; other links only lose their tracking tags.</p>
                <input type="url" id="shortenIn" class="in mt-3" placeholder="https://www.amazon.com/…" autocomplete="off" spellcheck="false">
                <div id="shortenResult" style="display: none;">
                    <input type="text" id="shortenOut" class="in in--url mt-3" readonly>
                    <button class="btn btn--secondary btn--block mt-3" onclick="copyToClipboard(document.getElementById('shortenOut').value, this)">Copy short link</button>
                </div>
                <p id="shortenNote" class="note mt-2" style="display: none;"></p>
            </details>
            <p class="nav"><button class="link" onclick="document.getElementById('hintsSection').style.display='none'; document.getElementById('revealSection').style.display='block';">Back</button></p>
        </div>
        <div id="hintLinkDisplay" class="mt-5" style="display: none;"></div>
    `;

    document.getElementById('hintsText').addEventListener('input', function() {
        const length = this.value.length;
        const warning = document.getElementById('hintLengthWarning');
        if (length > 1500) {
            warning.style.display = 'block';
            warning.textContent = `Note: ${length} characters may create a long URL.`;
        } else {
            warning.style.display = 'none';
        }
    });

    document.getElementById('shortenIn').addEventListener('input', renderShortener);
}

export async function generateHintLink() {
    const hintsText = document.getElementById('hintsText').value.trim();
    const recipientName = window.hintRecipientName;
    const salt = window.hintSalt;

    if (!hintsText) {
        alert('Please enter some hints for your Secret Santa!');
        return;
    }

    if (hintsText.length > 2000) {
        if (!confirm('Your hints are very long and may create a URL that doesn\'t work in all browsers or apps. Continue anyway?')) {
            return;
        }
    }

    const hintPassword = simpleHash('pair-' + recipientName + '-' + salt).padStart(6, '0').substring(0, 6);

    const encoded = await encodeHints(hintsText, hintPassword);
    // The owner's name rides in front of the ciphertext (REQ-SSS-0011).
    const hintUrl = window.location.origin + window.location.pathname + '#h-' + encodeHintName(recipientName) + '.' + encoded;

    // The link replaces the form (spec §5.5). The form is only hidden, so
    // Back on the link screen restores it with the text still in place.
    document.getElementById('hintsForm').style.display = 'none';
    const display = document.getElementById('hintLinkDisplay');
    display.style.display = 'block';
    display.innerHTML = `
        <div class="tint">Link ready</div>
        <div class="left mt-3">
            <input type="text" class="in in--url" value="${escapeHtml(hintUrl)}" readonly id="hint-link-input">
            <button class="btn btn--secondary btn--block mt-3" onclick="copyToClipboard(document.getElementById('hint-link-input').value, this)">Copy link</button>
            <p class="note mt-3">Share it with the group. Whoever has your wishlist password—your Secret Santa—can open it.</p>
        </div>
        <p class="nav"><button class="link" onclick="document.getElementById('hintLinkDisplay').style.display='none'; document.getElementById('hintsForm').style.display='';">Back</button></p>
    `;
}

// ownerName comes from the link itself (REQ-SSS-0011).
export function showViewHints(encryptedBytes, ownerName) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('revealSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    const viewHintsSection = document.getElementById('viewHintsSection');
    viewHintsSection.style.display = 'block';

    window.currentEncryptedBytes = encryptedBytes;

    viewHintsSection.innerHTML = `
        ${STARS_HTML}
        <h1>${escapeHtml(ownerName)}'s wishlist</h1>
        <div id="viewHintsForm" class="mt-5">
            <p class="secondary">Enter the password from your assignment page.</p>
            <input type="text" id="passwordInput" class="in in--password mt-3" placeholder="Password" maxlength="6">
            <button class="btn btn--primary btn--block mt-3" onclick="tryDecodeHintsWithPassword()">Decode</button>
        </div>
        <div id="decodedHints"></div>
        <p class="nav"><button class="link" onclick="location.href=location.pathname">Start a new exchange</button></p>
    `;
}

export async function tryDecodeHintsWithPassword() {
    const enteredPassword = document.getElementById('passwordInput').value.trim().toLowerCase();
    const encryptedBytes = window.currentEncryptedBytes;

    if (!enteredPassword) {
        alert('Please enter the password!');
        return;
    }

    if (enteredPassword.length < 5 || enteredPassword.length > 6) {
        alert('Password must be 5-6 characters!');
        return;
    }

    const decodedDiv = document.getElementById('decodedHints');

    // Helper function to validate and extract hints from decrypted bytes
    function validateHints(bytes) {
        if (!bytes || bytes.length < 3) return null;

        // CRC16 validation: first 2 bytes are the checksum
        const storedCrc = (bytes[0] << 8) | bytes[1];
        const payload = bytes.slice(2);
        const calculatedCrc = crc16(payload);

        if (storedCrc === calculatedCrc) {
            return bytesToUtf8(payload);
        }

        return null;
    }

    try {
        let hints = null;

        const decryptedBytes = xorDecrypt(encryptedBytes, enteredPassword);
        const decompressed = await decompressBytes(decryptedBytes);
        if (decompressed) {
            hints = validateHints(decompressed);
        }

        // Retained deliberately: a six-character password transcribed by hand
        // may lose a leading zero. This is usability, not legacy compatibility.
        // An earlier plan removed this once base32 passwords made the ambiguity
        // impossible; that format was dropped, so passwords are still typed and
        // this affordance is retained indefinitely.
        if (!hints && enteredPassword.length === 5) {
            const paddedPassword = '0' + enteredPassword;
            const decryptedBytes2 = xorDecrypt(encryptedBytes, paddedPassword);
            const decompressed2 = await decompressBytes(decryptedBytes2);
            if (decompressed2) {
                hints = validateHints(decompressed2);
            }
        }

        if (hints) {
            // The decoded list replaces the form (spec §5.6); on failure the
            // form stays so the password can be retried.
            document.getElementById('viewHintsForm').style.display = 'none';
            decodedDiv.innerHTML = `
                <div class="tint mt-5">Wishlist decoded</div>
                <div class="wishlist-text mt-3">${escapeHtml(hints.trim())}</div>
            `;
        } else {
            decodedDiv.innerHTML = INVALID_PASSWORD_HTML;
        }
    } catch (e) {
        console.error('Decryption error:', e);
        decodedDiv.innerHTML = INVALID_PASSWORD_HTML;
    }
}
