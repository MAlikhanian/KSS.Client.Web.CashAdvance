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
import type { PersonDirectoryRecord } from '@/lib/cash-advance/api/client';

interface PersonPickerProps {
  /** Person directory rows (loaded once by the parent). */
  persons: PersonDirectoryRecord[];
  /** Currently selected personId, or null. */
  value: string | null;
  /** Called with the new personId (or null when cleared). */
  onChange: (personId: string | null) => void;
  /** Language id used to resolve the display name (12=fa, 10=en). */
  langId: number;
  placeholder?: string;
}

function personDisplayName(p: PersonDirectoryRecord, langId: number): string {
  const tr =
    p.translations?.find((x) => x.languageId === langId) || p.translations?.[0];
  return tr ? `${tr.firstName} ${tr.lastName}`.trim() : p.nationalId || p.id;
}

export function PersonPicker({
  persons,
  value,
  onChange,
  langId,
  placeholder,
}: PersonPickerProps) {
  const { t } = useTranslation('cash-advance');
  const [open, setOpen] = useState(false);

  const selected = value ? persons.find((p) => p.id === value) ?? null : null;

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
                ? `${personDisplayName(selected, langId)}${
                    selected.nationalId ? ` (${selected.nationalId})` : ''
                  }`
                : placeholder ??
                  t('admin.funds.inCharge.personPlaceholder', {
                    defaultValue: 'Select person',
                  })}
            </span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('admin.common.searchPlaceholder', {
                defaultValue: 'Search...',
              })}
            />
            <CommandList>
              <CommandEmpty>
                {t('admin.common.noResults', { defaultValue: 'No results found' })}
              </CommandEmpty>
              <CommandGroup>
                {persons.map((p) => {
                  const name = personDisplayName(p, langId);
                  return (
                    <CommandItem
                      key={p.id}
                      value={`${name} ${p.nationalId ?? ''}`.trim()}
                      onSelect={() => {
                        onChange(p.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'me-2 h-4 w-4',
                          value === p.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-1">{name}</span>
                      {p.nationalId && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {p.nationalId}
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
      {selected && (
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

export { personDisplayName };
