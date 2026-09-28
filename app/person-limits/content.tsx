'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { formatRial } from '@/lib/cash-advance/format';
import {
  createPersonLimit,
  listPersonLimits,
  listPersons,
  removePersonLimit,
  updatePersonLimit,
  type CashAdvancePersonView,
  type PersonDirectoryRecord,
} from '@/lib/cash-advance/api/client';
import { PersonPicker, personDisplayName } from './components/person-picker';

const LANG_CODE_TO_ID: Record<string, number> = { fa: 12, en: 10 };

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

interface Draft {
  personId: string;
  maxAmount: number;
  isActive: boolean;
  isExisting: boolean;
}

const EMPTY_DRAFT: Draft = {
  personId: '',
  maxAmount: 0,
  isActive: true,
  isExisting: false,
};

export function CashAdvanceAdminPersonLimitsContent() {
  const { t, i18n } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = LANG_CODE_TO_ID[language.code] ?? LANG_CODE_TO_ID[i18n.language] ?? 12;

  const [items, setItems] = useState<CashAdvancePersonView[]>([]);
  const [persons, setPersons] = useState<PersonDirectoryRecord[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try {
      const [limits, directory] = await Promise.all([listPersonLimits(), listPersons()]);
      setItems(limits);
      setPersons(directory);
    } catch {
      showError(t('admin.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const personsById = useMemo(() => {
    const m = new Map<string, PersonDirectoryRecord>();
    for (const p of persons) m.set(p.id, p);
    return m;
  }, [persons]);

  // When adding, exclude persons that already have a limit; when editing, allow the current one.
  const pickablePersons = useMemo(() => {
    const taken = new Set(items.map((i) => i.personId));
    return persons.filter((p) => !taken.has(p.id) || p.id === draft?.personId);
  }, [persons, items, draft?.personId]);

  const nameOf = (personId: string) => {
    const p = personsById.get(personId);
    return p ? personDisplayName(p, langId) : personId;
  };
  const nationalIdOf = (personId: string) => personsById.get(personId)?.nationalId ?? '—';

  const openAdd = () => setDraft({ ...EMPTY_DRAFT });
  const openEdit = (item: CashAdvancePersonView) =>
    setDraft({
      personId: item.personId,
      maxAmount: item.maxAmount,
      isActive: item.isActive,
      isExisting: true,
    });

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.personId) {
      showError(
        t('admin.personLimits.validation.personRequired', {
          defaultValue: 'Please select a person',
        }),
      );
      return;
    }
    if (!draft.maxAmount || draft.maxAmount <= 0) {
      showError(
        t('admin.personLimits.validation.maxAmountRequired', {
          defaultValue: 'Maximum amount is required',
        }),
      );
      return;
    }
    setSaving(true);
    try {
      if (draft.isExisting) {
        await updatePersonLimit({
          personId: draft.personId,
          maxAmount: draft.maxAmount,
          isActive: draft.isActive,
        });
        showSuccess(t('admin.common.toasts.updated', { defaultValue: 'Updated successfully' }));
      } else {
        await createPersonLimit({
          personId: draft.personId,
          maxAmount: draft.maxAmount,
          isActive: draft.isActive,
        });
        showSuccess(t('admin.common.toasts.created', { defaultValue: 'Created successfully' }));
      }
      setDraft(null);
      await refresh();
    } catch (e) {
      showError(
        e instanceof Error
          ? e.message
          : t('admin.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CashAdvancePersonView) => {
    if (
      !window.confirm(
        t('admin.common.confirmDelete', {
          defaultValue:
            'Are you sure you want to delete this item? This action cannot be undone.',
        }),
      )
    )
      return;
    try {
      await removePersonLimit({ personId: item.personId });
      showSuccess(t('admin.common.toasts.deleted', { defaultValue: 'Deleted successfully' }));
      await refresh();
    } catch (e) {
      showError(
        e instanceof Error
          ? e.message
          : t('admin.common.toasts.deleteError', { defaultValue: 'Failed to delete' }),
      );
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-violet-50/25! border-violet-100! dark:bg-violet-950/25! dark:border-violet-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle
                text={t('admin.personLimits.title', { defaultValue: 'Person Limits' })}
              />
              <ToolbarDescription>
                {t('admin.personLimits.description', {
                  defaultValue: 'Set the maximum cash advance amount per person',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div
        className={
          'space-y-5 lg:space-y-7.5 ' +
          '[&_div.rounded-xl.bg-card]:bg-violet-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-violet-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-violet-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-violet-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                {t('admin.personLimits.addButton', { defaultValue: 'Add Person Limit' })}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('admin.personLimits.columns.person', { defaultValue: 'Person' })}
                  </TableHead>
                  <TableHead>
                    {t('admin.personLimits.columns.nationalId', { defaultValue: 'National ID' })}
                  </TableHead>
                  <TableHead className="text-end">
                    {t('admin.personLimits.columns.maxAmount', { defaultValue: 'Max Amount' })}
                  </TableHead>
                  <TableHead className="text-center">
                    {t('admin.personLimits.columns.status', { defaultValue: 'Status' })}
                  </TableHead>
                  <TableHead className="text-center w-32">
                    {t('admin.personLimits.columns.actions', { defaultValue: 'Actions' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.personId}>
                    <TableCell className="font-medium">{nameOf(item.personId)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {nationalIdOf(item.personId)}
                    </TableCell>
                    <TableCell className="text-end">{formatRial(item.maxAmount)}</TableCell>
                    <TableCell className="text-center">
                      {item.isActive ? (
                        <Badge variant="success" appearance="light">
                          {t('admin.common.active', { defaultValue: 'Active' })}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" appearance="light">
                          {t('admin.common.inactive', { defaultValue: 'Inactive' })}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="size-4 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('admin.personLimits.empty', { defaultValue: 'No person limits added yet' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft?.isExisting
                ? t('admin.common.edit', { defaultValue: 'Edit' })
                : t('admin.personLimits.addButton', { defaultValue: 'Add Person Limit' })}
            </DialogTitle>
            <DialogDescription>
              {t('admin.personLimits.description', {
                defaultValue: 'Set the maximum cash advance amount per person',
              })}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <PersonPicker
                persons={pickablePersons}
                value={draft.personId}
                onChange={(personId) => setDraft({ ...draft, personId })}
                disabled={draft.isExisting}
                required
                label={t('admin.personLimits.form.person', { defaultValue: 'Person' })}
                placeholder={t('admin.personLimits.form.personPlaceholder', {
                  defaultValue: 'Select person',
                })}
              />

              <div className="space-y-1">
                <Label>
                  {t('admin.personLimits.form.maxAmount', { defaultValue: 'Maximum Amount' })}
                  <span className="text-rose-500 ms-1">*</span>
                </Label>
                <AmountInput
                  value={String(draft.maxAmount || '')}
                  onChange={(raw) => setDraft({ ...draft, maxAmount: raw === '' ? 0 : Number(raw) })}
                  placeholder={t('admin.personLimits.form.maxAmountPlaceholder', {
                    defaultValue: 'Enter maximum amount',
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t('admin.personLimits.form.isActive', { defaultValue: 'Active' })}</Label>
                <Switch
                  checked={draft.isActive}
                  onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              {t('admin.common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button onClick={handleSave} disabled={saving || !draft?.personId || !draft?.maxAmount}>
              {saving
                ? t('admin.common.processing', { defaultValue: 'Processing...' })
                : draft?.isExisting
                  ? t('admin.common.update', { defaultValue: 'Update' })
                  : t('admin.common.create', { defaultValue: 'Create' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
