// Shared by the server-side service module and the browser client; no server-only code here.

/**
 * A business-rule error may carry values beside its code, e.g. {"message":"INVOICE_MONTH_SETTLED",
 * "year":1405,"month":7}. Those values ride on the thrown error as `details` (plain numbers,
 * strings and booleans only); "message" is never among them.
 */
export function errorDetails(parsed: unknown): Record<string, unknown> | undefined {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (k === 'message') continue;
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
