import { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes } from './codec.js';
import { compressBytes, decompressBytes } from './compress.js';
import { simpleHash, crc16, xorEncrypt, xorDecrypt } from './secret.js';
import { isValidName, getInvalidNameReason } from './validate.js';
import { shuffle, isValidAssignment, buildAssignment } from './assign.js';
import { encodeAssignment, decodeAssignment, looksLikeOldLink, encodeHints, decodeHints } from './format.js';
import { escapeHtml, copyToClipboard, showError } from './ui/dom.js';
import { addPerson, addExclusion, updateExclusionDropdowns, generateSecretSanta, copyAllLinks, getSessionSalt } from './ui/setup.js';
import { revealAssignment } from './ui/reveal.js';
import { showCreateHints, generateHintLink, showViewHints, tryDecodeHintsWithPassword } from './ui/wishlist.js';

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
