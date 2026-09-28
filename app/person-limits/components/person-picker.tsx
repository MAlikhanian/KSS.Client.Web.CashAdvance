'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import type { PersonDirectoryRecord } from '@/lib/cash-advance/api/client';

const LANG_CODE_TO_ID: Record<string, number> = { fa: 12, en: 10 };

/** Display name of a person in the active UI language, falling back gracefully. */
export function personDisplayName(person: PersonDirectoryRecord, langId: number): string {
  const tr =
    person.translations?.find((t) => t.languageId === langId) || person.translations?.[0];
  const name = tr ? `${tr.firstName} ${tr.lastName}`.trim() : '';
  return name || person.nationalId || person.id;
}

interface PersonPickerProps {
  persons: PersonDirectoryRecord[];
  value: string;
  onChange: (personId: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function PersonPicker({
  persons,
  value,
  onChange,
  disabled = false,
  label,
  placeholder,
  required = false,
}: PersonPickerProps) {
  const { t, i18n } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = LANG_CODE_TO_ID[language.code] ?? LANG_CODE_TO_ID[i18n.language] ?? 12;
  const [open, setOpen] = useState(false);

  const selected = persons.find((p) => p.id === value) ?? null;

  return (
    <div className="space-y-1">
      <Label>
        {label ?? t('admin.personLimits.form.person', { defaultValue: 'Person' })}
        {required && <span className="text-rose-500 ms-1">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn(!selected && 'text-muted-foreground')}>
              {selected
                ? `${personDisplayName(selected, langId)}${
                    selected.nationalId ? ` (${selected.nationalId})` : ''
                  }`
                : placeholder ??
                  t('admin.personLimits.form.personPlaceholder', {
                    defaultValue: 'Select person',
                  })}
            </span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('admin.common.searchPlaceholder', { defaultValue: 'Search...' })}
            />
            <CommandList>
              <CommandEmpty>
                {t('admin.common.noResults', { defaultValue: 'No results found' })}
              </CommandEmpty>
              <CommandGroup>
                {persons.map((person) => {
                  const name = personDisplayName(person, langId);
                  return (
                    <CommandItem
                      key={person.id}
                      value={`${name} ${person.nationalId ?? ''}`.trim()}
                      onSelect={() => {
                        onChange(person.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'me-2 h-4 w-4',
                          value === person.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-1">{name}</span>
                      {person.nationalId && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {person.nationalId}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
