import { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes } from './codec.js';
import { compressBytes, decompressBytes } from './compress.js';
import { simpleHash, crc16, xorEncrypt, xorDecrypt } from './secret.js';
import { isValidName, getInvalidNameReason } from './validate.js';
import { shuffle, isValidAssignment, buildAssignment } from './assign.js';
import { encodeAssignment, decodeAssignment, looksLikeOldLink, encodeHints, decodeHints } from './format.js';
import { escapeHtml, copyToClipboard, showError } from './ui/dom.js';
import { addPerson, addExclusion, updateExclusionDropdowns, generateSecretSanta, copyAllLinks, getSessionSalt } from './ui/setup.js';

        function revealAssignment(data) {
            document.getElementById('mainContainer').style.display = 'none';
            document.getElementById('setupSection').style.display = 'none';
            document.getElementById('hintsSection').style.display = 'none';
            document.getElementById('viewHintsSection').style.display = 'none';
            const revealSection = document.getElementById('revealSection');
            revealSection.style.display = 'block';
            
            const hintPassword = simpleHash('pair-' + data.receiver + '-' + (data.salt || getSessionSalt())).padStart(6, '0').substring(0, 6);

            const safeGiver = escapeHtml(data.giver);
            const safeReceiver = escapeHtml(data.receiver);
            const safeSalt = escapeHtml(data.salt || getSessionSalt());

            // Store raw values for wishlist creation to ensure password consistency
            window.revealData = {
                giver: data.giver,
                salt: data.salt || getSessionSalt()
            };
            
            revealSection.innerHTML = `
                <div class="title-stars">
                    <span class="star-gold">✦</span>
                    <span class="star-ice">✦</span>
                    <span class="star-green">✦</span>
                    <span class="star-silver">✦</span>
                    <span class="star-red">✦</span>
                </div>
                <h1>Your Assignment</h1>
                <div class="reveal-box">
                    <h2>Hello, ${safeGiver}</h2>
                    <p style="font-size: 15px; margin: 16px 0 4px 0; color: var(--text-secondary);">You are giving a gift to</p>
                    <div class="reveal-name">${safeReceiver}</div>
                    <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 2px; margin-top: 20px; border: 1px solid var(--border);">
                        <p style="color: var(--text-secondary); font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.05em;">Wishlist Password</p>
                        <strong style="font-family: 'SF Mono', 'Fira Code', monospace; font-size: 1.3rem; color: var(--green-light); letter-spacing: 0.1em;">${hintPassword}</strong>
                        <p style="font-size: 12px; color: var(--text-muted); margin: 10px 0 0 0;">
                            Save this—you'll need it to decode ${safeReceiver}'s wishlist if they share one.
                        </p>
                    </div>
                </div>
                <p style="color: var(--text-muted); margin-top: 20px; font-size: 13px; font-style: italic;">
                    Keep this assignment to yourself.
                </p>
                <div class="hints-box">
                    <h3>Create Your Wishlist</h3>
                    <p style="font-size: 13px;">Share hints with your Secret Santa</p>
                    <button class="create-hints-btn" onclick="showCreateHints(window.revealData.giver, window.revealData.salt)">
                        Create Wishlist
                    </button>
                </div>
                <button onclick="location.href=location.pathname" style="margin-top: 16px;">
                    Start New Exchange
                </button>
            `;
        }

        function showCreateHints(recipientName, salt) {
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
                        Only your Secret Santa can decode this.
                    </p>
                    <textarea id="hintsText" placeholder="Gift ideas, preferences, sizes, favorite things..."></textarea>
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

        async function generateHintLink() {
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
                    <p style="font-size: 13px; margin: 10px 0;">
                        Share this with your group. Only your Secret Santa can decode it.
                    </p>
                    <input type="text" value="${escapeHtml(hintUrl)}" readonly id="hint-link-input" style="margin-top: 6px;">
                    <button class="copy-btn" onclick="copyToClipboard(document.getElementById('hint-link-input').value, this)">Copy Link</button>
                    <div class="info-box" style="margin-top: 14px;">
                        <strong style="color: var(--text-primary);">How it works</strong><br><br>
                        Anyone can open this link, but only your assigned Santa has the password to decode it.
                    </div>
                </div>
            `;
        }

        function showViewHints(encryptedBytes) {
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
                        Only the assigned Secret Santa has this password
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

        async function tryDecodeHintsWithPassword() {
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
                // Removed in sub-project 2, where fixed-length base32 passwords make
                // the ambiguity impossible.
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

        async function checkForReveal() {
            if (window.location.hash && window.location.hash.length > 1) {
                const hash = window.location.hash.substring(1);
                
                // Handle wishlist links
                if (hash.startsWith('h-')) {
                    const encoded = hash.substring(2);
                    const encryptedData = await decodeHints(encoded);
                    
                    if (encryptedData) {
                        showViewHints(encryptedData);
                    } else {
                        showError("Invalid hint link!");
                    }
                } else {
                    const data = decodeAssignment(hash);

                    if (data) {
                        revealAssignment(data);
                    } else if (looksLikeOldLink(hash)) {
                        showError("This link was created with an older version of Simple Secret Santa. Ask the organiser for a new one.");
                    } else {
                        showError("Invalid Secret Santa link!");
                    }
                }
            }
        }

// The markup and several innerHTML templates use inline onclick attributes,
// which resolve against globals. Module scope is not global, so these must be
// published explicitly. Replacing them with addEventListener wiring is
// deliberately out of scope for this refactor.
if (typeof window !== 'undefined') {
    Object.assign(window, {
        addPerson,
        addExclusion,
        generateSecretSanta,
        copyAllLinks,
        copyToClipboard,
        showCreateHints,
        generateHintLink,
        tryDecodeHintsWithPassword,
        updateExclusionDropdowns,
    });
}

// Bootstrap only in a browser. Guarding this is what lets the test suite
// import this module directly, with no DOM stubs.
if (typeof document !== 'undefined') {
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('person-name')) {
            updateExclusionDropdowns();
        }
    });

    checkForReveal();
}

export { encodeAssignment, decodeAssignment, looksLikeOldLink, encodeHints, decodeHints };

export { isValidName, getInvalidNameReason };

export { shuffle, isValidAssignment, buildAssignment };

export { simpleHash, crc16, xorEncrypt, xorDecrypt };

export { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes };

export { compressBytes, decompressBytes };
