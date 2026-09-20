import { utf8ToBytes } from './codec.js';

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// CRC16-CCITT for hint validation (replaces VALID: prefix, saves 4 bytes)
function crc16(bytes) {
    let crc = 0xFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i] << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    return crc & 0xFFFF;
}

function xorEncrypt(bytes, key) {
    const keyBytes = utf8ToBytes(key);
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        result[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return result;
}

// XOR is symmetric
const xorDecrypt = xorEncrypt;

// Four characters of [0-9a-z], drawn from crypto.getRandomValues.
//
// Why not Math.random(): the salt is the only value this app publishes that
// leaves the organiser's machine and comes from a generator (the sibling
// per-link DOM element id built with Math.random() in js/ui/setup.js is
// drawn from the same stream, but it never leaves that page), and the same
// Math.random() stream draws the shuffle in js/assign.js that decides the
// pairings — the one secret here that matters. Drawing the salt separately
// removes that link and costs nothing: the salt stays 4 characters, so links
// stay the same length.
//
// Bytes >= 252 are discarded rather than folded. 252 is the largest multiple
// of 36 below 256, so each of the 36 characters receives exactly 7 of the
// 252 accepted bytes and the draw stays unbiased.
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

export { simpleHash, crc16, xorEncrypt, xorDecrypt, makeSalt };
