'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Plus, Save, Trash2 } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { usePermission } from '@/hooks/use-permission';
import { translateApiError } from '@/lib/format-utils';
import { formatRial, formatDate } from '@/lib/cash-advance/format';
import {
  listMyFunds,
  listFundTranslations,
  listProducts,
  listProductTranslations,
  createChargeRequestWithItems,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type ProductView,
  type ProductTranslationView,
} from '@/lib/cash-advance/api/client';
import { ProductPicker, productDisplayName } from '@/app/[id]/components/product-picker';

const FA = 12;
const EN = 10;

/** A line item collected on the client before the request is saved. */
interface DraftItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

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

export function CreateChargeRequestContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const router = useRouter();
  const { data: session } = useSession();
  const { hasPermission } = usePermission();
  const canModify = hasPermission(['CashAdvance.Request.Modify']);

  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [products, setProducts] = useState<ProductView[]>([]);
  const [productTranslations, setProductTranslations] = useState<ProductTranslationView[]>([]);

  const [cashAdvanceId, setCashAdvanceId] = useState<string>('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [today, setToday] = useState('');

  // Item sub-form
  const [productId, setProductId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  useEffect(() => {
    // Rendered only on the client to avoid a hydration mismatch on the date.
    setToday(formatDate(new Date().toISOString()));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [f, ft, p, pt] = await Promise.all([
          // Scoped: only the funds this person is currently in charge of, or every fund for
          // holders of CashAdvance.Request.ReadAll. The fund administration screens keep
          // listFunds() — they are meant to show everything.
          listMyFunds(),
          listFundTranslations(),
          listProducts(),
          listProductTranslations(),
        ]);
        setFunds(f);
        setFundTranslations(ft);
        setProducts(p);
        setProductTranslations(pt);
      } catch {
        showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
      }
    })();
  }, [t]);

  const fundName = useCallback(
    (fundId: string) => {
      const rows = fundTranslations.filter((x) => x.cashAdvanceId === fundId);
      const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
      if (tr?.name) return tr.name;
      return funds.find((x) => x.id === fundId)?.code ?? '—';
    },
    [fundTranslations, funds, langId],
  );

  const selectedFund = useMemo(
    () => funds.find((f) => f.id === cashAdvanceId) ?? null,
    [funds, cashAdvanceId],
  );
  const ceiling = selectedFund?.amount ?? null;

  const lineTotalOf = (it: DraftItem) => (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
  const total = useMemo(() => items.reduce((s, it) => s + lineTotalOf(it), 0), [items]);
  const remaining = ceiling === null ? null : ceiling - total;
  const overCeiling = ceiling !== null && items.length > 0 && total >= ceiling;

  const draftLineTotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  const addItem = () => {
    if (!productId) {
      showError(t('ops.requestDetail.itemValidation.productRequired', { defaultValue: 'Product is required' }));
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      showError(t('ops.requestDetail.itemValidation.quantityRequired', { defaultValue: 'Quantity is required' }));
      return;
    }
    if (!unitPrice || Number(unitPrice) <= 0) {
      showError(t('ops.requestDetail.itemValidation.unitPriceRequired', { defaultValue: 'Unit price is required' }));
      return;
    }
    setItems((prev) => [
      ...prev,
      { productId, description: description.trim(), quantity: Number(quantity), unitPrice: Number(unitPrice) },
    ]);
    setProductId(null);
    setDescription('');
    setQuantity(0);
    setUnitPrice(0);
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const canSubmit =
    canModify && cashAdvanceId !== '' && items.length > 0 && !overCeiling && !saving;

  const handleSubmit = async () => {
    if (!cashAdvanceId) {
      showError(t('ops.requests.validation.fundRequired', { defaultValue: 'Fund is required' }));
      return;
    }
    if (items.length === 0) {
      showError(t('ops.requests.create.validation.itemsRequired', { defaultValue: 'Add at least one item' }));
      return;
    }
    if (overCeiling) {
      showError(t('ops.requests.create.validation.overCeiling', { defaultValue: 'The total must be smaller than the fund amount' }));
      return;
    }

    setSaving(true);
    try {
      const created = await createChargeRequestWithItems({
        cashAdvanceId,
        items: items.map((it) => ({
          productId: it.productId,
          description: it.description || null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      });
      showSuccess(t('ops.requests.toasts.created', { defaultValue: 'Request created' }));
      router.push(`/${created.id}`);
    } catch (e) {
      showError(translateApiError((e as Error)?.message ?? '', t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card — amber, black/white doubled-selector border, OUTSIDE the tint. */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card className="bg-amber-50! dark:bg-amber-950/25! shadow-lg shadow-black/5">
          <CardContent className="py-5">
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle
                  text={t('ops.requests.create.title', { defaultValue: 'New Recharge Request' })}
                />
                <ToolbarDescription>
                  {t('ops.requests.create.description', {
                    defaultValue:
                      'Select a fund and add the items. The requester, date, number and amount are set automatically.',
                  })}
                </ToolbarDescription>
              </ToolbarHeading>
            </Toolbar>
          </CardContent>
        </Card>
      </div>

      {/* Amber glass tint on every section Card — identical block to funds/create. */}
      <div
        className={
          '[&_div.rounded-xl.bg-card]:bg-amber-50! ' +
          '[&_div.rounded-xl.bg-card]:border-amber-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-amber-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-amber-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5 ' +
          '[&_tr:has(td):hover]:bg-amber-100! ' +
          'dark:[&_tr:has(td):hover]:bg-muted/50! ' +
          '[&_.text-muted-foreground]:text-card-foreground! ' +
          '[&_[data-slot="table-head"]]:text-muted-foreground! ' +
          '[&_.text-sm.text-muted-foreground.text-center]:text-muted-foreground! ' +
          '[&_[data-slot="card-description"]]:text-muted-foreground!'
        }
      >
        <div className="space-y-6">
          {!canModify && (
            <Alert variant="secondary">
              <AlertIcon>
                <RiErrorWarningFill />
              </AlertIcon>
              <AlertTitle>
                {t('ops.common.readOnly', { defaultValue: 'You do not have permission to modify this data.' })}
              </AlertTitle>
            </Alert>
          )}

          {/* Section 1 — Request Information (amber badge) */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    1
                  </span>
                  {t('ops.requests.create.infoTitle', { defaultValue: 'Request Information' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {t('ops.requests.form.fund', { defaultValue: 'Fund' })}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select value={cashAdvanceId || undefined} onValueChange={setCashAdvanceId} disabled={!canModify}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('ops.requests.form.fundPlaceholder', { defaultValue: 'Select a fund' })} />
                      </SelectTrigger>
                      <SelectContent>
                        {funds
                          .filter((f) => f.isActive || f.id === cashAdvanceId)
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {fundName(f.id)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {funds.length === 0 && (
                      <p className="text-xs text-destructive">
                        {t('ops.requests.form.noFundsInCharge', {
                          defaultValue:
                            'You are not responsible for any petty cash. Contact your administrator.',
                        })}
                      </p>
                    )}
                    {ceiling !== null && (
                      <p className="text-xs text-muted-foreground">
                        {t('ops.requests.create.fundCeiling', { defaultValue: 'Fund amount' })}: {formatRial(ceiling)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('ops.requests.form.requester', { defaultValue: 'Requester' })}</Label>
                    <Input value={session?.user?.name ?? '—'} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      {t('ops.requests.create.autoCurrentUser', { defaultValue: 'Current user (automatic)' })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('ops.requests.form.requestedAt', { defaultValue: 'Requested Date' })}</Label>
                    <Input value={today || '—'} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      {t('ops.requests.create.autoToday', { defaultValue: "Today's date (automatic)" })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('ops.requests.form.requestNumber', { defaultValue: 'Request #' })}</Label>
                    <Input value={t('ops.requests.create.autoNumber', { defaultValue: 'Automatic' })} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      {t('ops.requests.create.autoNumberHint', { defaultValue: 'Generated on save' })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 2 — Items (amber badge) */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    2
                  </span>
                  {t('ops.requests.create.itemsTitle', { defaultValue: 'Items' })}
                  <Badge variant="outline">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Add-item sub-form — standard field grid; description on its own row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('ops.requestDetail.itemForm.product', { defaultValue: 'Product' })}</Label>
                    <ProductPicker
                      products={products}
                      translations={productTranslations}
                      value={productId}
                      onChange={setProductId}
                      langId={langId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('ops.requestDetail.itemForm.quantity', { defaultValue: 'Quantity' })}</Label>
                    <Input
                      type="number"
                      min={0}
                      dir={quantity ? 'ltr' : undefined}
                      value={quantity || ''}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('ops.requestDetail.itemForm.unitPrice', { defaultValue: 'Unit Price' })}</Label>
                    <AmountInput value={String(unitPrice || '')} onChange={(raw) => setUnitPrice(raw === '' ? 0 : Number(raw))} />
                  </div>
                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label>{t('ops.requestDetail.itemForm.description', { defaultValue: 'Description' })}</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('ops.requestDetail.itemForm.descriptionPlaceholder', { defaultValue: 'Description of item or service' })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  {draftLineTotal > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {t('ops.requestDetail.itemForm.lineTotal', { defaultValue: 'Line Total' })}: {formatRial(draftLineTotal)}
                    </span>
                  )}
                  <Button type="button" variant="outline" onClick={addItem} disabled={!canModify}>
                    <Plus className="size-4" />
                    {t('ops.requests.create.addItem', { defaultValue: 'Add' })}
                  </Button>
                </div>

                {/* Added items */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('ops.requestDetail.itemColumns.product', { defaultValue: 'Product' })}</TableHead>
                      <TableHead>{t('ops.requestDetail.itemForm.description', { defaultValue: 'Description' })}</TableHead>
                      <TableHead className="text-end">{t('ops.requestDetail.itemColumns.quantity', { defaultValue: 'Qty' })}</TableHead>
                      <TableHead className="text-end">{t('ops.requestDetail.itemColumns.unitPrice', { defaultValue: 'Unit Price' })}</TableHead>
                      <TableHead className="text-end">{t('ops.requestDetail.itemColumns.lineTotal', { defaultValue: 'Line Total' })}</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it, i) => {
                      const p = products.find((x) => x.id === it.productId);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {p ? productDisplayName(p, productTranslations, langId) : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{it.description || '—'}</TableCell>
                          <TableCell className="text-end font-mono text-xs">{it.quantity}</TableCell>
                          <TableCell className="text-end font-mono text-xs">{formatRial(it.unitPrice)}</TableCell>
                          <TableCell className="text-end font-mono text-xs">{formatRial(lineTotalOf(it))}</TableCell>
                          <TableCell className="text-center">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          {t('ops.requests.create.noItems', { defaultValue: 'No items added yet' })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Total vs ceiling */}
                <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('ops.requests.create.total', { defaultValue: 'Total' })}
                    </span>
                    <span className="text-sm font-medium">{formatRial(total)}</span>
                  </div>
                  {ceiling !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t('ops.requests.create.remaining', { defaultValue: 'Remaining under fund amount' })}
                      </span>
                      <span className={`text-sm font-medium ${overCeiling ? 'text-destructive' : ''}`}>
                        {formatRial(remaining ?? 0)}
                      </span>
                    </div>
                  )}
                </div>

                {overCeiling && (
                  <Alert variant="destructive">
                    <AlertIcon>
                      <RiErrorWarningFill />
                    </AlertIcon>
                    <AlertTitle>
                      {t('ops.requests.create.validation.overCeiling', { defaultValue: 'The total must be smaller than the fund amount' })}
                    </AlertTitle>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Operations card — LAST, black/white doubled-selector border. */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
            <Card>
              <CardHeader>
                <CardTitle>{t('ops.requests.create.operations', { defaultValue: 'Operations' })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-start gap-2">
                  <RiInformationFill className="text-amber-600 dark:text-amber-400 size-5 shrink-0 mt-0.5" />
                  <span className="text-sm text-card-foreground">
                    {t('ops.requests.create.info', {
                      defaultValue: 'After saving, you will be taken to the request page to submit it for approval.',
                    })}
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSubmit} disabled={!canSubmit}>
                    <Save className="size-4" />
                    {saving
                      ? t('ops.common.processing', { defaultValue: 'Processing...' })
                      : t('ops.requests.create.submit', { defaultValue: 'Create Request' })}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
