import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidyUrl, tidyUrls } from '../js/urls.js';

// Spec docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2, §5.1.

const SHOPS = [
  ['Amazon .com, slug and ref path',
    'https://www.amazon.com/LEGO-Icons-Botanical-Collection-10311/dp/B09HQXYZ12/ref=sr_1_3?crid=2X9Q&keywords=lego+orchid&qid=1700000000&sr=8-3&th=1&psc=1',
    'https://www.amazon.com/dp/B09HQXYZ12'],
  ['Amazon .co.uk, gp/product',
    'https://www.amazon.co.uk/gp/product/B07ABCDE12?pf_rd_r=XYZ&utm_source=newsletter&th=1',
    'https://www.amazon.co.uk/dp/B07ABCDE12'],
  ['Amazon gp/aw/d (mobile)',
    'https://www.amazon.de/gp/aw/d/B0C1234567?psc=1&ref_=ast_sto_dp',
    'https://www.amazon.de/dp/B0C1234567'],
  ['Etsy',
    'https://www.etsy.com/listing/1234567890/personalised-leather-wallet-mens-gift?click_key=abc123&ref=hp_rv-1&utm_campaign=x',
    'https://www.etsy.com/listing/1234567890'],
  ['Etsy with a /uk/ locale segment',
    'https://www.etsy.com/uk/listing/987654321/hand-knitted-scarf?ref=shop_home_active_1',
    'https://www.etsy.com/listing/987654321'],
  ['eBay .com, slug',
    'https://www.ebay.com/itm/Vintage-Polaroid-SX-70-Camera/394812345678?hash=item5bed&_trkparms=amclksrc%3DITM&utm_medium=email',
    'https://www.ebay.com/itm/394812345678'],
  ['eBay .co.uk, no slug',
    'https://www.ebay.co.uk/itm/204512345678?mkcid=16&mkevt=1',
    'https://www.ebay.co.uk/itm/204512345678'],
  ['Walmart',
    'https://www.walmart.com/ip/Instant-Pot-Duo-7-in-1-Electric-Pressure-Cooker/345678901?athbdg=L1600&from=/search&utm_source=x',
    'https://www.walmart.com/ip/345678901'],
  ['Target',
    'https://www.target.com/p/stanley-40oz-quencher-h2-0-tumbler/-/A-87654321?preselect=12345678#lnk=sametab',
    'https://www.target.com/p/-/A-87654321?preselect=12345678'],
  ['Best Buy',
    'https://www.bestbuy.com/site/sony-wh-1000xm5-wireless-headphones-black/6505727.p?skuId=6505727&utm_campaign=gift',
    'https://www.bestbuy.com/site/6505727.p'],
];

for (const [name, long, short] of SHOPS) {
  test(`shop rule: ${name}`, () => {
    assert.equal(tidyUrl(long), short);
  });
}

test('generic host: tracking parameters go, others and the fragment stay', () => {
  assert.equal(
    tidyUrl('https://shop.example.com/item?variant=3&utm_source=x&fbclid=y#reviews'),
    'https://shop.example.com/item?variant=3#reviews');
});

test('generic host: every listed parameter name is removed', () => {
  const names = ['utm_anything', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid'];
  const query = names.map(n => `${n}=1`).join('&');
  assert.equal(tidyUrl(`https://blog.example.org/post?${query}`), 'https://blog.example.org/post');
});

test('generic host: ref, ref_ and tag are kept off the shop hosts (ruling B1)', () => {
  for (const url of [
    'https://blog.example.com/posts?tag=wool',
    'https://github.com/o/r/blob/main/x?ref=v2',
    'https://blog.example.org/post?ref_=1&tag=2',
  ]) assert.equal(tidyUrl(url), url);
});

test('shop host without an ID: ref, ref_ and tag go too (ruling B1)', () => {
  assert.equal(tidyUrl('https://www.amazon.com/s?tag=x-20&keywords=socks'),
    'https://www.amazon.com/s?keywords=socks');
  assert.equal(tidyUrl('https://www.etsy.com/shop/Knits?ref_=a&ref=b&section_id=7'),
    'https://www.etsy.com/shop/Knits?section_id=7');
});

test('shop rule keeps variant parameters in order and spelling (ruling B1)', () => {
  assert.equal(tidyUrl('https://www.target.com/p/tumbler/-/A-12345678?preselect=87654321&utm_source=x'),
    'https://www.target.com/p/-/A-12345678?preselect=87654321');
  assert.equal(tidyUrl('https://www.ebay.com/itm/Camera/123456789012?var=987654321098&hash=abc'),
    'https://www.ebay.com/itm/123456789012?var=987654321098');
  assert.equal(tidyUrl('https://www.etsy.com/listing/123/scarf?variation0=1&ref=x&variation1=2'),
    'https://www.etsy.com/listing/123?variation0=1&variation1=2');
  assert.equal(tidyUrl('https://www.etsy.com/listing/123/scarf?variation1=%32&variation0=1#r'),
    'https://www.etsy.com/listing/123?variation1=%32&variation0=1');
});

test('shop rule: kept parameters belong to their own shop only', () => {
  assert.equal(tidyUrl('https://www.amazon.com/x/dp/B0ABCDEFGH?var=1&preselect=2&variation0=3'),
    'https://www.amazon.com/dp/B0ABCDEFGH');
});

test('shop rule with a kept parameter is idempotent', () => {
  for (const url of [
    'https://www.target.com/p/-/A-12345678?preselect=87654321',
    'https://www.etsy.com/listing/123?variation0=1&variation1=2',
  ]) assert.equal(tidyUrl(url), url);
});

test('generic host: a percent-encoded tracking name is recognised', () => {
  assert.equal(tidyUrl('https://x.example/a?%75tm_source=1&keep=2'), 'https://x.example/a?keep=2');
});

test('generic host: names that merely resemble tracking names stay', () => {
  const url = 'https://x.example/a?tags=1&reference=2&utm=3&gclid_x=4';
  assert.equal(tidyUrl(url), url);
});

test('generic host: an emptied query drops its ?, fragment kept', () => {
  assert.equal(tidyUrl('https://x.example/a?utm_source=1#top'), 'https://x.example/a#top');
});

test('generic host: a ? inside the fragment is not a query', () => {
  const url = 'https://x.example/a#section?utm_source=1';
  assert.equal(tidyUrl(url), url);
});

const UNCHANGED = [
  'https://example.com',
  'https://Example.com/x',
  'https://example.com/./a/../b',
  'https://shop.example.com/item?size=M',
  'https://a.co/d/abc123',
  'https://amzn.to/3xYzAbC',
  'https://m.media-amazon.com/images/I/x.jpg',
  'https://amazon.com.evil.example/dp/B0ABCDEFGH',
  'https://www.amazon.com/dp/B0ABCDEFGH',
  'https://www.etsy.com/listing/123',
  'https://www.target.com/p/-/A-87654321',
  'mailto:santa@example.com',
  'ftp://files.example.com/list.txt?utm_source=x',
  'https://',
  'not a url',
  'http://www.amazon.com/dp/b0abcdefgh',
  'https://x.example/caf%C3%A9?q=%E2%9C%93',
];

for (const url of UNCHANGED) {
  test(`unchanged, byte-identical: ${url}`, () => {
    assert.equal(tidyUrl(url), url);
  });
}

test('a surviving %20 stays as written', () => {
  assert.equal(tidyUrl('https://shop.example.com/a?q=a%20b&utm_z=1'), 'https://shop.example.com/a?q=a%20b');
});

test('non-ASCII text in a kept query value stays as written', () => {
  assert.equal(tidyUrl('https://x.example/s?q=café&utm_source=1'), 'https://x.example/s?q=café');
});

test('Amazon URL with no ASIN loses only its tracking parameter', () => {
  assert.equal(tidyUrl('https://www.amazon.com/s?k=lego+orchid&ref=nb_sb_noss'),
    'https://www.amazon.com/s?k=lego+orchid');
});

test('shop-rule hit keeps scheme and www as written, host lower-cased', () => {
  assert.equal(tidyUrl('http://amazon.com/dp/B0ABCDEFGH?tag=x'), 'http://amazon.com/dp/B0ABCDEFGH');
  assert.equal(tidyUrl('https://WWW.Amazon.COM/dp/B0ABCDEFGH?tag=x'), 'https://www.amazon.com/dp/B0ABCDEFGH');
});

test('tidyUrl is idempotent', () => {
  for (const [, long] of SHOPS) assert.equal(tidyUrl(tidyUrl(long)), tidyUrl(long));
  const generic = 'https://shop.example.com/item?variant=3&utm_source=x#r';
  assert.equal(tidyUrl(tidyUrl(generic)), tidyUrl(generic));
});

test('tidyUrls: upper-case scheme is found and cleaned', () => {
  assert.deepEqual(tidyUrls('HTTPS://WWW.AMAZON.COM/dp/B0ABCDEFGH?tag=x'),
    { text: 'https://www.amazon.com/dp/B0ABCDEFGH', shortened: 1 });
});

test('tidyUrls: two shop URLs among prose; prose byte-identical', () => {
  const text = '- Orchid set: https://www.amazon.com/LEGO/dp/B09HQXYZ12/ref=sr_1_3?th=1\n'
    + '- Wallet  (brown, not black) — https://www.etsy.com/listing/1234567890/wallet?ref=hp\n'
    + '- Socks, size 10–12 ✓';
  assert.deepEqual(tidyUrls(text), {
    text: '- Orchid set: https://www.amazon.com/dp/B09HQXYZ12\n'
      + '- Wallet  (brown, not black) — https://www.etsy.com/listing/1234567890\n'
      + '- Socks, size 10–12 ✓',
    shortened: 2,
  });
});

test('tidyUrls: trailing full stop stays outside the URL', () => {
  assert.deepEqual(tidyUrls('Get this: https://www.amazon.com/x/dp/B0ABCDEFGH?th=1.'),
    { text: 'Get this: https://www.amazon.com/dp/B0ABCDEFGH.', shortened: 1 });
});

test('tidyUrls: URL wrapped in parentheses keeps them', () => {
  assert.deepEqual(tidyUrls('a scarf (https://www.etsy.com/listing/123/slug?ref=x) please'),
    { text: 'a scarf (https://www.etsy.com/listing/123) please', shortened: 1 });
});

test('tidyUrls: "(…)." keeps both the ) and the .', () => {
  assert.deepEqual(tidyUrls('(https://www.etsy.com/listing/123/slug?ref=x).'),
    { text: '(https://www.etsy.com/listing/123).', shortened: 1 });
});

test('tidyUrls: a Wikipedia-style URL keeps its balanced )', () => {
  const text = 'see https://en.wikipedia.org/wiki/Heat_(1995_film)?utm_source=x';
  assert.deepEqual(tidyUrls(text),
    { text: 'see https://en.wikipedia.org/wiki/Heat_(1995_film)', shortened: 1 });
  const plain = 'see https://en.wikipedia.org/wiki/Heat_(1995_film).';
  assert.deepEqual(tidyUrls(plain), { text: plain, shortened: 0 });
});

test('tidyUrls: the same URL pasted twice counts twice', () => {
  const url = 'https://www.amazon.com/x/dp/B0ABCDEFGH?th=1';
  assert.deepEqual(tidyUrls(`${url}\n${url}`), {
    text: 'https://www.amazon.com/dp/B0ABCDEFGH\nhttps://www.amazon.com/dp/B0ABCDEFGH',
    shortened: 2,
  });
});

test('tidyUrls: an unchanged URL is not counted', () => {
  const text = 'size M: https://shop.example.com/item?size=M and https://a.co/d/abc123';
  assert.deepEqual(tidyUrls(text), { text, shortened: 0 });
});

test('tidyUrls: text with no URL comes back as is', () => {
  const text = '  Books!  Anything by Le Guin; socks (wool).\n\nhttp:// alone, https://';
  assert.deepEqual(tidyUrls(text), { text, shortened: 0 });
});

test('tidyUrls: quotes and angle brackets end a URL', () => {
  assert.deepEqual(tidyUrls('<https://x.example/a?utm_source=1> "https://x.example/b?fbclid=2"'),
    { text: '<https://x.example/a> "https://x.example/b"', shortened: 2 });
});

// Text glued onto a URL with no space is not part of it and must survive
// (REQ-SSS-0003.3): no rule may discard it, so the URL is left as written.
const GLUED = [
  'https://www.amazon.com/dp/B0ABCDEFGH这个很好',
  '想要这个https://www.amazon.com/x/dp/B0ABCDEFGH?tag=x。谢谢',
  'https://www.amazon.com/dp/B0ABCDEFGH,https://www.etsy.com/listing/123/slug',
  '**https://www.amazon.com/dp/B0ABCDEFGH**',
  'https://example.com/item?utm_source=x这个很好',
  'https://example.com/item?a=1&utm_source=x,https://www.etsy.com/listing/1',
];

for (const text of GLUED) {
  test(`tidyUrls: glued text survives: ${text}`, () => {
    assert.deepEqual(tidyUrls(text), { text, shortened: 0 });
  });
}

test('an ID followed by more ID characters is not an ID', () => {
  const url = 'https://www.ebay.com/itm/1234567890123456';
  assert.equal(tidyUrl(url), url);
});

test('a non-ASCII slug before the ID still shortens', () => {
  assert.equal(tidyUrl('https://www.amazon.co.jp/レゴ-ボタニカル/dp/B09HQXYZ12/ref=sr_1_1?th=1'),
    'https://www.amazon.co.jp/dp/B09HQXYZ12');
});

test('glued text survives while a tracking pair before it still goes', () => {
  assert.deepEqual(tidyUrls('https://x.example/a?utm_source=1&size=M这个'),
    { text: 'https://x.example/a?size=M这个', shortened: 1 });
});
