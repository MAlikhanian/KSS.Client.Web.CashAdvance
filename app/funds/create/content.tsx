'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { usePermission } from '@/hooks/use-permission';
import { translateApiError } from '@/lib/format-utils';
import {
  listWorksites,
  listProjects,
  createFund,
  createFundTranslation,
} from '@/lib/cash-advance/api/client';
import { useFundContext } from '../contexts/fund-context';
import {
  BasicInformationSection,
  type CreateFundFormData,
} from './components/basic-information-section';

const FA = 12;
const EN = 10;
const CODE_RE = /^[A-Za-z0-9]+$/;
const EDIT_ROUTE = '/cash-advance/funds/update';

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

const INITIAL: CreateFundFormData = {
  code: '',
  amount: '',
  projectId: '',
  worksiteId: '',
  name: '',
  isActive: true,
};

// Standalone create page — seed a fund (identity fields only), POST once, then
// hand the new id to the edit page via the fund context. Matches person/create
// (kss-create-page skill): single column, one seed section + Operations card.
export function CreateFundContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSelectedFundId } = useFundContext();
  const { hasPermission } = usePermission();
  const canModify = hasPermission(['CashAdvance.Admin.Modify']);

  const [formData, setFormData] = useState<CreateFundFormData>(INITIAL);

  const handleInputChange = (field: keyof CreateFundFormData, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // Reference data for the project + worksite selects (own query key).
  const { data: reference } = useQuery({
    queryKey: ['cash-advance-fund-reference'],
    queryFn: async () => {
      const [ws, pr] = await Promise.all([listWorksites(), listProjects()]);
      return {
        worksites: ws.worksites,
        worksiteTranslations: ws.translations,
        projects: pr.projects,
        projectTranslations: pr.translations,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const isValid =
    CODE_RE.test(formData.code.trim()) &&
    formData.amount.trim() !== '' &&
    !Number.isNaN(Number(formData.amount)) &&
    formData.projectId !== '' &&
    formData.worksiteId !== '' &&
    formData.name.trim() !== '';

  const mutation = useMutation({
    mutationFn: async (data: CreateFundFormData) => {
      const created = await createFund({
        code: data.code.trim(),
        amount: Number(data.amount),
        worksiteId: data.worksiteId,
        isActive: data.isActive,
      });
      await createFundTranslation({
        cashAdvanceId: created.id,
        languageId: langId,
        name: data.name.trim(),
      });
      return created;
    },
    onSuccess: (created) => {
      showSuccess(t('admin.common.toasts.created', { defaultValue: 'Created successfully' }));
      queryClient.invalidateQueries({ queryKey: ['cash-advance-funds'] });
      // Seed the shared context with the new fund, then drop into the edit page
      // where the rest (names in other languages, in-charge, …) is completed.
      setSelectedFundId(created.id);
      router.push(EDIT_ROUTE);
    },
    onError: (error: Error) => showError(translateApiError(error.message, t)),
  });

  const isSubmitting = mutation.status === 'pending';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card — blue, black/white doubled-selector border, OUTSIDE the tint. */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card className="bg-blue-50! dark:bg-blue-950/25! shadow-lg shadow-black/5">
          <CardContent className="py-5">
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle
                  text={t('admin.funds.pageTitleCreate', { defaultValue: 'Add Cash Advance' })}
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

      {/* Blue glass tint on every section Card — identical block to the edit page. */}
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
        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 lg:gap-7.5">
            {!canModify && (
              <Alert variant="secondary">
                <AlertIcon>
                  <RiErrorWarningFill />
                </AlertIcon>
                <AlertTitle>
                  {t('admin.common.readOnly', {
                    defaultValue: 'You do not have permission to modify this data.',
                  })}
                </AlertTitle>
              </Alert>
            )}

            <BasicInformationSection
              formData={formData}
              onInputChange={handleInputChange}
              projects={reference?.projects ?? []}
              projectTranslations={reference?.projectTranslations ?? []}
              worksites={reference?.worksites ?? []}
              worksiteTranslations={reference?.worksiteTranslations ?? []}
              langId={langId}
              disabled={isSubmitting || !canModify}
            />

            {/* Operations card — LAST, black/white border, redirect note + gated submit. */}
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
                      {t('admin.funds.form.createInfo', {
                        defaultValue:
                          'After saving, you will be redirected to the edit page to complete the fund.',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting || !isValid || !canModify}>
                      <Save className="size-4" />
                      {isSubmitting
                        ? t('admin.common.processing', { defaultValue: 'Processing...' })
                        : t('admin.funds.pageTitleCreate', { defaultValue: 'Add Cash Advance' })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
