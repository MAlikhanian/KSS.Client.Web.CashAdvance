// An invoice outside its registration window is refused by the server with
// {"message":"INVOICE_REGISTRATION_WINDOW_CLOSED","windowDays":7,"year":Y,"month":M,"day":D}, where
// Y/M/D is the LAST Persian day the invoice could still be registered. This module turns that answer
// into the text the invoice form shows. The rule itself (day 0 is the invoice date, Tehran days)
// belongs to the server alone.
import { faDigits, monthName } from '@/lib/cash-advance/month-settled';

export const INVOICE_REGISTRATION_WINDOW_CLOSED = 'INVOICE_REGISTRATION_WINDOW_CLOSED';

export type ClosedWindow = { windowDays: number; year: number; month: number; day: number };

/** The window carried by an error, or null when the error is not this refusal. */
export function closedWindowOf(err: unknown): ClosedWindow | null {
  const e = err as { message?: unknown; details?: Record<string, unknown> } | null;
  if (!e || e.message !== INVOICE_REGISTRATION_WINDOW_CLOSED) return null;
  const n = (k: string) => Number(e.details?.[k]);
  const w = { windowDays: n('windowDays'), year: n('year'), month: n('month'), day: n('day') };
  const ok =
    Object.values(w).every(Number.isInteger) &&
    w.windowDays > 0 &&
    w.month >= 1 &&
    w.month <= 12 &&
    w.day >= 1 &&
    w.day <= 31;
  return ok ? w : null;
}

/** The last allowed day: «۸ آبان ۱۴۰۵» in Persian, "8 Aban 1405" in English. */
export function lastDayLabel(w: ClosedWindow, lang: 'fa' | 'en'): string {
  if (lang === 'fa') return `${faDigits(w.day)} ${monthName(w.month, 'fa')} ${faDigits(w.year)}`;
  return `${w.day} ${monthName(w.month, 'en')} ${w.year}`;
}

/** The window length as shown: Persian digits in Persian. */
export function windowDaysLabel(w: ClosedWindow, lang: 'fa' | 'en'): string {
  return lang === 'fa' ? faDigits(w.windowDays) : String(w.windowDays);
}

export const WINDOW_CLOSED_KEY = 'ops.invoiceSubmit.registrationWindowClosed';
