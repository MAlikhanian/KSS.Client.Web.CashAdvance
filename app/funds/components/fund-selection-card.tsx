'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import {
  listFunds,
  listFundTranslations,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
} from '@/lib/cash-advance/api/client';
import { FundPicker, fundDisplayName } from '@/components/common/fund-picker';
import { useFundContext } from '../contexts/fund-context';

const FA = 12;
const EN = 10;

// Picker card that drives the fund selection context — mirrors person's
// selection card (titled header + searchable combobox + selected banner).
// Shown on the /view and /update pages so the user can pick or switch which
// fund those context-driven pages operate on.
export function FundSelectionCard() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const { selectedFundId, setSelectedFundId } = useFundContext();

  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [translations, setTranslations] = useState<CashAdvanceTranslationView[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [f, ft] = await Promise.all([listFunds(), listFundTranslations()]);
        setFunds(f);
        setTranslations(ft);
      } catch {
        /* the pages below still render their own empty state */
      }
    })();
  }, []);

  const selectedName = selectedFundId
    ? fundDisplayName(selectedFundId, translations, funds, langId)
    : '';

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {t('admin.funds.selection.title', { defaultValue: 'Select Cash Advance Fund' })}
        </CardTitle>
        <CardDescription className="mx-auto max-w-2xl">
          {t('admin.funds.selection.description', {
            defaultValue: 'Select a fund from the list to view or manage it.',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>{t('admin.funds.selection.label', { defaultValue: 'Fund' })}</Label>
          <FundPicker
            funds={funds}
            translations={translations}
            value={selectedFundId || null}
            onChange={(id) => setSelectedFundId(id ?? '')}
            langId={langId}
            placeholder={t('admin.funds.selection.placeholder', {
              defaultValue: 'Choose a cash advance fund',
            })}
          />
        </div>
        {selectedFundId && selectedName && (
          <div className="mt-3 p-3 bg-blue-200 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
            <p className="text-sm text-card-foreground">
              <span className="font-semibold">
                {t('admin.funds.selection.selectedLabel', { defaultValue: 'Selected:' })}
              </span>{' '}
              {selectedName}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
