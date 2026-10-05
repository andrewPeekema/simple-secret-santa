import { tidyUrl } from './urls.js';

// The shorten-a-link tool's logic, kept out of js/ui so node can test it
// (spec docs/superpowers/specs/2026-10-04-shorten-link-tool-design.html §3).
// string -> { state: 'empty' } | { state: 'notUrl' } | { state: 'unchanged' } | { state: 'short', url: string }
// No scheme is guessed: 'www.amazon.com/dp/…' is notUrl. Never throws.
export function shortenLink(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return { state: 'empty' };
  let parsed;
  try { parsed = new URL(trimmed); } catch { return { state: 'notUrl' }; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { state: 'notUrl' };
  const url = tidyUrl(trimmed);
  return url === trimmed ? { state: 'unchanged' } : { state: 'short', url };
}
