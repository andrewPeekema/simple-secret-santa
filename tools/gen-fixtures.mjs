// This script can no longer run: the test/harness-v0.mjs it imports below was
// deleted once the code became importable ES modules. It is kept only as the
// historical record of how test/fixtures/v0-links.json was generated. Those
// fixtures are now immutable golden data captured from the pre-cleanup
// behaviour and must never be regenerated — regenerating them would rewrite
// the guard to match whatever the code currently does, defeating its purpose.
import { writeFile, mkdir } from 'node:fs/promises';
import { loadV0 } from '../test/harness-v0.mjs';

const api = await loadV0();
const SALT = 'k7f3m2p9q1x4c';

const assignments = [
  ['Andrew', 'Kathryn'],
  ['José', 'Zoë'],
  ["Mary-Anne O'Brien", 'Bob Jr.'],
  ['A'.repeat(50), 'B'],
].map(([giver, receiver]) => ({
  giver, receiver, salt: SALT,
  encoded: api.encodeAssignment({ giver, receiver, salt: SALT }),
}));

const password = api.simpleHash('pair-Kathryn-' + SALT).padStart(6, '0').substring(0, 6);
const wishlists = [];
for (const [label, plaintext] of [
  ['short (incompressible)', 'socks'],
  ['long (deflate wins)', 'Books about hiking, wool socks size 10, dark chocolate, a good pour-over coffee setup, nothing scented please. I like blue and green. No clothing unless its socks. Board games always welcome!'],
]) {
  wishlists.push({ label, plaintext, password, encoded: await api.encodeHints(plaintext, password) });
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const legacy = {
  pipe4Field: b64('Andrew|Kathryn|unusedkey|' + SALT),
  jsonFormat: b64(JSON.stringify({ giver: 'Andrew', receiver: 'Kathryn', salt: SALT })),
  urlEncodedJson: Buffer.from(
    encodeURIComponent(JSON.stringify({ giver: 'Andrew', receiver: 'Kathryn', salt: SALT })),
    'utf8').toString('base64').replace(/=/g, ''),
};

await mkdir('test/fixtures', { recursive: true });
await writeFile('test/fixtures/v0-links.json',
  JSON.stringify({ salt: SALT, assignments, wishlists, legacy }, null, 2) + '\n');
console.log('wrote test/fixtures/v0-links.json');
