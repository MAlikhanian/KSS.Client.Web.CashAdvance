'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, ChevronDown } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { formatDate } from '@/lib/cash-advance/format';
import {
  listInCharges,
  createInCharge,
  updateInCharge,
  type CashAdvanceInChargeView,
  type PersonDirectoryRecord,
} from '@/lib/cash-advance/api/client';
import { PersonPicker, personDisplayName } from './person-picker';

const FA = 12;
const EN = 10;

function showSuccess(msg: string) {
  toast.custom(
    () => (
      <Alert variant="mono" icon="success">
        <AlertIcon>
          <RiCheckboxCircleFill />
        </AlertIcon>
        <AlertTitle>{msg}</AlertTitle>
      </Alert>
    ),
    { position: 'top-center' },
  );
}

function showError(msg: string) {
  toast.custom(
    () => (
      <Alert variant="mono" icon="destructive">
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{msg}</AlertTitle>
      </Alert>
    ),
    { position: 'top-center' },
  );
}

function isoDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

interface FundInChargeSectionProps {
  fundId: string;
  /** Person directory (shared reference data from the parent form). */
  persons: PersonDirectoryRecord[];
}

/**
 * Section 3 — Responsible Person (in-charge). Self-contained list section
 * (person/edit Archetype B): loads its own rows and saves per-row. The person
 * lookup comes from the parent's shared reference query — not re-fetched here.
 * Read-only is driven by the parent's <fieldset disabled>, not a prop.
 */
export function FundInChargeSection({ fundId, persons }: FundInChargeSectionProps) {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;

  const [rows, setRows] = useState<CashAdvanceInChargeView[]>([]);
  const [assignPersonId, setAssignPersonId] = useState<string | null>(null);
  const [assignFromDate, setAssignFromDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  // End date entered per active row (keyed by in-charge row id).
  const [endDates, setEndDates] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      const ic = await listInCharges();
      setRows(
        ic
          .filter((x) => x.cashAdvanceId === fundId)
          .sort((a, b) => (a.fromDate < b.fromDate ? 1 : -1)),
      );
    } catch {
      showError(t('admin.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
    }
  }, [fundId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const personName = useCallback(
    (personId: string) => {
      const p = persons.find((x) => x.id === personId);
      return p ? personDisplayName(p, langId) : personId;
    },
    [persons, langId],
  );

  const handleAssign = async () => {
    if (!assignPersonId) {
      showError(t('admin.funds.validation.personRequired', { defaultValue: 'Please select a person' }));
      return;
    }
    if (!assignFromDate) {
      showError(t('admin.funds.validation.fromDateRequired', { defaultValue: 'From date is required' }));
      return;
    }
    setAssigning(true);
    try {
      await createInCharge({ cashAdvanceId: fundId, personId: assignPersonId, fromDate: assignFromDate });
      showSuccess(t('admin.common.toasts.created', { defaultValue: 'Created successfully' }));
      setAssignPersonId(null);
      setAssignFromDate('');
      await loadData();
    } catch (e) {
      showError(
        (e as Error)?.message || t('admin.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleEndAssignment = async (row: CashAdvanceInChargeView) => {
    const toDate = endDates[row.id];
    if (!toDate) {
      showError(t('admin.funds.validation.toDateRequired', { defaultValue: 'End date is required' }));
      return;
    }
    if (toDate < isoDate(row.fromDate)) {
      showError(
        t('admin.funds.validation.toDateBeforeFrom', {
          defaultValue: 'End date cannot be before the start date',
        }),
      );
      return;
    }
    try {
      await updateInCharge({
        id: row.id,
        personId: row.personId,
        fromDate: isoDate(row.fromDate),
        toDate,
      });
      showSuccess(t('admin.common.toasts.updated', { defaultValue: 'Updated successfully' }));
      setEndDates((m) => {
        const next = { ...m };
        delete next[row.id];
        return next;
      });
      await loadData();
    } catch (e) {
      showError(
        (e as Error)?.message || t('admin.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    }
  };

  return (
    <div className="[&_div.rounded-xl.bg-card.bg-card]:border-emerald-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-emerald-500!">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              3
            </span>
            {t('admin.funds.inCharge.sectionTitle', { defaultValue: 'Responsible Person' })}
            <Badge variant="outline">{rows.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1 md:col-span-1">
                <Label>{t('admin.funds.inCharge.person', { defaultValue: 'Person' })}</Label>
                <PersonPicker
                  persons={persons}
                  value={assignPersonId}
                  onChange={setAssignPersonId}
                  langId={langId}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('admin.funds.inCharge.fromDate', { defaultValue: 'From Date' })}</Label>
                <DatePickerComponent value={assignFromDate} onChange={setAssignFromDate} forcePersian />
              </div>
              <div>
                <Button onClick={handleAssign} disabled={assigning}>
                  <Plus className="size-4" />
                  {t('admin.funds.inCharge.addButton', { defaultValue: 'Assign In-Charge' })}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {rows.map((row) => {
                const active = !row.toDate;
                return (
                  <Collapsible
                    key={row.id}
                    className={`rounded-lg border ${active ? 'bg-muted/30' : ''}`}
                  >
                    <CollapsibleTrigger className="group w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-muted/50 rounded-lg">
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                      <span className="font-medium">{personName(row.personId)}</span>
                      {active ? (
                        <Badge variant="success" appearance="light">
                          {t('admin.funds.inCharge.current', { defaultValue: 'Current' })}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          appearance="light"
                          style={{ unicodeBidi: 'plaintext' }}
                        >
                          {formatDate(row.toDate)}
                        </Badge>
                      )}
                      <span
                        className="ms-auto text-sm text-muted-foreground"
                        style={{ unicodeBidi: 'plaintext' }}
                      >
                        {formatDate(row.fromDate)}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t px-4 py-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {t('admin.funds.inCharge.fromDate', { defaultValue: 'From Date' })}
                          </div>
                          <div style={{ unicodeBidi: 'plaintext' }}>{formatDate(row.fromDate)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {t('admin.funds.inCharge.toDate', { defaultValue: 'To Date' })}
                          </div>
                          {active ? (
                            <div className="flex items-center gap-2">
                              <DatePickerComponent
                                value={endDates[row.id] ?? ''}
                                onChange={(v) => setEndDates((m) => ({ ...m, [row.id]: v }))}
                                forcePersian
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!endDates[row.id]}
                                onClick={() => handleEndAssignment(row)}
                              >
                                {t('admin.funds.inCharge.endAssignment', { defaultValue: 'End Assignment' })}
                              </Button>
                            </div>
                          ) : (
                            <div style={{ unicodeBidi: 'plaintext' }}>{formatDate(row.toDate)}</div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {rows.length === 0 && (
                <div className="rounded-lg border py-8 text-center text-muted-foreground">
                  {t('admin.funds.inCharge.empty', { defaultValue: 'No in-charge assignments yet' })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
