'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { usePermission } from '@/hooks/use-permission';
import {
  listFunds,
  updateFund,
  listWorksites,
  listProjects,
  listPersons,
} from '@/lib/cash-advance/api/client';
import { FundNameGrid } from './fund-name-grid';
import { FundInChargeSection } from './fund-incharge-section';

const FA = 12;
const EN = 10;
const CODE_RE = /^[A-Za-z0-9]+$/;
const LIST_ROUTE = '/cash-advance/funds/view';

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

interface FundFormProps {
  fundId?: string;
  readOnly?: boolean;
  /** Optional selector rendered as the first (black/white) card in the section stack. */
  selector?: ReactNode;
}

export function FundForm({ fundId, readOnly = false, selector }: FundFormProps) {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const router = useRouter();
  const { hasPermission } = usePermission();
  const canModify = hasPermission(['CashAdvance.Admin.Modify']);
  const canEdit = canModify && !readOnly;
  const isEdit = Boolean(fundId);

  // form fields
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [projectId, setProjectId] = useState('');
  const [worksiteId, setWorksiteId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);

  // One shared reference/lookup query for the whole form (projects, worksites,
  // persons + the fund list for sidebar stats). staleTime 5 min; sections read
  // persons from here instead of re-fetching.
  const { data: ref } = useQuery({
    queryKey: ['fund-reference-data'],
    queryFn: async () => {
      const [ws, pr, funds, persons] = await Promise.all([
        listWorksites(),
        listProjects(),
        listFunds(),
        listPersons(),
      ]);
      return {
        worksites: ws.worksites,
        worksiteTranslations: ws.translations,
        projects: pr.projects,
        projectTranslations: pr.translations,
        funds,
        persons,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const projects = ref?.projects ?? [];
  const projectTranslations = ref?.projectTranslations ?? [];
  const worksites = ref?.worksites ?? [];
  const worksiteTranslations = ref?.worksiteTranslations ?? [];
  const persons = ref?.persons ?? [];

  // Populate the editable fields from the selected fund once the data arrives.
  useEffect(() => {
    if (!isEdit || !fundId || !ref) return;
    const f = ref.funds.find((x) => x.id === fundId);
    if (f) {
      setCode(f.code);
      setAmount(String(f.amount ?? ''));
      setProjectId(ref.worksites.find((w) => w.id === f.worksiteId)?.projectId ?? '');
      setWorksiteId(f.worksiteId);
      setIsActive(f.isActive);
    }
  }, [isEdit, fundId, ref]);

  const projectName = useCallback(
    (id: string) => {
      const rows = projectTranslations.filter((x) => x.projectId === id);
      const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
      if (tr?.name) return tr.name;
      return projects.find((p) => p.id === id)?.code ?? '—';
    },
    [projectTranslations, projects, langId],
  );

  const worksiteName = useCallback(
    (id: string) => {
      const rows = worksiteTranslations.filter((x) => x.worksiteId === id);
      const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
      if (tr?.name) return tr.name;
      return worksites.find((w) => w.id === id)?.code ?? '—';
    },
    [worksiteTranslations, worksites, langId],
  );

  const handleSave = async () => {
    if (!fundId) return;
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      showError(t('admin.funds.validation.codeRequired', { defaultValue: 'Code is required' }));
      return;
    }
    if (!CODE_RE.test(trimmedCode)) {
      showError(t('admin.funds.form.codeHint', { defaultValue: 'English letters and digits only' }));
      return;
    }
    const amt = Number(amount);
    if (!amount.trim() || Number.isNaN(amt)) {
      showError(t('admin.funds.validation.amountRequired', { defaultValue: 'Amount is required' }));
      return;
    }
    if (!projectId) {
      showError(t('admin.funds.validation.projectRequired', { defaultValue: 'Project is required' }));
      return;
    }
    if (!worksiteId) {
      showError(t('admin.funds.validation.worksiteRequired', { defaultValue: 'Worksite is required' }));
      return;
    }

    setSaving(true);
    try {
      await updateFund({ id: fundId, code: trimmedCode, amount: amt, worksiteId, isActive });
      showSuccess(t('admin.common.toasts.updated', { defaultValue: 'Updated successfully' }));
      router.push(LIST_ROUTE);
    } catch (e) {
      showError(
        (e as Error)?.message ||
          t('admin.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Edit / View → person/edit skeleton (blue, sectioned, name grid on top).
  //    Renders whenever a fund is selected OR a selector is supplied (so the
  //    skeleton + Selection card show even before a fund is picked). ──
  if (fundId || selector) {
    return (
      <div className="space-y-5 lg:space-y-7.5">
        {/*
          Title Card lives OUTSIDE the descendant-tint wrapper below so its
          border override wins; it flips to red on view-only / no-modify.
        */}
        <div
          className={
            !canEdit
              ? '[&_div.rounded-xl.bg-card.bg-card]:border-red-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-red-500!'
              : '[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!'
          }
        >
          <Card className="bg-blue-50! dark:bg-blue-950/25! shadow-lg shadow-black/5">
            <CardContent className="py-5">
              <Toolbar>
                <ToolbarHeading>
                  <ToolbarPageTitle
                    text={
                      readOnly
                        ? t('admin.funds.pageTitleView', { defaultValue: 'View Cash Advance' })
                        : t('admin.funds.pageTitleEdit', { defaultValue: 'Edit Cash Advance' })
                    }
                  />
                  <ToolbarDescription>
                    {t('admin.funds.description', {
                      defaultValue: 'Manage cash advance funds (tankhah) per worksite',
                    })}
                  </ToolbarDescription>
                </ToolbarHeading>
              </Toolbar>
            </CardContent>
          </Card>
        </div>

        {/* Blue glass tint applied to every section Card via descendant selector. */}
        <div
          className={
            '[&_div.rounded-xl.bg-card]:bg-blue-50! ' +
            '[&_div.rounded-xl.bg-card]:border-blue-100! ' +
            'dark:[&_div.rounded-xl.bg-card]:bg-blue-950/25! ' +
            'dark:[&_div.rounded-xl.bg-card]:border-blue-900! ' +
            '[&_div.rounded-xl.bg-card]:shadow-lg ' +
            '[&_div.rounded-xl.bg-card]:shadow-black/5 ' +
            '[&_tr:has(td):hover]:bg-blue-100! ' +
            'dark:[&_tr:has(td):hover]:bg-muted/50! ' +
            '[&_.text-muted-foreground]:text-card-foreground! ' +
            '[&_[data-slot="table-head"]]:text-muted-foreground! ' +
            '[&_.text-sm.text-muted-foreground.text-center]:text-muted-foreground! ' +
            '[&_[data-slot="card-description"]]:text-muted-foreground!'
          }
        >
          <div className="space-y-6">
                {/* Selection card (black/white border) — first, matches person */}
                {selector && (
                  <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
                    {selector}
                  </div>
                )}
                {fundId ? (
                  <div className="space-y-6">
                    <fieldset disabled={!canEdit} className="space-y-6 contents">
                    {/* Section 1 — Names (blue badge) */}
                <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                          1
                        </span>
                        {t('admin.funds.form.names', { defaultValue: 'Names' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FundNameGrid fundId={fundId} />
                    </CardContent>
                  </Card>
                </div>

                {/* Section 2 — Fund Information (blue badge) */}
                <div className="[&_div.rounded-xl.bg-card.bg-card]:border-blue-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-blue-500!">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                          2
                        </span>
                        {t('admin.funds.form.sectionTitle', { defaultValue: 'Fund Information' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>{t('admin.funds.form.code', { defaultValue: 'Code' })}</Label>
                          <Input
                            value={code}
                            dir={code ? 'ltr' : undefined}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={t('admin.funds.form.codePlaceholder', {
                              defaultValue: 'Enter fund code',
                            })}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('admin.funds.form.codeHint', {
                              defaultValue: 'English letters and digits only',
                            })}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('admin.funds.form.amount', { defaultValue: 'Amount' })}</Label>
                          <AmountInput
                            value={amount}
                            onChange={(raw) => setAmount(raw)}
                            placeholder={t('admin.funds.form.amountPlaceholder', {
                              defaultValue: 'Enter fund amount',
                            })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{t('admin.funds.form.project', { defaultValue: 'Project' })}</Label>
                          <Select
                            value={projectId || undefined}
                            onValueChange={(v) => {
                              setProjectId(v);
                              setWorksiteId('');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t('admin.funds.form.projectPlaceholder', {
                                  defaultValue: 'Select project',
                                })}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {projects
                                .filter((p) => p.isActive || p.id === projectId)
                                .map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {projectName(p.id)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('admin.funds.form.worksite', { defaultValue: 'Worksite' })}</Label>
                          <Select
                            value={worksiteId || undefined}
                            onValueChange={(v) => setWorksiteId(v)}
                            disabled={!projectId}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  projectId
                                    ? t('admin.funds.form.worksitePlaceholder', {
                                        defaultValue: 'Select worksite',
                                      })
                                    : t('admin.funds.form.selectProjectFirst', {
                                        defaultValue: 'Select a project first',
                                      })
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {worksites
                                .filter(
                                  (w) =>
                                    w.projectId === projectId &&
                                    (w.isActive || w.id === worksiteId),
                                )
                                .map((w) => (
                                  <SelectItem key={w.id} value={w.id}>
                                    {worksiteName(w.id)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('admin.funds.form.isActive', { defaultValue: 'Active' })}</Label>
                          <Select
                            value={isActive ? 'true' : 'false'}
                            onValueChange={(v) => setIsActive(v === 'true')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">
                                {t('admin.funds.form.statusActive', { defaultValue: 'Active' })}
                              </SelectItem>
                              <SelectItem value="false">
                                {t('admin.funds.form.statusInactive', { defaultValue: 'Inactive' })}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Section 3 — Responsible Person (in-charge), self-contained */}
                <FundInChargeSection fundId={fundId} persons={persons} />

                {/* Operations card — LAST (black/white border), matches person/edit */}
                {canEdit && (
                  <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {t('admin.funds.form.operations', { defaultValue: 'Operations' })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex items-start gap-2">
                          <RiInformationFill className="text-blue-600 dark:text-blue-400 size-5 shrink-0 mt-0.5" />
                          <span className="text-sm text-card-foreground">
                            {t('admin.funds.form.operationsHint', {
                              defaultValue:
                                'Names are saved automatically. Click Save to update the fund information.',
                            })}
                          </span>
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handleSave} disabled={saving}>
                            <Save className="size-4" />
                            {saving
                              ? t('admin.common.processing', { defaultValue: 'Processing...' })
                              : t('admin.common.save', { defaultValue: 'Save' })}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                    </fieldset>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                      {t(
                        readOnly
                          ? 'admin.funds.selection.empty'
                          : 'admin.funds.selection.emptyUpdate',
                        { defaultValue: 'Select a fund above.' },
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
        </div>
      </div>
    );
  }

  // Create now lives in the standalone create/content.tsx (kss-create-page skill);
  // FundForm renders only the edit/view skeleton.
  return null;
}
