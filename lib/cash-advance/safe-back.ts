// Return-to-list target carried on a detail page's `back` query parameter.
// Only an in-app list path (optionally with its own query) is accepted; anything else — another
// origin, a protocol-relative or scheme URL, a backslash, a path outside the allowed lists — falls
// back to the plain list. Paths are zone-relative: the router adds the base path itself.

const ALLOWED_LISTS = ['/requests', '/invoice/view'] as const;
const MAX_LENGTH = 512;

export function safeBack(raw: string | null | undefined, fallback: string): string {
  if (!raw || raw.length > MAX_LENGTH) return fallback;
  if (raw.includes('\\') || raw.startsWith('//')) return fallback;
  // No whitespace or control characters anywhere.
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return fallback;
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  if (!ALLOWED_LISTS.includes(path as (typeof ALLOWED_LISTS)[number])) return fallback;
  return raw;
}

// Builds `path?key=value…` from the non-empty entries, for list URLs and `back` values.
export function withQuery(path: string, params: Record<string, string | null | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
