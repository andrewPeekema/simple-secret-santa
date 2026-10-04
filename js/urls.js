// Shop-URL cleanup for wishlists (REQ-SSS-0003.1, .3; spec
// docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2).
// Pure string work: no DOM, no imports, nothing fetched (REQ-SSS-0004).

// Query parameters removed from any URL: these exact names, plus any name
// starting utm_. On the shop hosts (when no shop rule applied) SHOP_TRACKING
// goes too; elsewhere those names are as likely content as tracking (ruling B1).
const TRACKING = new Set(['fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid']);
const SHOP_TRACKING = new Set(['ref', 'ref_', 'tag']);

// "Any TLD": at most one label before the brand, one or two short labels
// after it — www.amazon.co.uk matches, media-amazon.com does not.
const anyTld = brand =>
  new RegExp(`^(?:[a-z0-9-]+\\.)?${brand}\\.[a-z]{2,3}(?:\\.[a-z]{2})?$`);
const AMAZON = anyTld('amazon');
const EBAY = anyTld('ebay');
const bare = domain => host => host === domain || host === 'www.' + domain;

// First matching row wins. `id` is applied to url.pathname; its first group
// goes into `path`. `keep` names the variant-selecting query parameters the
// short form carries over (ruling B1).
const SHOPS = [
  { host: h => AMAZON.test(h),
    id: /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Za-z0-9])/,
    path: id => `/dp/${id}`, keep: [] },
  { host: bare('etsy.com'), id: /\/listing\/(\d+)/, path: id => `/listing/${id}`,
    keep: ['variation0', 'variation1'] },
  { host: h => EBAY.test(h), id: /\/itm\/(?:[^/]+\/)?(\d{9,15})/, path: id => `/itm/${id}`,
    keep: ['var'] },
  { host: bare('walmart.com'), id: /\/ip\/(?:[^/]+\/)?(\d+)/, path: id => `/ip/${id}`, keep: [] },
  { host: bare('target.com'), id: /\/p\/(?:[^/]+\/)?-\/A-(\d+)/, path: id => `/p/-/A-${id}`,
    keep: ['preselect'] },
  { host: bare('bestbuy.com'), id: /\/site\/(?:[^/]+\/)?(\d+)\.p/, path: id => `/site/${id}.p`,
    keep: [] },
];

// Characters a URL can hold as written: RFC 3986's unreserved and reserved
// sets, plus %. Anything else (CJK text, full-width punctuation), or a second
// scheme, means the matched run swallowed text that is not part of this URL.
// That text must survive (REQ-SSS-0003.3), so no rule may discard it.
const URL_CHARS = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/;
const foreign = s => !URL_CHARS.test(s) || /https?:\/\//i.test(s);

// True when the text after the shop ID in `url`, as written, may be dropped:
// the ID must be found in the written path, and what follows it must be
// empty or the rest of a URL — starting /, ? or # with nothing foreign in it.
function discardableTail(url, idPattern) {
  const pathEnd = url.search(/[?#]/);
  const m = idPattern.exec(pathEnd === -1 ? url : url.slice(0, pathEnd));
  if (!m) return false;
  const tail = url.slice(m.index + m[0].length);
  return tail === '' || (/^[/?#]/.test(tail) && !foreign(tail));
}

// A pair's name: the part before the first =, percent-decoded where possible.
function pairName(pair) {
  const raw = pair.split('=')[0];
  try { return decodeURIComponent(raw); } catch { return raw; }
}

// The query of `url` as written: where its ? sits, where it ends (the # or
// the end of the string), and its &-separated pairs. Null when there is none.
function queryOf(url) {
  const hash = url.indexOf('#');
  const end = hash === -1 ? url.length : hash;
  const q = url.indexOf('?');
  if (q === -1 || q > end) return null;
  return { q, end, pairs: url.slice(q + 1, end).split('&') };
}

function isTracking(pair, onShop) {
  const name = pairName(pair);
  return name.startsWith('utm_') || TRACKING.has(name) || (onShop && SHOP_TRACKING.has(name));
}

// Removes tracking pairs from the query as written in `url`, leaving every
// other character alone. Returns `url` itself when nothing is removed.
function stripTracking(url, onShop) {
  const query = queryOf(url);
  if (!query) return url;
  const { q, end, pairs } = query;
  const kept = pairs.filter(pair => !isTracking(pair, onShop) || foreign(pair));
  if (kept.length === pairs.length) return url;
  const rest = kept.length ? '?' + kept.join('&') : '';
  return url.slice(0, q) + rest + url.slice(end);
}

// The `keep` pairs of the query as written, in order and spelling, as a
// query string ('' when there are none).
function keptQuery(url, keep) {
  const query = queryOf(url);
  const kept = query ? query.pairs.filter(pair => keep.includes(pairName(pair))) : [];
  return kept.length ? '?' + kept.join('&') : '';
}

export function tidyUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return url; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url;
  const shop = SHOPS.find(row => row.host(parsed.hostname));
  if (shop) {
    const m = shop.id.exec(parsed.pathname);
    if (m && discardableTail(url, shop.id)) {
      return parsed.origin + shop.path(m[1]) + keptQuery(url, shop.keep);
    }
  }
  return stripTracking(url, Boolean(shop)); // the generic rule
}

const URL_RUN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING = new Set(['.', ',', ';', ':', '!', '?', "'", '"']);
const count = (s, ch) => s.split(ch).length - 1;

// Peels sentence punctuation off the end of a matched run. A ")" goes only
// while the run holds more ")" than "(", so a Wikipedia-style "_(film)" keeps it.
function peel(run) {
  let end = run.length;
  while (end > 0) {
    const c = run[end - 1];
    const body = run.slice(0, end);
    if (TRAILING.has(c) || (c === ')' && count(body, ')') > count(body, '('))) end--;
    else break;
  }
  return end;
}

export function tidyUrls(text) {
  let shortened = 0;
  const out = text.replace(URL_RUN, run => {
    const end = peel(run);
    const url = run.slice(0, end);
    const tidied = tidyUrl(url);
    if (tidied !== url) shortened++;
    return tidied + run.slice(end);
  });
  return { text: out, shortened };
}
