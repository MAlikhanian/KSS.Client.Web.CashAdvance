// An invoice dated in a month whose settlement record exists is refused by the server with
// {"message":"INVOICE_MONTH_SETTLED","year":<Persian year>,"month":<1-12>}. This module turns that
// answer into the text the invoice form shows. The month is named as a value; the text does not
// say which month a settlement record closes.

export const INVOICE_MONTH_SETTLED = 'INVOICE_MONTH_SETTLED';

const FA_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];
const EN_MONTHS = [
  'Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand',
];
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export type SettledMonth = { year: number; month: number };

/** The closed month carried by an error, or null when the error is not this refusal. */
export function settledMonthOf(err: unknown): SettledMonth | null {
  const e = err as { message?: unknown; details?: Record<string, unknown> } | null;
  if (!e || e.message !== INVOICE_MONTH_SETTLED) return null;
  const year = Number(e.details?.year);
  const month = Number(e.details?.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

/** The Persian month's name, 1-12. */
export function monthName(month: number, lang: 'fa' | 'en'): string {
  return (lang === 'fa' ? FA_MONTHS : EN_MONTHS)[month - 1];
}

/** Latin digits as Persian digits. */
export function faDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** «مهر ۱۴۰۵» in Persian, "Mehr 1405" in English. */
export function monthLabel(m: SettledMonth, lang: 'fa' | 'en'): string {
  if (lang === 'fa') return `${monthName(m.month, 'fa')} ${faDigits(m.year)}`;
  return `${monthName(m.month, 'en')} ${m.year}`;
}

/** The Persian year and month of a stored date, read in Tehran. Null when unreadable. */
export function persianMonthOf(iso: string | null | undefined): SettledMonth | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return Number.isInteger(year) && Number.isInteger(month) ? { year, month } : null;
}

export type SettledVariant = 'submit' | 'resubmit' | 'moveDate';

/**
 * Which text to show. A new invoice: submit. A correction: resubmit when the closed month is the
 * invoice's own (stored) month, otherwise the new date moved it into a closed month.
 */
export function settledVariant(
  closed: SettledMonth,
  isCorrection: boolean,
  storedDateIso: string | null | undefined,
): SettledVariant {
  if (!isCorrection) return 'submit';
  const own = persianMonthOf(storedDateIso);
  return own && own.year === closed.year && own.month === closed.month ? 'resubmit' : 'moveDate';
}

export const SETTLED_KEYS: Readonly<Record<SettledVariant, string>> = {
  submit: 'ops.invoiceSubmit.monthSettled.submit',
  resubmit: 'ops.invoiceSubmit.monthSettled.resubmit',
  moveDate: 'ops.invoiceSubmit.monthSettled.moveDate',
};
