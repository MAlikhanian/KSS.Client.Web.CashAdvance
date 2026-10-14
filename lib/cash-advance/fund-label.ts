// How a fund is named in every fund picker: the fund's name, its current holders in parentheses,
// then its code: «نام تنخواه (نام تنخواه‌دار) · کد». The format lives here only; change it here.
//
// - No holder: the name and code only, with no empty brackets.
// - One or two holders: all of them, joined.
// - Three or more: the first, then "+n" for the rest; the full list goes in the title.
//
// Kept free of React and i18n so it can be asserted without a browser.

export const HOLDERS_OPEN = ' (';
export const HOLDERS_CLOSE = ')';
export const CODE_SEPARATOR = ' · ';
// Holders listed by name before the rest are counted as "+n".
export const MAX_NAMED_HOLDERS = 2;

// The list separator of the UI language (12 = Persian, otherwise English).
const holderJoin = (langId: number) => (langId === 12 ? '، ' : ', ');

const cleanNames = (holderNames: readonly string[] | undefined) =>
  (holderNames ?? []).map((n) => n.trim()).filter(Boolean);

// The holders part shown in the label: '' when there is none.
export function holdersText(holderNames: readonly string[] | undefined, langId: number): string {
  const names = cleanNames(holderNames);
  if (names.length === 0) return '';
  if (names.length <= MAX_NAMED_HOLDERS) return names.join(holderJoin(langId));
  return `${names[0]} +${names.length - 1}`;
}

// The fund's name with its holders, without the code (for lists that show the code apart).
export function fundNameWithHolders(
  name: string,
  holderNames: readonly string[] | undefined,
  langId: number,
): string {
  const holders = holdersText(holderNames, langId);
  return holders ? `${name}${HOLDERS_OPEN}${holders}${HOLDERS_CLOSE}` : name;
}

// The full label: name, holders and code.
export function fundLabel(
  name: string,
  code: string | null | undefined,
  holderNames: readonly string[] | undefined,
  langId: number,
): string {
  const base = fundNameWithHolders(name, holderNames, langId);
  return code ? `${base}${CODE_SEPARATOR}${code}` : base;
}

// The full text for a tooltip: every holder named, nothing counted as "+n".
export function fundTitle(
  name: string,
  code: string | null | undefined,
  holderNames: readonly string[] | undefined,
  langId: number,
): string {
  const names = cleanNames(holderNames);
  const base = names.length ? `${name}${HOLDERS_OPEN}${names.join(holderJoin(langId))}${HOLDERS_CLOSE}` : name;
  return code ? `${base}${CODE_SEPARATOR}${code}` : base;
}

// The text a picker's search matches: the name, the code and every holder's name.
export function fundSearchText(
  name: string,
  code: string | null | undefined,
  holderNames: readonly string[] | undefined,
): string {
  return [name, code ?? '', ...cleanNames(holderNames)].join(' ').trim();
}
