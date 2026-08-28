'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AmountInput } from '@/components/ui/amount-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  WorksiteView,
  WorksiteTranslationView,
  ProjectView,
  ProjectTranslationView,
} from '@/lib/cash-advance/api/client';

// The seed fields needed to POST a valid fund + its name (in the current UI
// language). Owns the form-data interface; content.tsx imports it from here.
export interface CreateFundFormData {
  code: string;
  amount: string;
  projectId: string;
  worksiteId: string;
  name: string;
  isActive: boolean;
}

interface BasicInformationSectionProps {
  formData: CreateFundFormData;
  onInputChange: (field: keyof CreateFundFormData, value: string | boolean) => void;
  projects: ProjectView[];
  projectTranslations: ProjectTranslationView[];
  worksites: WorksiteView[];
  worksiteTranslations: WorksiteTranslationView[];
  langId: number;
  disabled?: boolean;
}

export function BasicInformationSection({
  formData,
  onInputChange,
  projects,
  projectTranslations,
  worksites,
  worksiteTranslations,
  langId,
  disabled = false,
}: BasicInformationSectionProps) {
  const { t } = useTranslation('cash-advance');

  const projectName = (id: string) => {
    const rows = projectTranslations.filter((x) => x.projectId === id);
    const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
    return tr?.name ?? projects.find((p) => p.id === id)?.code ?? '—';
  };

  const worksiteName = (id: string) => {
    const rows = worksiteTranslations.filter((x) => x.worksiteId === id);
    const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
    return tr?.name ?? worksites.find((w) => w.id === id)?.code ?? '—';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('admin.funds.form.sectionTitle', { defaultValue: 'Fund Information' })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name — seed translation in the current UI language; more languages added on edit */}
          <div className="space-y-2">
            <Label>
              {t('admin.funds.form.name', { defaultValue: 'Name' })}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => onInputChange('name', e.target.value)}
              placeholder={t('admin.funds.form.namePlaceholder', {
                defaultValue: 'Enter name',
              })}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.funds.form.nameFaCreateHint', {
                defaultValue: 'Other languages can be added after saving, on the edit form.',
              })}
            </p>
          </div>

          {/* Code — English letters + digits */}
          <div className="space-y-2">
            <Label>
              {t('admin.funds.form.code', { defaultValue: 'Code' })}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.code}
              dir={formData.code ? 'ltr' : undefined}
              onChange={(e) => onInputChange('code', e.target.value)}
              placeholder={t('admin.funds.form.codePlaceholder', {
                defaultValue: 'Enter fund code',
              })}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.funds.form.codeHint', {
                defaultValue: 'English letters and digits only',
              })}
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>
              {t('admin.funds.form.amount', { defaultValue: 'Amount' })}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <AmountInput
              value={formData.amount}
              onChange={(raw) => onInputChange('amount', raw)}
              placeholder={t('admin.funds.form.amountPlaceholder', {
                defaultValue: 'Enter fund amount',
              })}
              disabled={disabled}
            />
          </div>

          {/* Project — resets worksite on change */}
          <div className="space-y-2">
            <Label>
              {t('admin.funds.form.project', { defaultValue: 'Project' })}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.projectId || undefined}
              onValueChange={(v) => {
                onInputChange('projectId', v);
                onInputChange('worksiteId', '');
              }}
              disabled={disabled}
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
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {projectName(p.id)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Worksite — gated on a selected project */}
          <div className="space-y-2">
            <Label>
              {t('admin.funds.form.worksite', { defaultValue: 'Worksite' })}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.worksiteId || undefined}
              onValueChange={(v) => onInputChange('worksiteId', v)}
              disabled={disabled || !formData.projectId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    formData.projectId
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
                  .filter((w) => w.projectId === formData.projectId && w.isActive)
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {worksiteName(w.id)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active */}
          <div className="space-y-2">
            <Label>{t('admin.funds.form.isActive', { defaultValue: 'Active' })}</Label>
            <Select
              value={formData.isActive ? 'true' : 'false'}
              onValueChange={(v) => onInputChange('isActive', v === 'true')}
              disabled={disabled}
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
  );
}
