// copyToClipboard is never called at module scope — it is only referenced
// from inside an onclick="..." string in a template below, resolved through
// the window shim at click time. Kept here as the only greppable trace of
// that dependency.
import { escapeHtml, copyToClipboard } from './dom.js';
import { encodeHints } from '../format.js';
import { simpleHash, crc16, xorDecrypt } from '../secret.js';
import { decompressBytes } from '../compress.js';
import { bytesToUtf8 } from '../codec.js';

export function showCreateHints(recipientName, salt) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('revealSection').style.display = 'none';
    document.getElementById('viewHintsSection').style.display = 'none';
    const hintsSection = document.getElementById('hintsSection');
    hintsSection.style.display = 'block';

    window.hintRecipientName = recipientName;
    window.hintSalt = salt;

    hintsSection.innerHTML = `
        <div class="title-stars">
            <span class="star-gold">✦</span>
            <span class="star-ice">✦</span>
            <span class="star-green">✦</span>
            <span class="star-silver">✦</span>
            <span class="star-red">✦</span>
        </div>
        <h1>Your Wishlist</h1>
        <div class="hints-box">
            <p style="margin-bottom: 14px; font-size: 13px;">
                Only your Secret Santa gets the password.
            </p>
            <textarea id="hintsText" placeholder="Gift ideas, preferences, sizes, favorite things..."></textarea>
            <p style="margin-top: 8px; font-size: 12px; color: var(--text-muted);">
                Wishlists are gift-wrapped, not locked up—keep anything private off them. 🎁
            </p>
            <p id="hintLengthWarning" style="display: none; color: var(--error); font-size: 12px;"></p>
            <button class="create-hints-btn" onclick="generateHintLink()">
                Generate Link
            </button>
        </div>
        <div id="hintLinkDisplay" style="display: none;"></div>
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
    const hintUrl = window.location.origin + window.location.pathname + '#h-' + encoded;

    const display = document.getElementById('hintLinkDisplay');
    display.style.display = 'block';
    display.innerHTML = `
        <div class="hint-link-display">
            <h3>Link Ready</h3>
            <input type="text" value="${escapeHtml(hintUrl)}" readonly id="hint-link-input" style="margin-top: 6px;">
            <button class="copy-btn" onclick="copyToClipboard(document.getElementById('hint-link-input').value, this)">Copy Link</button>
            <div class="info-box" style="margin-top: 14px;">
                <strong style="color: var(--text-primary);">How it works</strong><br><br>
                Anyone can open this link, but only your assigned Santa has the password to decode it.
            </div>
        </div>
    `;
}

export function showViewHints(encryptedBytes) {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('revealSection').style.display = 'none';
    document.getElementById('hintsSection').style.display = 'none';
    const viewHintsSection = document.getElementById('viewHintsSection');
    viewHintsSection.style.display = 'block';

    window.currentEncryptedBytes = encryptedBytes;

    viewHintsSection.innerHTML = `
        <div class="title-stars">
            <span class="star-gold">✦</span>
            <span class="star-ice">✦</span>
            <span class="star-green">✦</span>
            <span class="star-silver">✦</span>
            <span class="star-red">✦</span>
        </div>
        <h1>Wishlist</h1>
        <div class="hints-box">
            <p style="margin-bottom: 14px; font-size: 13px;">
                Enter the password to decode this wishlist.
            </p>
            <input type="text" id="passwordInput" placeholder="Password" maxlength="6" style="text-transform: lowercase; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 1.1rem; text-align: center; letter-spacing: 0.15em;">
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                Only the assigned Secret Santa is shown this password
            </p>
            <button class="create-hints-btn" onclick="tryDecodeHintsWithPassword()">
                Decode
            </button>
        </div>
        <div id="decodedHints" style="margin-top: 16px;"></div>
        <button onclick="location.href=location.pathname" style="margin-top: 16px;">
            Back
        </button>
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
            decodedDiv.innerHTML = `
                <div class="success">
                    <h3>Wishlist Decoded</h3>
                    <div style="background: var(--bg-tertiary); padding: 14px; border-radius: 2px; margin-top: 10px; text-align: left; white-space: pre-wrap; border: 1px solid var(--border); color: var(--text-secondary); line-height: 1.6; font-size: 13px;">${escapeHtml(hints.trim())}</div>
                </div>
            `;
        } else {
            decodedDiv.innerHTML = `
                <div class="error">
                    Invalid password. Only the assigned Secret Santa has the correct password.
                </div>
            `;
        }
    } catch (e) {
        console.error('Decryption error:', e);
        decodedDiv.innerHTML = `
            <div class="error">
                Invalid password. Only the assigned Secret Santa has the correct password.
            </div>
        `;
    }
}
