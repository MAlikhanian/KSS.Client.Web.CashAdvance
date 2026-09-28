'use client';

import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
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
import {
  listProducts,
  createProduct,
  updateProduct,
  removeProductByKey,
  listProductTranslations,
  createProductTranslation,
  updateProductTranslation,
  removeProductNameByKey,
  type ProductView,
  type ProductTranslationView,
} from '@/lib/cash-advance/api/client';

// Persian = 12, English = 10 (project-wide language ids).
const FA = 12;
const EN = 10;

// Code must contain only English letters and digits.
const CODE_PATTERN = /^[A-Za-z0-9]+$/;

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

interface DraftProduct {
  id?: string;
  code: string;
  nameFa: string;
  nameEn: string;
  isActive: boolean;
}

const EMPTY_DRAFT: DraftProduct = { code: '', nameFa: '', nameEn: '', isActive: true };

export function CashAdvanceAdminProductsContent() {
  const { t } = useTranslation('cash-advance');
  const [products, setProducts] = useState<ProductView[]>([]);
  const [translations, setTranslations] = useState<ProductTranslationView[]>([]);
  const [draft, setDraft] = useState<DraftProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const nameFor = (productId: string, languageId: number) =>
    translations.find((tr) => tr.productId === productId && tr.languageId === languageId)?.name ?? '';

  const refresh = async () => {
    setLoading(true);
    try {
      const [prods, trans] = await Promise.all([listProducts(), listProductTranslations()]);
      setProducts(prods);
      setTranslations(trans);
    } catch {
      showError(t('admin.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openAdd = () => setDraft({ ...EMPTY_DRAFT });
  const openEdit = (product: ProductView) =>
    setDraft({
      id: product.id,
      code: product.code,
      nameFa: nameFor(product.id, FA),
      nameEn: nameFor(product.id, EN),
      isActive: product.isActive,
    });

  const saveTranslation = async (productId: string, languageId: number, name: string) => {
    const existing = translations.find(
      (tr) => tr.productId === productId && tr.languageId === languageId,
    );
    if (name) {
      if (existing) {
        await updateProductTranslation({ productId, languageId, name });
      } else {
        await createProductTranslation({ productId, languageId, name });
      }
    } else if (existing) {
      try {
        await removeProductNameByKey({ productId, languageId });
      } catch (e) {
        // Already gone: the save wants no name in this language, and that is the state.
        if ((e as Error)?.message !== 'RECORD_NOT_FOUND') throw e;
      }
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    const code = draft.code.trim();
    const nameFa = draft.nameFa.trim();
    const nameEn = draft.nameEn.trim();

    if (!code) {
      showError(t('admin.products.validation.codeRequired', { defaultValue: 'Code is required' }));
      return;
    }
    if (!CODE_PATTERN.test(code)) {
      showError(
        t('admin.products.validation.codeFormat', {
          defaultValue: 'Code may contain only English letters and digits',
        }),
      );
      return;
    }
    if (!nameFa && !nameEn) {
      showError(
        t('admin.products.validation.nameRequired', {
          defaultValue: 'At least one name is required',
        }),
      );
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(draft.id);
      let productId = draft.id;
      // Never send an id on create — the backend stamps a v7 GUID.
      if (productId) {
        await updateProduct({ id: productId, code, isActive: draft.isActive });
      } else {
        const created = await createProduct({ code, isActive: draft.isActive });
        productId = created.id;
      }
      await saveTranslation(productId, FA, nameFa);
      await saveTranslation(productId, EN, nameEn);
      showSuccess(
        isEdit
          ? t('admin.common.toasts.updated', { defaultValue: 'Updated successfully' })
          : t('admin.common.toasts.created', { defaultValue: 'Created successfully' }),
      );
      setDraft(null);
      await refresh();
    } catch {
      showError(t('admin.common.toasts.saveError', { defaultValue: 'Failed to save' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: ProductView) => {
    if (
      !window.confirm(
        t('admin.common.confirmDelete', {
          defaultValue: 'Are you sure you want to delete this item? This action cannot be undone.',
        }),
      )
    ) {
      return;
    }
    try {
      // One call: the server deletes the product's names in the same transaction.
      await removeProductByKey({ id: product.id });
      showSuccess(t('admin.common.toasts.deleted', { defaultValue: 'Deleted successfully' }));
      await refresh();
    } catch (e) {
      const message = (e as Error)?.message;
      if (message === 'PRODUCT_IN_USE') {
        showError(
          t('admin.products.errors.inUse', {
            defaultValue: "This item is in use and can't be deleted.",
          }),
        );
      } else if (message === 'RECORD_NOT_FOUND') {
        // Already deleted elsewhere: say so, then show the list as it is now.
        showError(t('RECORD_NOT_FOUND', { ns: 'api-errors', defaultValue: 'Record not found.' }));
        await refresh();
      } else {
        showError(t('admin.common.toasts.deleteError', { defaultValue: 'Failed to delete' }));
      }
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-amber-50/25! border-amber-100! dark:bg-amber-950/25! dark:border-amber-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('admin.products.title', { defaultValue: 'Products' })} />
              <ToolbarDescription>
                {t('admin.products.description', {
                  defaultValue: 'Manage the cash advance product catalog',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div
        className={
          'space-y-5 lg:space-y-7.5 ' +
          '[&_div.rounded-xl.bg-card]:bg-amber-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-amber-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-amber-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-amber-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                {t('admin.products.addButton', { defaultValue: 'Add Product' })}
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.products.columns.code', { defaultValue: 'Code' })}</TableHead>
                  <TableHead>
                    {t('admin.products.columns.nameFa', { defaultValue: 'Name (Persian)' })}
                  </TableHead>
                  <TableHead>
                    {t('admin.products.columns.nameEn', { defaultValue: 'Name (English)' })}
                  </TableHead>
                  <TableHead className="text-center">
                    {t('admin.products.columns.status', { defaultValue: 'Status' })}
                  </TableHead>
                  <TableHead className="text-center w-32">
                    {t('admin.products.columns.actions', { defaultValue: 'Actions' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell>{nameFor(p.id, FA) || '—'}</TableCell>
                    <TableCell>{nameFor(p.id, EN) || '—'}</TableCell>
                    <TableCell className="text-center">
                      {p.isActive ? (
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
                        <Button variant="ghost" mode="icon" size="sm" onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 className="size-4 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('admin.products.empty', { defaultValue: 'No products added yet' })}
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('admin.common.loading', { defaultValue: 'Loading...' })}
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
              {draft?.id
                ? t('admin.common.edit', { defaultValue: 'Edit' })
                : t('admin.products.addButton', { defaultValue: 'Add Product' })}
            </DialogTitle>
            <DialogDescription>
              {t('admin.products.description', {
                defaultValue: 'Manage the cash advance product catalog',
              })}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>{t('admin.products.form.code', { defaultValue: 'Code' })}</Label>
                <Input
                  value={draft.code}
                  dir={draft.code ? 'ltr' : undefined}
                  onChange={(e) =>
                    setDraft({ ...draft, code: e.target.value.replace(/[^A-Za-z0-9]/g, '') })
                  }
                  placeholder={t('admin.products.form.codePlaceholder', {
                    defaultValue: 'Enter product code',
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.products.form.codeHint', {
                    defaultValue: 'English letters and digits only',
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <Label>{t('admin.products.form.nameFa', { defaultValue: 'Name (Persian)' })}</Label>
                <Input
                  value={draft.nameFa}
                  onChange={(e) => setDraft({ ...draft, nameFa: e.target.value })}
                  placeholder={t('admin.products.form.nameFaPlaceholder', {
                    defaultValue: 'Enter Persian name',
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('admin.products.form.nameEn', { defaultValue: 'Name (English)' })}</Label>
                <Input
                  value={draft.nameEn}
                  dir={draft.nameEn ? 'ltr' : undefined}
                  onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
                  placeholder={t('admin.products.form.nameEnPlaceholder', {
                    defaultValue: 'Enter English name',
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('admin.products.form.isActive', { defaultValue: 'Active' })}</Label>
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
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? t('admin.common.processing', { defaultValue: 'Processing...' })
                : t('admin.common.save', { defaultValue: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
