import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidyUrl } from '../js/urls.js';

// Real or documentation-shaped links through tidyUrl, spec
// docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html §7.1.
// [name, input, expected]; expected === input means "left as written".

const BESTBUY_SLUG = 'sony-cyber-shot-rx100-vii-20-1-megapixel-digital-camera-black';
const BESTBUY_SHORT = `https://www.bestbuy.com/product/${BESTBUY_SLUG}/J7XSRH4KQS`;

const CORPUS = [
  ['REQ-SSS-0003.9: Best Buy /product/, the user\'s Impact link',
    `${BESTBUY_SHORT}?irclickid=U%3AxW%3ARQwtxyZRhcy-WznJwsKUkrwJAwAe26LSg0&irgwc=1&afsrc=1&loc=The%20WireCutter&acampID=&mpid=197432&affgroup=%22Content%22`,
    BESTBUY_SHORT],
  ['REQ-SSS-0003.9: Best Buy /product/, already short',
    BESTBUY_SHORT, BESTBUY_SHORT],
  ['REQ-SSS-0003.9: Best Buy /product/ with no slug, generic rule only',
    'https://www.bestbuy.com/product/J7XSRH4KQS?irgwc=1',
    'https://www.bestbuy.com/product/J7XSRH4KQS'],
  ['REQ-SSS-0003.9: Best Buy legacy /site/…/<sku>.p',
    'https://www.bestbuy.com/site/sony-cyber-shot-rx100-vii-digital-camera-black/6364230.p?skuId=6364230&irclickid=xyz&irgwc=1&ref=198&loc=Wirecutter',
    'https://www.bestbuy.com/site/6364230.p'],
  ['REQ-SSS-0003.11: Best Buy search page keeps st and id',
    'https://www.bestbuy.com/site/searchpage.jsp?st=camera&id=pcat17071&irclickid=abc&loc=Wirecutter&mpid=1&acampID=2&affgroup=%22Content%22',
    'https://www.bestbuy.com/site/searchpage.jsp?st=camera&id=pcat17071'],
  ['REQ-SSS-0003.10: Target product with a Google Shopping query',
    'https://www.target.com/p/gracias-board-game/-/A-1004023797?afid=google&fndsrc=tgtao&DFA=7&CPNG=PLA_Toys&adgroup=SC&LID=7pgs&LNM=PRODUCT_GROUP&network=g&device=m&location=9&targetid=pla-4&ds_rl=1&gclid=abc&gclsrc=aw.ds',
    'https://www.target.com/p/-/A-1004023797'],
  ['REQ-SSS-0003.11: Target search keeps searchTerm',
    'https://www.target.com/s?searchTerm=board+game&afid=x&CPNG=y&clkid=z',
    'https://www.target.com/s?searchTerm=board+game'],
  ['Walmart product, slug only',
    'https://www.walmart.com/ip/seort/5429704737',
    'https://www.walmart.com/ip/5429704737'],
  ['Walmart product with an ad query',
    'https://www.walmart.com/ip/LEGO-Classic-11021/5429704737?athbdg=L1600&from=/search&athcpid=5&wmlspartner=wlpa&adid=2&wl0=&wl1=g&wl12=5&veh=sem&gclid=abc',
    'https://www.walmart.com/ip/5429704737'],
  ['REQ-SSS-0003.11: Walmart search keeps q',
    'https://www.walmart.com/search?q=lego&athcpid=5&wl1=g&veh=aff&irgwc=1&sourceid=imp_x&clickid=y',
    'https://www.walmart.com/search?q=lego'],
  ['eBay item with an eBay Partner Network query',
    'https://www.ebay.com/itm/197949520578?mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=5338722076&toolid=10001&customid=wc',
    'https://www.ebay.com/itm/197949520578'],
  ['REQ-SSS-0003.11: eBay search keeps _nkw and _sacat',
    'https://www.ebay.co.uk/sch/i.html?_nkw=seiko&_sacat=0&mkevt=1&mkcid=1&campid=5',
    'https://www.ebay.co.uk/sch/i.html?_nkw=seiko&_sacat=0'],
  ['Etsy listing from search',
    'https://www.etsy.com/listing/4356277139/striped-shawl?click_key=f4a2%3A4356277139&click_sum=9d8c&ga_order=most_relevant&ref=sr_gallery-1-3&frs=1&sts=1&organic_search_click=1',
    'https://www.etsy.com/listing/4356277139'],
  ['REQ-SSS-0003.11: Etsy search keeps q',
    'https://www.etsy.com/search?q=wool+scarf&ref=search_bar&ga_order=most_relevant&ga_search_type=all&awc=6220_1_ab',
    'https://www.etsy.com/search?q=wool+scarf'],
  ['Amazon product from search',
    'https://www.amazon.com/Sony-RX100-VII/dp/B07VGB9B5R/ref=sr_1_3?crid=1A&dib=eyJ2&dib_tag=se&keywords=sony&qid=1&sprefix=sony%2Caps%2C150&sr=8-3&th=1&psc=1',
    'https://www.amazon.com/dp/B07VGB9B5R'],
  ['Amazon product with an Associates tag',
    'https://www.amazon.com/dp/B07VGB9B5R?tag=thewirecutter-20&linkCode=ogi&th=1&psc=1&ascsubtag=%5Bartid',
    'https://www.amazon.com/dp/B07VGB9B5R'],
  ['REQ-SSS-0003.11: Amazon search keeps k',
    'https://www.amazon.com/s?k=sony+rx100&crid=1A&sprefix=sony%2Caps%2C150&ref=nb_sb_noss&linkCode=ll2&tag=x-20',
    'https://www.amazon.com/s?k=sony+rx100'],
  ['Amazon /sspa/click is out of scope and pinned unchanged',
    'https://www.amazon.com/sspa/click?ie=UTF8&spc=MTo&url=%2FSony%2Fdp%2FB07VGB9B5R%2Fref%3Dsr_1_1_sspa',
    'https://www.amazon.com/sspa/click?ie=UTF8&spc=MTo&url=%2FSony%2Fdp%2FB07VGB9B5R%2Fref%3Dsr_1_1_sspa'],
  ['Amazon short link a.co is unchanged',
    'https://a.co/d/0abcDEF', 'https://a.co/d/0abcDEF'],
  ['Amazon short link amzn.com is unchanged',
    'https://amzn.com/B07VGB9B5R', 'https://amzn.com/B07VGB9B5R'],
  ['REQ-SSS-0003.10: REI with an Impact query',
    'https://www.rei.com/product/176839/x?irclickid=abc&irgwc=1&afsrc=1&sharedid=wc',
    'https://www.rei.com/product/176839/x'],
  ['REQ-SSS-0003.10: Uniqlo with a CJ query keeps its colour',
    'https://www.uniqlo.com/us/en/products/E455359-000?cjevent=abc&cjdata=x&utm_source=cj&colorDisplayCode=09',
    'https://www.uniqlo.com/us/en/products/E455359-000?colorDisplayCode=09'],
  ['REQ-SSS-0003.10: ShareASale, Awin, Rakuten and ad click IDs',
    'https://shop.example/p?sscid=1&awc=2&ranMID=3&srsltid=4&gclsrc=aw.ds&ttclid=5&size=M',
    'https://shop.example/p?size=M'],
  ['REQ-SSS-0003.10: names compared without case, kept text untouched',
    'https://shop.example/p?GCLID=x&Fbclid=y&Size=M',
    'https://shop.example/p?Size=M'],
  ['REQ-SSS-0003.10: content names on a blog are not on the generic list',
    'https://blog.example.com/posts?tag=wool&ref=rss&id=7&loc=uk&from=home',
    'https://blog.example.com/posts?tag=wool&ref=rss&id=7&loc=uk&from=home'],
];

for (const [name, input, expected] of CORPUS) {
  test(`corpus: ${name}`, () => {
    assert.equal(tidyUrl(input), expected);
  });
}

test('corpus: tidyUrl is idempotent over every row', () => {
  for (const [name, input] of CORPUS) {
    const once = tidyUrl(input);
    assert.equal(tidyUrl(once), once, name);
  }
});
