import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortenLink } from '../js/shorten.js';

// Spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3, §6.1.
const LONG_AMAZON = 'https://www.amazon.com/Cozy-Wool-Socks/dp/B0ABCDEFGH/ref=sr_1_3?keywords=socks&tag=abc-20';
const SHORT_AMAZON = 'https://www.amazon.com/dp/B0ABCDEFGH';
const STATES = new Set(['empty', 'notUrl', 'unchanged', 'short']);

test('REQ-SSS-0003.7: empty or blank input is empty', () => {
  assert.deepEqual(shortenLink(''), { state: 'empty' });
  assert.deepEqual(shortenLink('   '), { state: 'empty' });
});

test('REQ-SSS-0003.7: input that is not an http(s) URL is notUrl', () => {
  for (const input of ['socks', 'www.amazon.com/dp/B0ABCDEFGH', 'mailto:a@b.c', 'https://',
                       'javascript:alert(1)', 'ftp://example.com/a']) {
    assert.deepEqual(shortenLink(input), { state: 'notUrl' }, input);
  }
});

test('REQ-SSS-0003.7: a link tidyUrl leaves alone is unchanged', () => {
  for (const input of ['https://example.com/item?size=M', 'https://a.co/d/abc123', SHORT_AMAZON]) {
    assert.deepEqual(shortenLink(input), { state: 'unchanged' }, input);
  }
});

test('REQ-SSS-0003.6: a long Amazon link is cut to the product', () => {
  assert.deepEqual(shortenLink(LONG_AMAZON), { state: 'short', url: SHORT_AMAZON });
});

test('REQ-SSS-0003.6: an Etsy link keeps its variation and loses ref', () => {
  assert.deepEqual(
    shortenLink('https://www.etsy.com/listing/123456789/hand-knit-scarf?ref=x&variation0=1'),
    { state: 'short', url: 'https://www.etsy.com/listing/123456789?variation0=1' });
});

test('REQ-SSS-0003.6: a non-shop link only loses its tracking tags', () => {
  assert.deepEqual(shortenLink('https://example.com/item?utm_source=x&id=7'),
    { state: 'short', url: 'https://example.com/item?id=7' });
});

test('REQ-SSS-0003.6: surrounding whitespace and newlines are ignored', () => {
  assert.deepEqual(shortenLink(`  ${LONG_AMAZON}\n`), { state: 'short', url: SHORT_AMAZON });
});

test('REQ-SSS-0003.6: an upper-case scheme and host is still a link', () => {
  assert.deepEqual(shortenLink('HTTPS://WWW.AMAZON.COM/Cozy/dp/B0ABCDEFGH/ref=x?tag=t'),
    { state: 'short', url: SHORT_AMAZON });
});

test('REQ-SSS-0003.6: a short result is unchanged when fed back in', () => {
  assert.equal(shortenLink(shortenLink(LONG_AMAZON).url).state, 'unchanged');
});

test('REQ-SSS-0003.6: two links pasted at once do not throw', () => {
  const r = shortenLink(`${LONG_AMAZON} https://www.etsy.com/listing/1/x?ref=y`);
  assert.ok(STATES.has(r.state), JSON.stringify(r));
});
