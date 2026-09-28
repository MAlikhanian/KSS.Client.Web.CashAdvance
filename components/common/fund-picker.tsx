'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  CashAdvanceView,
  CashAdvanceTranslationView,
} from '@/lib/cash-advance/api/client';

interface FundPickerProps {
  /** Fund rows (loaded once by the parent). */
  funds: CashAdvanceView[];
  /** Fund translation rows used to resolve the display name. */
  translations: CashAdvanceTranslationView[];
  /** Currently selected fund id, or null. */
  value: string | null;
  /** Called with the new fund id (or null when cleared). */
  onChange: (fundId: string | null) => void;
  /** Language id used to resolve the display name (12=fa, 10=en). */
  langId: number;
  placeholder?: string;
  /** When true, hide the clear (X) button (e.g. required field). */
  hideClear?: boolean;
}

export function fundDisplayName(
  fundId: string,
  translations: CashAdvanceTranslationView[],
  funds: CashAdvanceView[],
  langId: number,
): string {
  const rows = translations.filter((x) => x.cashAdvanceId === fundId);
  const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
  if (tr?.name) return tr.name;
  return funds.find((f) => f.id === fundId)?.code ?? fundId;
}

export function FundPicker({
  funds,
  translations,
  value,
  onChange,
  langId,
  placeholder,
  hideClear,
}: FundPickerProps) {
  const { t } = useTranslation('cash-advance');
  const [open, setOpen] = useState(false);

  const selected = value ? funds.find((f) => f.id === value) ?? null : null;

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selected
                ? `${fundDisplayName(selected.id, translations, funds, langId)} (${selected.code})`
                : placeholder ??
                  t('ops.invoices.form.fundPlaceholder', {
                    defaultValue: 'Select a fund',
                  })}
            </span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('ops.common.searchPlaceholder', {
                defaultValue: 'Search...',
              })}
            />
            <CommandList>
              <CommandEmpty>
                {t('ops.common.noResults', { defaultValue: 'No results found' })}
              </CommandEmpty>
              <CommandGroup>
                {funds.map((f) => {
                  const name = fundDisplayName(f.id, translations, funds, langId);
                  return (
                    <CommandItem
                      key={f.id}
                      value={`${name} ${f.code}`.trim()}
                      onSelect={() => {
                        onChange(f.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'me-2 h-4 w-4',
                          value === f.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-1">{name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {f.code}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && !hideClear && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
