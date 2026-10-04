// Shop-URL cleanup for wishlists (REQ-SSS-0003.1, .3; spec
// docs/superpowers/specs/2026-10-04-wishlist-url-cleanup-design.html §2).
// Pure string work: no DOM, no imports, nothing fetched (REQ-SSS-0004).

// Query parameters removed from any URL: these exact names, plus any name
// starting utm_.
const TRACKING = new Set(['ref', 'ref_', 'tag', 'fbclid', 'gclid', 'msclkid',
  'mc_cid', 'mc_eid', '_ga', 'igshid']);

// "Any TLD": at most one label before the brand, one or two short labels
// after it — www.amazon.co.uk matches, media-amazon.com does not.
const anyTld = brand =>
  new RegExp(`^(?:[a-z0-9-]+\\.)?${brand}\\.[a-z]{2,3}(?:\\.[a-z]{2})?$`);
const AMAZON = anyTld('amazon');
const EBAY = anyTld('ebay');
const bare = domain => host => host === domain || host === 'www.' + domain;

// First matching row wins. `id` is applied to url.pathname; its first group
// goes into `path`.
const SHOPS = [
  { host: h => AMAZON.test(h),
    id: /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?![A-Za-z0-9])/,
    path: id => `/dp/${id}` },
  { host: bare('etsy.com'), id: /\/listing\/(\d+)/, path: id => `/listing/${id}` },
  { host: h => EBAY.test(h), id: /\/itm\/(?:[^/]+\/)?(\d{9,15})/, path: id => `/itm/${id}` },
  { host: bare('walmart.com'), id: /\/ip\/(?:[^/]+\/)?(\d+)/, path: id => `/ip/${id}` },
  { host: bare('target.com'), id: /\/p\/(?:[^/]+\/)?-\/A-(\d+)/, path: id => `/p/-/A-${id}` },
  { host: bare('bestbuy.com'), id: /\/site\/(?:[^/]+\/)?(\d+)\.p/, path: id => `/site/${id}.p` },
];

function isTracking(pair) {
  const raw = pair.split('=')[0];
  let name;
  try { name = decodeURIComponent(raw); } catch { name = raw; }
  return name.startsWith('utm_') || TRACKING.has(name);
}

// Removes tracking pairs from the query as written in `url`, leaving every
// other character alone. Returns `url` itself when nothing is removed.
function stripTracking(url) {
  const hash = url.indexOf('#');
  const end = hash === -1 ? url.length : hash;
  const q = url.indexOf('?');
  if (q === -1 || q > end) return url;
  const pairs = url.slice(q + 1, end).split('&');
  const kept = pairs.filter(pair => !isTracking(pair));
  if (kept.length === pairs.length) return url;
  const query = kept.length ? '?' + kept.join('&') : '';
  return url.slice(0, q) + query + url.slice(end);
}

export function tidyUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return url; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url;
  for (const shop of SHOPS) {
    if (!shop.host(parsed.hostname)) continue;
    const m = shop.id.exec(parsed.pathname);
    if (m) return parsed.origin + shop.path(m[1]);
    break; // a shop host without an ID in its path gets the generic rule
  }
  return stripTracking(url);
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
