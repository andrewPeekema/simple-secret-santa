// TEMPORARY — deleted in Task 7, once js/main.js exists and can be imported.
// Loads the inline <script> from index.html so sub-project 0's deletions are
// testable before any code has been extracted into modules.
import { readFile } from 'node:fs/promises';

const OPEN = '<script>';

export async function loadV0() {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const src = html.slice(html.indexOf(OPEN) + OPEN.length, html.lastIndexOf('</script>'));

  globalThis.window = { location: { hash: '', origin: 'https://x.test', pathname: '/' } };
  globalThis.document = {
    addEventListener() {},
    createElement: () => ({ textContent: '', get innerHTML() { return this.textContent; } }),
  };
  globalThis.alert = () => {};

  const exports = '; return { encodeAssignment, decodeAssignment, encodeHints, '
    + 'decodeHints, simpleHash, crc16, xorEncrypt, compressBytes, decompressBytes, '
    + 'looksLikeOldLink };';
  return new Function(src + exports)();
}
