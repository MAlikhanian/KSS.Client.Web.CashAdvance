import type { FlowTypeView } from '@/lib/cash-advance/api/client';

/**
 * Flow types are served by the backend as ONE list: each code with its display name in
 * each language. The form's Select, the server-side check and the labels below all read
 * that list, so adding a type is a single backend change and the three cannot drift apart.
 * Do not add a local copy of the codes or their names in this app.
 *
 * Kept free of React, fetch and i18n so it can be asserted without a browser.
 */

export type FlowTypeLang = 'en' | 'fa';

/** Display name of `code` in `lang`, or undefined when the code is not in the served list. */
export function flowTypeName(
  list: readonly FlowTypeView[],
  code: string,
  lang: FlowTypeLang,
): string | undefined {
  const item = list.find((x) => x.code === code);
  if (!item) return undefined;
  const name = lang === 'en' ? item.nameEn : item.nameFa;
  return name || item.nameFa || item.nameEn || undefined;
}

/**
 * What the table, the filter and the Select show for a stored value. A value that is not
 * in the served list (for example a legacy row entered as free text) falls through
 * unchanged rather than being hidden, so it stays visible and can be found and corrected.
 */
export function flowTypeDisplay(
  list: readonly FlowTypeView[],
  value: string | null | undefined,
  lang: FlowTypeLang,
): string {
  if (!value) return '—';
  return flowTypeName(list, value, lang) ?? value;
}

/**
 * Backend rejection codes for this form. They are mapped to this page's own i18n keys, not
 * to the shared `api-errors` namespace that translateApiError reads: that namespace is
 * kit-managed and identical in every zone, so adding a zone-specific code there would be a
 * kit change rather than a change to this app.
 */
export const INVALID_FLOW_TYPE = 'INVALID_FLOW_TYPE';
export const INVALID_DIRECTION = 'INVALID_DIRECTION';
