import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compressBytes, decompressBytes, FORMAT_UNCOMPRESSED, FORMAT_DEFLATE_RAW } from '../js/compress.js';

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);

test('round-trips text that compresses well', async () => {
  const text = 'Books about hiking, wool socks size 10, dark chocolate, a good pour-over coffee setup, nothing scented please. I like blue and green. No clothing unless its socks. Board games always welcome!';
  const packed = await compressBytes(enc(text));
  assert.equal(packed[0], FORMAT_DEFLATE_RAW, 'long text should use deflate');
  assert.ok(packed.length < text.length, 'deflate should have saved space');
  assert.equal(dec(await decompressBytes(packed)), text);
});

test('falls back to uncompressed when deflate would not help', async () => {
  const packed = await compressBytes(enc('socks'));
  assert.equal(packed[0], FORMAT_UNCOMPRESSED, 'short text should stay uncompressed');
  assert.equal(dec(await decompressBytes(packed)), 'socks');
});

test('round-trips empty input', async () => {
  assert.equal(dec(await decompressBytes(await compressBytes(enc('')))), '');
});
