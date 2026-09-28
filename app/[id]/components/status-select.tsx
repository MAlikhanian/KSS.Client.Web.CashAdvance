'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { StatusView, StatusTranslationView } from '@/lib/cash-advance/api/client';

/** Resolve a status display name from translations, falling back to its code. */
export function statusName(
  statuses: StatusView[],
  translations: StatusTranslationView[],
  id: number,
  langId: number,
): string {
  if (!id) return '—';
  const tr =
    translations.find((x) => x.statusId === id && x.languageId === langId) ||
    translations.find((x) => x.statusId === id);
  return tr?.name?.trim() || statuses.find((s) => s.id === id)?.code || '—';
}

/** True when the chosen status code is "Rejected" (case-insensitive). */
export function statusIsRejected(statuses: StatusView[], id: number): boolean {
  const code = statuses.find((s) => s.id === id)?.code ?? '';
  return code.toLowerCase() === 'rejected';
}

interface StatusSelectProps {
  statuses: StatusView[];
  translations: StatusTranslationView[];
  langId: number;
  /** Selected status id (0 = none). */
  value: number;
  onChange: (id: number) => void;
  disabled?: boolean;
}

export function StatusSelect({
  statuses,
  translations,
  langId,
  value,
  onChange,
  disabled,
}: StatusSelectProps) {
  const { t } = useTranslation('cash-advance');
  return (
    <Select
      value={value ? String(value) : undefined}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue
          placeholder={t('ops.common.selectStatus', { defaultValue: 'Select status' })}
        />
      </SelectTrigger>
      <SelectContent>
        {statuses
          .filter((s) => s.isActive || s.id === value)
          .map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {statusName(statuses, translations, s.id, langId)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
