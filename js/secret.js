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

// Four characters of [0-9a-z]. Math.random().toString(36) yields "0.xxxx…", so
// slicing from index 2 drops the "0." and every remaining character is already
// in the alphabet. padEnd covers the rare short draw — Math.random() can return
// 0, whose base-36 form is just "0" with nothing after the point.
function makeSalt() {
    return Math.random().toString(36).substring(2, 6).padEnd(4, '0');
}

export { simpleHash, crc16, xorEncrypt, xorDecrypt, makeSalt };
