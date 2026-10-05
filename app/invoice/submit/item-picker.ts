import type { SelectableItemView } from '@/lib/cash-advance/api/client';

/**
 * Which items the invoice form's picker lists.
 *
 * An item is hidden by default once invoices cover 90% of its requested amount, or when it was
 * requested more than 30 days ago (counted in Tehran calendar days). Hidden items stay reachable
 * through search and "show all", and an item that is already selected is always listed. Rejected
 * invoices do not count (the server leaves them out of linkedAmount), so an item comes back when
 * one of its invoices is rejected. The server's 110% cap is the enforcement; this module only
 * decides what is offered.
 *
 * Kept free of React, fetch and i18n so it can be asserted without a browser.
 */

export const HIDE_AT_LINKED_SHARE = 0.9;
export const HIDE_AFTER_DAYS = 30;

// The server's refusal when a link would take an item over its cap, sent as the error message.
export const INVOICE_ITEM_OVER_CAP = 'INVOICE_ITEM_OVER_CAP';

// Iran has kept UTC+03:30 all year since 2022, so a fixed offset gives the Tehran calendar day.
const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const tehranDay = (ms: number) => Math.floor((ms + TEHRAN_OFFSET_MS) / DAY_MS);

export const isMostlyLinked = (r: SelectableItemView) =>
  r.linkedAmount >= HIDE_AT_LINKED_SHARE * r.requestedAmount;

export const isOld = (r: SelectableItemView, nowMs: number) => {
  const at = r.requestDate ? Date.parse(r.requestDate) : NaN;
  return Number.isFinite(at) && tehranDay(nowMs) - tehranDay(at) > HIDE_AFTER_DAYS;
};

export const shownByDefault = (r: SelectableItemView, nowMs: number) =>
  !isMostlyLinked(r) && !isOld(r, nowMs);

// The remaining amount can be negative for items already over-linked; it is shown as zero.
export const isFullyUsed = (r: SelectableItemView) => r.remainingAmount <= 0;
export const shownRemaining = (r: SelectableItemView) => Math.max(0, r.remainingAmount);

// Search text is compared after folding Persian and Arabic-Indic digits to ASCII, Arabic kaf and
// yeh to their Persian forms, dropping the zero-width non-joiner, and lower-casing.
export const normalizeSearch = (s: string) =>
  s
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\u0643/g, '\u06A9')
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u200C/g, '')
    .toLowerCase()
    .trim();

const requestTime = (r: SelectableItemView) => {
  const at = r.requestDate ? Date.parse(r.requestDate) : NaN;
  return Number.isFinite(at) ? at : -Infinity;
};

// Newest request first; undated rows last; then by request number and item id, so the order is
// stable.
const newestFirst = (a: SelectableItemView, b: SelectableItemView) =>
  requestTime(b) - requestTime(a) ||
  (b.requestNumber ?? '').localeCompare(a.requestNumber ?? '', 'en', { numeric: true }) ||
  a.itemId.localeCompare(b.itemId);

export function pickerRows(
  rows: SelectableItemView[],
  o: {
    ownRequestIds: ReadonlySet<string>;
    selected: ReadonlySet<string>;
    query: string;
    showAll: boolean;
    nowMs: number;
    productName: (productId: string) => string;
  },
): { visible: SelectableItemView[]; hiddenCount: number } {
  // Only the caller's own items, as before; the read returns every requester's items to holders
  // of Request.ReadAll.
  const own = rows.filter((r) => o.ownRequestIds.has(r.chargeRequestId));
  const q = normalizeSearch(o.query);
  const matches = (r: SelectableItemView) =>
    [o.productName(r.productId), r.description ?? '', r.requestNumber ?? ''].some((s) =>
      normalizeSearch(s).includes(q),
    );
  const visible = own
    .filter(
      (r) =>
        o.selected.has(r.itemId) ||
        (q ? matches(r) : o.showAll || shownByDefault(r, o.nowMs)),
    )
    .sort(newestFirst);
  const hiddenCount = own.filter((r) => !o.selected.has(r.itemId) && !shownByDefault(r, o.nowMs)).length;
  return { visible, hiddenCount };
}

// Selected ids the read did not return (for example an item rejected after this invoice was
// linked to it). They are still sent on save unless the user removes them, so they stay listed.
export const unavailableSelected = (rows: SelectableItemView[], selected: ReadonlySet<string>) => {
  const present = new Set(rows.map((r) => r.itemId));
  return Array.from(selected).filter((id) => !present.has(id));
};
