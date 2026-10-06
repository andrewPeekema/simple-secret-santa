import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidyUrl } from '../js/urls.js';
import * as urls from '../js/urls.js';

// Spec docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2, §5.1,
// amended by docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html §7.2.

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
  ['REQ-SSS-0003.9: Best Buy /product/<slug>/<BSIN>, the user\'s link',
    'https://www.bestbuy.com/product/sony-cyber-shot-rx100-vii-20-1-megapixel-digital-camera-black/J7XSRH4KQS?irclickid=U%3AxW%3ARQwtxyZRhcy-WznJwsKUkrwJAwAe26LSg0&irgwc=1&afsrc=1&loc=The%20WireCutter&acampID=&mpid=197432&affgroup=%22Content%22',
    'https://www.bestbuy.com/product/sony-cyber-shot-rx100-vii-20-1-megapixel-digital-camera-black/J7XSRH4KQS'],
  ['REQ-SSS-0003.9: Best Buy /product/<BSIN> with no slug falls to the generic rule',
    'https://www.bestbuy.com/product/J7XSRH4KQS?irgwc=1',
    'https://www.bestbuy.com/product/J7XSRH4KQS'],
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

// The follow-up spec's §3 list, copied here on purpose: drift between the
// spec and js/urls.js shows up as a failure (REQ-SSS-0003.10).
const GENERIC_NAMES = [
  'utm_anything',
  'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid',
  'dclid', 'wbraid', 'gbraid', 'yclid', 'ysclid', 'twclid', 'wickedid', '_hsenc', '__hssc',
  '__hstc', '__hsfp', 'hsctatracking', 'oly_anon_id', 'oly_enc_id', '__s', 'vero_id', 'mkt_tok',
  'gclsrc', 'gad_source', 'gad_campaignid', 'srsltid', 'ttclid', 'fbadid', '_gl', '_hsmi',
  'vero_conv', '_openstat', '_branch_match_id', '_branch_referrer',
  'irclickid', 'irgwc', 'ir_campaignid', 'ir_adid', 'ir_partnerid', 'sharedid', 'subid1',
  'subid2', 'subid3', 'afsrc', 'clickid', 'clkid', 'cjevent', 'cjdata', 'sscid', 'awc',
  'ranmid', 'raneaid', 'ransiteid',
];

test('generic host: every listed parameter name is removed', () => {
  const query = GENERIC_NAMES.map(n => `${n}=1`).join('&');
  assert.equal(tidyUrl(`https://blog.example.org/post?${query}`), 'https://blog.example.org/post');
});

test('REQ-SSS-0003.10: each §3 name is removed on any host, lower- and upper-cased', () => {
  for (const name of GENERIC_NAMES) {
    for (const n of [name, name.toUpperCase()]) {
      assert.equal(tidyUrl(`https://x.example/a?${n}=1&keep=2`), 'https://x.example/a?keep=2', n);
    }
  }
});

test('REQ-SSS-0003.10: content names stay on a generic host', () => {
  const url = 'https://x.example/a?id=1&loc=uk&q=2&k=3&keywords=4&si=5&ref=6&ref_=7&tag=8'
    + '&from=9&hash=10&campaign_id=11&source=12';
  assert.equal(tidyUrl(url), url);
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

test('an ID followed by more ID characters is not an ID', () => {
  const url = 'https://www.ebay.com/itm/1234567890123456';
  assert.equal(tidyUrl(url), url);
});

test('a non-ASCII slug before the ID still shortens', () => {
  assert.equal(tidyUrl('https://www.amazon.co.jp/レゴ-ボタニカル/dp/B09HQXYZ12/ref=sr_1_1?th=1'),
    'https://www.amazon.co.jp/dp/B09HQXYZ12');
});

test('REQ-SSS-0003.3: text glued onto a shop URL is not discarded', () => {
  const url = 'https://www.amazon.com/dp/B0ABCDEFGH这个很好';
  assert.equal(tidyUrl(url), url);
});

test('REQ-SSS-0003.9: Best Buy /product/ keeps the slug as written, non-ASCII included', () => {
  assert.equal(tidyUrl('https://www.bestbuy.com/product/caméra-noire/J7XSRH4KQS/sku/123?loc=x'),
    'https://www.bestbuy.com/product/caméra-noire/J7XSRH4KQS');
  assert.equal(tidyUrl('http://bestbuy.com/product/x/J7XSRH4KQS#reviews'),
    'http://bestbuy.com/product/x/J7XSRH4KQS');
});

test('REQ-SSS-0003.9: Best Buy /product/ needs an upper-case 10-character BSIN', () => {
  for (const url of [
    'https://www.bestbuy.com/product/x/j7xsrh4kqs',
    'https://www.bestbuy.com/product/x/J7XSRH4KQ',
    'https://www.bestbuy.com/product/x/J7XSRH4KQSX',
  ]) assert.equal(tidyUrl(url), url);
});

test('REQ-SSS-0003.9: the ID is matched once, on the written path, .. not resolved', () => {
  // The parsed path resolves to /dp/B0BBBBBBBB; the written path names B0AAAAAAAA first.
  assert.equal(tidyUrl('https://www.amazon.com/dp/B0AAAAAAAA/../dp/B0BBBBBBBB'),
    'https://www.amazon.com/dp/B0AAAAAAAA');
  const url = 'https://www.amazon.com/dp/x/../B0ABCDEFGH';
  assert.equal(tidyUrl(url), url);
});

test('REQ-SSS-0003.12: urls.js exports tidyUrl only', () => {
  assert.equal(urls.tidyUrls, undefined);
  assert.deepEqual(Object.keys(urls), ['tidyUrl']);
});

test('REQ-SSS-0003.13: a query left with only empty pairs loses its ?', () => {
  assert.equal(tidyUrl('https://x.example/a?utm_source=1&'), 'https://x.example/a');
  assert.equal(tidyUrl('https://x.example/a?&utm_source=1'), 'https://x.example/a');
  assert.equal(tidyUrl('https://x.example/a?utm_source=1&#top'), 'https://x.example/a#top');
});

test('REQ-SSS-0003.13: otherwise the remaining pairs are re-joined as written, empties included', () => {
  assert.equal(tidyUrl('https://x.example/a?a=1&&utm_source=2'), 'https://x.example/a?a=1&');
  assert.equal(tidyUrl('https://x.example/a?a=1&'), 'https://x.example/a?a=1&');
  assert.equal(tidyUrl('https://x.example/a?'), 'https://x.example/a?');
});

test('REQ-SSS-0003.13: a pair containing ; is never removed', () => {
  assert.equal(tidyUrl('https://x.example/a?utm_source=1;b=2'), 'https://x.example/a?utm_source=1;b=2');
  assert.equal(tidyUrl('https://x.example/a?utm_source=1&c=3;d=4'), 'https://x.example/a?c=3;d=4');
  assert.equal(tidyUrl('https://www.amazon.com/s?k=a&ref=x;y'), 'https://www.amazon.com/s?k=a&ref=x;y');
});

test('REQ-SSS-0003.10: names are compared lower-cased; kept text is not re-cased', () => {
  assert.equal(tidyUrl('https://x.example/a?UTM_Source=1&GCLID=2&Size=M'), 'https://x.example/a?Size=M');
  assert.equal(tidyUrl('https://x.example/a?%47CLID=1&gclid&Size=M'), 'https://x.example/a?Size=M');
  assert.equal(tidyUrl('https://www.amazon.com/s?K=socks&TAG=x-20'), 'https://www.amazon.com/s?K=socks');
  assert.equal(tidyUrl('https://www.etsy.com/listing/123/scarf?Variation0=1&ref=x'),
    'https://www.etsy.com/listing/123?Variation0=1');
});

// The follow-up spec's §4 lists, copied here on purpose; a prefix entry (*)
// appears as one concrete name. `keep` is the content the page needs.
const FALL_THROUGH = [
  ['Amazon', 'https://www.amazon.com/s',
    ['linkcode', 'ascsubtag', 'crid', 'sprefix', 'qid', 'sr', 'dib', 'dib_tag', 'th', 'psc',
      'pd_rd_w', 'pf_rd_p'],
    'k=1&keywords=2&node=3&rh=4&i=5',
    'https://www.amazon.com/Sony/dp/B07VGB9B5R', 'https://www.amazon.com/dp/B07VGB9B5R'],
  ['Etsy', 'https://www.etsy.com/search',
    ['click_key', 'click_sum', 'ga_order', 'ga_search_type', 'ga_view_type', 'ga_search_query',
      'frs', 'sts', 'organic_search_click', 'pro', 'content_source'],
    'q=1&section_id=2&explicit=3',
    'https://www.etsy.com/listing/4356277139/shawl', 'https://www.etsy.com/listing/4356277139'],
  ['eBay', 'https://www.ebay.com/sch/i.html',
    ['mkevt', 'mkcid', 'mkrid', 'campid', 'toolid', 'customid', 'siteid', 'mkgroupid', 'mkcrid',
      'hash', 'amdata', '_trkparms', '_trksid', 'itmmeta'],
    '_nkw=1&_sacat=2&epid=3&var=4',
    'https://www.ebay.com/itm/197949520578', 'https://www.ebay.com/itm/197949520578'],
  ['Walmart', 'https://www.walmart.com/search',
    ['from', 'wmlspartner', 'adid', 'veh', 'sourceid', 'affiliates_ad_id', 'campaign_id',
      'athbdg', 'wl12'],
    'q=1&cat_id=2&selectedsellerid=3',
    'https://www.walmart.com/ip/LEGO/5429704737', 'https://www.walmart.com/ip/5429704737'],
  ['Target', 'https://www.target.com/s',
    ['afid', 'cpng', 'lnm', 'lid', 'dfa', 'fndsrc', 'adgroup', 'network', 'device', 'location',
      'targetid', 'ds_rl', 'clkid'],
    'searchterm=1&category=2',
    'https://www.target.com/p/game/-/A-1004023797', 'https://www.target.com/p/-/A-1004023797'],
  ['Best Buy', 'https://www.bestbuy.com/site/searchpage.jsp',
    ['mpid', 'acampid', 'affgroup', 'loc'],
    'st=1&id=2&skuid=3',
    'https://www.bestbuy.com/product/x/J7XSRH4KQS', 'https://www.bestbuy.com/product/x/J7XSRH4KQS'],
];

for (const [shop, page, junk, keep, product, short] of FALL_THROUGH) {
  const query = [...junk, 'ref', 'ref_', 'tag'].map(n => `${n}=x`).join('&');
  test(`REQ-SSS-0003.11: ${shop} with no product ID loses its own tracking names only`, () => {
    assert.equal(tidyUrl(`${page}?${keep}&${query}`), `${page}?${keep}`);
  });
  test(`REQ-SSS-0003.11: ${shop} with a product ID takes the short form regardless`, () => {
    assert.equal(tidyUrl(`${product}?${query}`), short);
  });
}

test('REQ-SSS-0003.11: a shop\'s own names stay off other hosts and other shops', () => {
  for (const url of [
    'https://x.example/a?mpid=1&veh=2&cpng=3&mkevt=4&crid=5&click_key=6&wl1=7&athbdg=8&pd_rd_w=9',
    'https://www.etsy.com/search?q=1&mpid=2&veh=3',
  ]) assert.equal(tidyUrl(url), url);
});
