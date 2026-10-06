// Shop-URL cleanup for wishlists (REQ-SSS-0003.3, .9-.13; spec
// docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2 as
// amended by docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html).
// Pure string work: no DOM, no imports, nothing fetched (REQ-SSS-0004).
// One export: tidyUrl(url) -> string.

// Name lists (follow-up spec §3, §4). Lower-case; an entry ending in * is a
// prefix. A query pair's name is lower-cased before it is looked up; the
// pair's text is never changed.

// Removed on every host (§3).
const TRACKING = ['utm_*', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'igshid'];

// Removed on a shop host only when no product ID matched (§4). Every shop
// list includes ref, ref_ and tag (ruling B1 of the 2026-10-04 spec).
const SHOP_COMMON = ['ref', 'ref_', 'tag'];
const JUNK = {
  amazon: SHOP_COMMON,
  etsy: SHOP_COMMON,
  ebay: SHOP_COMMON,
  walmart: SHOP_COMMON,
  target: SHOP_COMMON,
  bestbuy: SHOP_COMMON,
};

// A test for one list of names: exact names, plus prefixes from entries ending in *.
function nameList(entries) {
  const exact = new Set(entries.filter(e => !e.endsWith('*')));
  const prefixes = entries.filter(e => e.endsWith('*')).map(e => e.slice(0, -1));
  return name => exact.has(name) || prefixes.some(p => name.startsWith(p));
}
const isGenericTracking = nameList(TRACKING);

// "Any TLD": at most one label before the brand, one or two short labels
// after it — www.amazon.co.uk matches, media-amazon.com does not.
const anyTld = brand =>
  new RegExp(`^(?:[a-z0-9-]+\\.)?${brand}\\.[a-z]{2,3}(?:\\.[a-z]{2})?$`);
const AMAZON = anyTld('amazon');
const EBAY = anyTld('ebay');
const bare = domain => host => host === domain || host === 'www.' + domain;

// A host may have several rows; the first whose `id` is found in the written
// path wins. `id`'s first group goes into `path`. `keep` names the
// variant-selecting query parameters the short form carries over (ruling B1).
// `junk` is the shop's own list for when no row of the host matched (§4).
const SHOPS = [
  { host: h => AMAZON.test(h),
    id: /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Za-z0-9])/,
    path: id => `/dp/${id}`, keep: [], junk: JUNK.amazon },
  { host: bare('etsy.com'), id: /\/listing\/(\d+)/, path: id => `/listing/${id}`,
    keep: ['variation0', 'variation1'], junk: JUNK.etsy },
  { host: h => EBAY.test(h), id: /\/itm\/(?:[^/]+\/)?(\d{9,15})/, path: id => `/itm/${id}`,
    keep: ['var'], junk: JUNK.ebay },
  { host: bare('walmart.com'), id: /\/ip\/(?:[^/]+\/)?(\d+)/, path: id => `/ip/${id}`,
    keep: [], junk: JUNK.walmart },
  { host: bare('target.com'), id: /\/p\/(?:[^/]+\/)?-\/A-(\d+)/, path: id => `/p/-/A-${id}`,
    keep: ['preselect'], junk: JUNK.target },
  // Best Buy, legacy form first: /site/<slug>/<sku>.p
  { host: bare('bestbuy.com'), id: /\/site\/(?:[^/]+\/)?(\d+)\.p/, path: id => `/site/${id}.p`,
    keep: [], junk: JUNK.bestbuy },
  // Best Buy, current form: /product/<slug>/<BSIN>. Best Buy needs a slug
  // segment but ignores its text, so the slug is kept exactly as written.
  { host: bare('bestbuy.com'), id: /\/product\/([^/?#]+\/[A-Z0-9]{10})(?![A-Za-z0-9])/,
    path: id => `/product/${id}`, keep: [], junk: JUNK.bestbuy },
];

// Characters a URL can hold as written: RFC 3986's unreserved and reserved
// sets, plus %. Anything else (CJK text, full-width punctuation), or a second
// scheme, means the text is not part of this URL. That text must survive
// (REQ-SSS-0003.3), so no rule may discard it.
const URL_CHARS = /^[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/;
const foreign = s => !URL_CHARS.test(s) || /https?:\/\//i.test(s);

// The shop ID in `url` as written, or null. The pattern runs once, on the
// written path (the URL up to the first ? or #); `.` and `..` segments are not
// resolved. What follows the match must be empty or the rest of a URL —
// starting /, ? or # with nothing foreign in it — or nothing may be dropped.
function discardableTail(url, idPattern) {
  const pathEnd = url.search(/[?#]/);
  const m = idPattern.exec(pathEnd === -1 ? url : url.slice(0, pathEnd));
  if (!m) return null;
  const tail = url.slice(m.index + m[0].length);
  if (tail !== '' && (!/^[/?#]/.test(tail) || foreign(tail))) return null;
  return { id: m[1], tail };
}

// A pair's name: the part before the first =, percent-decoded where
// possible, lower-cased.
function pairName(pair) {
  const raw = pair.split('=')[0];
  let name;
  try { name = decodeURIComponent(raw); } catch { name = raw; }
  return name.toLowerCase();
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

// `shopJunk` is the host's own name test (§4), or null off the shop hosts.
function isTracking(pair, shopJunk) {
  const name = pairName(pair);
  return isGenericTracking(name) || (shopJunk !== null && shopJunk(name));
}

// Removes tracking pairs from the query as written in `url`, leaving every
// other character alone. A pair holding foreign text or a ; is never removed.
// When only empty pairs remain, the ? goes too. Returns `url` itself when
// nothing is removed.
function stripTracking(url, shopJunk) {
  const query = queryOf(url);
  if (!query) return url;
  const { q, end, pairs } = query;
  const kept = pairs.filter(pair =>
    !isTracking(pair, shopJunk) || foreign(pair) || pair.includes(';'));
  if (kept.length === pairs.length) return url;
  const rest = kept.some(pair => pair !== '') ? '?' + kept.join('&') : '';
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
  const rows = SHOPS.filter(row => row.host(parsed.hostname));
  for (const row of rows) {
    const hit = discardableTail(url, row.id);
    if (hit) return parsed.origin + row.path(hit.id) + keptQuery(url, row.keep);
  }
  // The generic rule, plus the shop's own list on a shop host.
  const shopJunk = rows.length ? nameList(rows.flatMap(row => row.junk)) : null;
  return stripTracking(url, shopJunk);
}
