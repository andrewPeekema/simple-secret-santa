import { tidyUrl } from './urls.js';

// The shorten-a-link tool's logic, kept out of js/ui so node can test it
// (spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3;
// whitespace rule: docs/superpowers/specs/2026-10-05-url-cleanup-followup-design.html §6).
// string -> { state: 'empty' } | { state: 'notUrl' } | { state: 'unchanged' } | { state: 'short', url: string }
// No scheme is guessed: 'www.amazon.com/dp/…' is notUrl. Never throws.
export function shortenLink(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return { state: 'empty' };
  // Two links, or a link and words: not one link (REQ-SSS-0003.14). new URL
  // would silently drop an internal newline or tab, so this check comes first.
  if (/\s/.test(trimmed)) return { state: 'notUrl' };
  let parsed;
  try { parsed = new URL(trimmed); } catch { return { state: 'notUrl' }; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { state: 'notUrl' };
  const url = tidyUrl(trimmed);
  return url === trimmed ? { state: 'unchanged' } : { state: 'short', url };
}
