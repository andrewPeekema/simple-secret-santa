import { utf8ToBytes, bytesToUtf8, bytesToUrlSafeBase64, urlSafeBase64ToBytes } from './codec.js';
import { compressBytes } from './compress.js';
import { crc16, xorEncrypt } from './secret.js';

export function encodeAssignment(data) {
    // Pipe-delimited format: giver|receiver|salt (key removed - was unused)
    const compact = data.giver + '|' + data.receiver + '|' + data.salt;
    const bytes = utf8ToBytes(compact);
    return bytesToUrlSafeBase64(bytes);
}

// Recognises links issued before the 2026 cleanup, so they can be reported
// as outdated rather than as corrupt. A version-byte replacement was planned
// for a v1 wire format; that format was dropped when the threat model
// narrowed, so this shape-based check is the one we ship — a versioned
// format is deferred, not scheduled.
export function looksLikeOldLink(encoded) {
    try {
        const decoded = bytesToUtf8(urlSafeBase64ToBytes(encoded));
        if (decoded.startsWith('{') || decoded.startsWith('%7B')) return true;
        return decoded.split('|').length === 4;
    } catch (e) {
        return false;
    }
}

export function decodeAssignment(encoded) {
    try {
        const bytes = urlSafeBase64ToBytes(encoded);
        const decoded = bytesToUtf8(bytes);
        if (decoded.includes('|') && !decoded.includes('{')) {
            const parts = decoded.split('|');
            if (parts.length === 3) {
                return { giver: parts[0], receiver: parts[1], salt: parts[2] };
            }
        }
    } catch (e) {}

    return null;
}

export async function encodeHints(plaintext, password) {
    const plaintextBytes = utf8ToBytes(plaintext);

    // Prepend 2-byte CRC16 checksum for validation (replaces VALID: prefix)
    const checksum = crc16(plaintextBytes);
    const withChecksum = new Uint8Array(plaintextBytes.length + 2);
    withChecksum[0] = (checksum >> 8) & 0xFF;  // High byte
    withChecksum[1] = checksum & 0xFF;         // Low byte
    withChecksum.set(plaintextBytes, 2);

    const compressed = await compressBytes(withChecksum);
    const encrypted = xorEncrypt(compressed, password);
    return bytesToUrlSafeBase64(encrypted);
}

export async function decodeHints(encoded) {
    try {
        return urlSafeBase64ToBytes(encoded);
    } catch (e) {
        return null;
    }
}
