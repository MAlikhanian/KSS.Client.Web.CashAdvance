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
import type { ProductView, ProductTranslationView } from '@/lib/cash-advance/api/client';

interface ProductPickerProps {
  /** Product catalog rows (loaded once by the parent). */
  products: ProductView[];
  /** Product translation rows (loaded once by the parent). */
  translations: ProductTranslationView[];
  /** Currently selected productId, or null. */
  value: string | null;
  /** Called with the new productId (or null when cleared). */
  onChange: (productId: string | null) => void;
  /** Language id used to resolve the display name (12=fa, 10=en). */
  langId: number;
  placeholder?: string;
}

function productDisplayName(
  product: ProductView,
  translations: ProductTranslationView[],
  langId: number,
): string {
  const tr =
    translations.find((x) => x.productId === product.id && x.languageId === langId) ||
    translations.find((x) => x.productId === product.id);
  return tr?.name?.trim() || product.code;
}

export function ProductPicker({
  products,
  translations,
  value,
  onChange,
  langId,
  placeholder,
}: ProductPickerProps) {
  const { t } = useTranslation('cash-advance');
  const [open, setOpen] = useState(false);

  const selected = value ? products.find((p) => p.id === value) ?? null : null;

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
                ? productDisplayName(selected, translations, langId)
                : placeholder ??
                  t('ops.requestDetail.itemForm.productPlaceholder', {
                    defaultValue: 'Select a product',
                  })}
            </span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('ops.common.searchPlaceholder', { defaultValue: 'Search...' })}
            />
            <CommandList>
              <CommandEmpty>
                {t('ops.common.noResults', { defaultValue: 'No results found' })}
              </CommandEmpty>
              <CommandGroup>
                {products
                  .filter((p) => p.isActive || p.id === value)
                  .map((p) => {
                    const name = productDisplayName(p, translations, langId);
                    return (
                      <CommandItem
                        key={p.id}
                        value={`${name} ${p.code}`.trim()}
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
                        <span className="text-xs text-muted-foreground font-mono">{p.code}</span>
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

export { productDisplayName };
