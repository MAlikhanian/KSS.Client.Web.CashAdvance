import { listPersonDirectoryByCompany } from '@/services/person-api';
import type { CashAdvanceServiceRow, CashAdvanceView } from '@/services/cash-advance-api';

/**
 * Server only. Replaces each fund row's holder person ids with the holders' display names, so the
 * fund pickers can show who holds a fund without the browser receiving the person directory.
 *
 * Names come from the caller's own company directory, read with the caller's token. Only a name
 * string per holder leaves this function: no person id, national id or directory record. A
 * holder the directory does not return (for example outside the caller's active company) is left
 * out rather than shown as an id. If the directory cannot be read, the funds are still returned,
 * with no holder names.
 */

// Language ids of the Person service translations.
const LANG_FA = 12;
const LANG_EN = 10;

type DirectoryRecord = Awaited<ReturnType<typeof listPersonDirectoryByCompany>>[number];

// The holder's name in Persian, then English, then any translation. Null when there is none.
// The UI language is not known on the server, so the Persian name, the zone's main language,
// is used for both languages.
export function holderDisplayName(person: DirectoryRecord): string | null {
  const translations = person.translations ?? [];
  const pick =
    translations.find((t) => t.languageId === LANG_FA) ??
    translations.find((t) => t.languageId === LANG_EN) ??
    translations[0];
  const name = pick ? `${pick.firstName ?? ''} ${pick.lastName ?? ''}`.trim() : '';
  return name || null;
}

export async function withHolderNames(
  rows: CashAdvanceServiceRow[],
  token: string,
): Promise<CashAdvanceView[]> {
  const ids = new Set<string>();
  for (const r of rows) for (const id of r.holderPersonIds ?? []) ids.add(id.toLowerCase());

  const names = new Map<string, string>();
  if (ids.size > 0) {
    try {
      for (const person of await listPersonDirectoryByCompany(token)) {
        const key = person.id?.toLowerCase();
        if (!key || !ids.has(key)) continue;
        const name = holderDisplayName(person);
        if (name) names.set(key, name);
      }
    } catch {
      // The fund list does not depend on the directory: without it, no holder names are shown.
    }
  }

  return rows.map(({ holderPersonIds, ...fund }) => ({
    ...fund,
    holderNames: (holderPersonIds ?? [])
      .map((id) => names.get(id.toLowerCase()))
      .filter((n): n is string => !!n),
  }));
}
