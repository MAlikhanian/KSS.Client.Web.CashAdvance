/** Format a number as Persian-locale rials with " ریال" suffix. */
export function formatRial(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${new Intl.NumberFormat('fa-IR').format(value)} ریال`;
}

/** Format an ISO date string as a short Persian-style date (yyyy/mm/dd Gregorian). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/** Format an ISO date + time string. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/** Compose the request number for a year + sequence (e.g. "CA-2026-0001"). */
export function makeRequestNumber(year: number, seq: number): string {
  return `CA-${year}-${String(seq).padStart(4, '0')}`;
}

/** Extract the year from an ISO date (for monthly grouping). */
export function isoYearMonth(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
