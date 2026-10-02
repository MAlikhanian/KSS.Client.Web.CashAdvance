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
/** The chosen direction is not the one the chosen flow type requires. */
export const FLOW_TYPE_DIRECTION_MISMATCH = 'FLOW_TYPE_DIRECTION_MISMATCH';

/**
 * Whether choosing a flow type that requires a direction also LOCKS the form's direction field.
 * true: the direction is set from the type and cannot be changed. false: it is only pre-filled.
 * Either way the server refuses a mismatched pairing.
 */
export const FLOW_TYPE_DIRECTION_LOCKED = true;

export type FlowDirection = 'In' | 'Out';

/**
 * The direction the served list requires for `code`, or null when the type allows either.
 * A list served without the field (an older backend) gives null for every type, so the form
 * behaves exactly as it did before the field existed.
 */
export function flowTypeDirection(
  list: readonly FlowTypeView[],
  code: string | null | undefined,
): FlowDirection | null {
  if (!code) return null;
  const d = (list.find((x) => x.code === code)?.direction ?? '').trim().toLowerCase();
  return d === 'in' ? 'In' : d === 'out' ? 'Out' : null;
}

/**
 * Form fields after choosing flow type `code`. A type that requires a direction sets it; a type
 * that allows either leaves the direction the user already had (it is not reset).
 */
export function chooseFlowType(
  list: readonly FlowTypeView[],
  code: string,
  currentDirection: string,
): { flowType: string; direction: string } {
  return { flowType: code, direction: flowTypeDirection(list, code) ?? currentDirection };
}

/** Whether the direction field is locked for the chosen flow type. */
export function directionLockedFor(
  list: readonly FlowTypeView[],
  code: string | null | undefined,
  locked: boolean = FLOW_TYPE_DIRECTION_LOCKED,
): boolean {
  return locked && flowTypeDirection(list, code) !== null;
}
