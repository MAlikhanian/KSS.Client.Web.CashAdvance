'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Paperclip, Save, X } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerComponent } from '@/components/ui/date-picker';
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
import { formatRial } from '@/lib/cash-advance/format';
import {
  submitInvoice,
  updateInvoiceFull,
  uploadCashAdvanceDocument,
  cashAdvanceDocumentFileUrl,
  listMyFunds,
  listFundTranslations,
  listChargeRequests,
  listChargeRequestItems,
  listProducts,
  listProductTranslations,
  listInvoices,
  listInvoiceItemLinks,
  listInvoiceDocuments,
  listCashAdvanceDocuments,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type ChargeRequestView,
  type ChargeRequestItemView,
  type ProductView,
  type ProductTranslationView,
} from '@/lib/cash-advance/api/client';
import { FundPicker } from '@/components/common/fund-picker';
import { productDisplayName } from '@/app/[id]/components/product-picker';

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

export function SubmitInvoiceContent({ editId = null }: { editId?: string | null }) {
  const { t } = useTranslation('cash-advance');
  const isEdit = !!editId;
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const router = useRouter();
  const { data: session } = useSession();
  const { hasPermission } = usePermission();
  const canSubmit = hasPermission(['CashAdvance.Invoice.Submit']);

  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [chargeRequests, setChargeRequests] = useState<ChargeRequestView[]>([]);
  const [chargeItems, setChargeItems] = useState<ChargeRequestItemView[]>([]);
  const [products, setProducts] = useState<ProductView[]>([]);
  const [productTranslations, setProductTranslations] = useState<ProductTranslationView[]>([]);

  const [cashAdvanceId, setCashAdvanceId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingDocs, setExistingDocs] = useState<
    { invoiceDocumentId: string; documentId: string; fileName: string }[]
  >([]);
  const [loadingEdit, setLoadingEdit] = useState<boolean>(isEdit);
  const editApplied = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, ft, cr, ci, p, pt] = await Promise.all([
          // Scoped: the funds this person is in charge of, or all with Request.ReadAll.
          listMyFunds(),
          listFundTranslations(),
          listChargeRequests(),
          listChargeRequestItems(),
          listProducts(),
          listProductTranslations(),
        ]);
        setFunds(f);
        setFundTranslations(ft);
        setChargeRequests(cr);
        setChargeItems(ci);
        setProducts(p);
        setProductTranslations(pt);
      } catch {
        showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
      }
    })();
  }, [t]);

  // Only the caller's own items in the picked fund are selectable.
  const personId = session?.user?.personId ?? '';
  const myRequestIds = useMemo(() => new Set(
    chargeRequests
      .filter((r) => r.cashAdvanceId === cashAdvanceId && r.requesterPersonId === personId)
      .map((r) => r.id),
  ), [chargeRequests, cashAdvanceId, personId]);
  const selectableItems = useMemo(
    () => chargeItems.filter((i) => myRequestIds.has(i.cashAdvanceChargeRequestId)),
    [chargeItems, myRequestIds],
  );

  // Reset the item selection when the USER changes the fund — but not during edit prefill.
  useEffect(() => {
    if (editApplied.current) {
      editApplied.current = false;
      return;
    }
    setSelectedItemIds(new Set());
  }, [cashAdvanceId]);

  useEffect(() => {
    if (!editId || !personId) return;
    (async () => {
      try {
        const [invAll, links, invDocs, fileDocs] = await Promise.all([
          listInvoices(),
          listInvoiceItemLinks(),
          listInvoiceDocuments(),
          listCashAdvanceDocuments(),
        ]);
        const inv = invAll.find((x) => x.id === editId) ?? null;
        const owner = inv?.createdBy === personId;
        const editable = inv?.financialManagerStatusId === 1; // editable until first FM approval
        if (!inv || !owner || !editable) {
          showError(
            t('ops.invoiceSubmit.notEditable', { defaultValue: 'This invoice can no longer be edited.' }),
          );
          router.replace(`/invoice/${editId}`);
          return;
        }
        editApplied.current = true; // keep the reset effect from clearing the selection below
        setCashAdvanceId(inv.cashAdvanceId);
        setInvoiceNumber(inv.invoiceNumber ?? '');
        setInvoiceAmount(inv.invoiceAmount);
        setInvoiceDate(inv.invoiceDate ?? '');
        setDescription(inv.description ?? '');
        setSelectedItemIds(
          new Set(links.filter((l) => l.invoiceId === editId).map((l) => l.cashAdvanceChargeRequestItemId)),
        );
        setExistingDocs(
          invDocs
            .filter((d) => d.invoiceId === editId)
            .map((d) => ({
              invoiceDocumentId: d.id,
              documentId: d.documentId,
              fileName:
                fileDocs.find((f) => f.id.toLowerCase() === d.documentId.toLowerCase())?.fileName ??
                d.documentId,
            })),
        );
      } catch {
        showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
      } finally {
        setLoadingEdit(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, personId]);

  const requestNumberOf = (item: ChargeRequestItemView) =>
    chargeRequests.find((r) => r.id === item.cashAdvanceChargeRequestId)?.requestNumber ?? '—';

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files ? Array.from(e.target.files) : [];
    if (chosen.length > 0) setFiles((prev) => [...prev, ...chosen]);
    e.target.value = '';
  };
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const removeExistingDoc = (documentId: string) =>
    setExistingDocs((prev) => prev.filter((d) => d.documentId !== documentId));

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    if (!cashAdvanceId) return showError(t('ops.invoiceSubmit.validation.fundRequired', { defaultValue: 'Fund is required' }));
    if (selectedItemIds.size === 0) return showError(t('ops.invoiceSubmit.validation.itemsRequired', { defaultValue: 'Select at least one item' }));
    if (!invoiceAmount || invoiceAmount <= 0) return showError(t('ops.invoiceSubmit.validation.amountRequired', { defaultValue: 'Invoice amount is required' }));
    // Fast feedback only — NOT the enforcement. The control BELONGS on the DTO ([Required])
    // and the domain error on the service guard; this check exists so the user is told before
    // a round trip rather than after one. Three layers, three different jobs.
    if (!invoiceNumber.trim()) return showError(t('ops.invoiceSubmit.validation.invoiceNumberRequired', { defaultValue: 'Invoice number is required' }));
    if (!invoiceDate) return showError(t('ops.invoiceSubmit.validation.invoiceDateRequired', { defaultValue: 'Invoice date is required' }));
    const totalDocs = (isEdit ? existingDocs.length : 0) + files.length;
    if (totalDocs === 0) return showError(t('ops.invoiceSubmit.validation.documentsRequired', { defaultValue: 'Attach at least one invoice document' }));
    setSaving(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadCashAdvanceDocument(f)));
      const newDocumentIds = uploaded.map((d) => d.id);
      if (isEdit && editId) {
        await updateInvoiceFull({
          invoiceId: editId,
          cashAdvanceId,
          // Both are guaranteed non-empty by the guards above, so the previous `|| null` and
          // ternary could only ever send null after the guard was removed — dead today and
          // misleading tomorrow. The UPDATE path coerced and the CREATE path did not; they
          // now agree. Keep them in step if either changes.
          invoiceNumber: invoiceNumber.trim(),
          invoiceAmount,
          invoiceDate: new Date(invoiceDate).toISOString(),
          description: description.trim() || null,
          documentIds: [...existingDocs.map((d) => d.documentId), ...newDocumentIds],
          chargeRequestItemIds: Array.from(selectedItemIds),
        });
        showSuccess(t('ops.invoiceSubmit.toasts.corrected', { defaultValue: 'Correction submitted' }));
        router.push(`/invoice/${editId}`);
      } else {
        const created = await submitInvoice({
          cashAdvanceId,
          invoiceNumber: invoiceNumber.trim(),
          invoiceAmount,
          invoiceDate: new Date(invoiceDate).toISOString(),
          description: description.trim() || null,
          documentIds: newDocumentIds,
          chargeRequestItemIds: Array.from(selectedItemIds),
        });
        showSuccess(t('ops.invoiceSubmit.toasts.submitted', { defaultValue: 'Invoice submitted' }));
        router.push(`/invoice/${created.id}`);
      }
    } catch (e) {
      showError((e as Error)?.message || t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }));
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingEdit) {
    return (
      <div className="space-y-5 lg:space-y-7.5">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('ops.common.loading', { defaultValue: 'Loading...' })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card — amber, black/white doubled-selector border, OUTSIDE the tint. */}
      <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
        <Card className="bg-amber-50! dark:bg-amber-950/25! shadow-lg shadow-black/5">
          <CardContent className="py-5">
            <Toolbar>
              <ToolbarHeading>
                <ToolbarPageTitle
                  text={
                    isEdit
                      ? t('correctInvoice', { defaultValue: 'Submit Correction' })
                      : t('ops.invoiceSubmit.title', { defaultValue: 'Submit Invoice' })
                  }
                />
                <ToolbarDescription>
                  {isEdit
                    ? t('correctInvoiceDesc', {
                        defaultValue:
                          'Only the invoice amount and file can be corrected. Other fields are locked.',
                      })
                    : t('ops.invoiceSubmit.description', {
                        defaultValue:
                          'Select a fund and your own items, attach the invoice documents, then submit for approval.',
                      })}
                </ToolbarDescription>
              </ToolbarHeading>
            </Toolbar>
          </CardContent>
        </Card>
      </div>

      {/* Amber glass tint on every section Card — identical block to requests/create. */}
      <div
        className={
          '[&_div.rounded-xl.bg-card]:bg-amber-50! ' +
          '[&_div.rounded-xl.bg-card]:border-amber-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-amber-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-amber-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5 ' +
          '[&_.text-muted-foreground]:text-card-foreground! ' +
          '[&_[data-slot="card-description"]]:text-muted-foreground!'
        }
      >
        <div className="space-y-6">
          {!canSubmit && (
            <Alert variant="secondary">
              <AlertIcon>
                <RiErrorWarningFill />
              </AlertIcon>
              <AlertTitle>
                {t('ops.common.readOnly', { defaultValue: 'You do not have permission to modify this data.' })}
              </AlertTitle>
            </Alert>
          )}

          {/* Section 1 — Invoice Information (amber badge) */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    1
                  </span>
                  {t('ops.invoiceSubmit.infoTitle', { defaultValue: 'Invoice Information' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {t('ops.invoiceSubmit.fundLabel', { defaultValue: 'Fund' })}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <FundPicker
                      funds={funds}
                      translations={fundTranslations}
                      value={cashAdvanceId || null}
                      onChange={(id) => setCashAdvanceId(id ?? '')}
                      langId={langId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t('ops.invoiceSubmit.invoiceNumber', { defaultValue: 'Invoice #' })}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      disabled={!canSubmit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t('ops.invoiceSubmit.invoiceAmount', { defaultValue: 'Invoice Amount' })}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <AmountInput
                      value={String(invoiceAmount || '')}
                      onChange={(raw) => setInvoiceAmount(raw === '' ? 0 : Number(raw))}
                      disabled={!canSubmit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t('ops.invoiceSubmit.invoiceDate', { defaultValue: 'Invoice Date' })}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <DatePickerComponent
                      value={invoiceDate}
                      onChange={setInvoiceDate}
                      forcePersian
                      disabled={!canSubmit}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label>{t('ops.invoiceSubmit.descriptionField', { defaultValue: 'Description' })}</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={!canSubmit}
                      placeholder={t('ops.invoiceSubmit.descriptionPlaceholder', { defaultValue: 'Optional note about this invoice' })}
                    />
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
                  {t('ops.invoiceSubmit.itemsTitle', { defaultValue: 'Items' })}
                  <Badge variant="outline">{selectedItemIds.size}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectableItems.length === 0 && (
                  <p className="text-center py-6 text-sm text-muted-foreground">
                    {t('ops.invoiceSubmit.noItems', { defaultValue: 'No items available for the selected fund' })}
                  </p>
                )}
                {selectableItems.map((item) => {
                  const product = products.find((p) => p.id === item.productId) ?? null;
                  const name = product ? productDisplayName(product, productTranslations, langId) : '—';
                  const checked = selectedItemIds.has(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleItem(item.id)}
                        disabled={!canSubmit}
                      />
                      <span className="flex-1 font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{requestNumberOf(item)}</span>
                      <span className="text-sm font-mono">{formatRial(item.lineTotal)}</span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Section 3 — Invoice Documents (amber badge) */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-amber-500! dark:[&_div.rounded-xl.bg-card.bg-card]:border-amber-500!">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    3
                  </span>
                  {t('ops.invoiceSubmit.documentsTitle', { defaultValue: 'Invoice Documents' })}
                  <Badge variant="outline">{files.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onFilesChosen}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canSubmit}
                >
                  <Paperclip className="size-4" />
                  {t('ops.invoiceSubmit.addFiles', { defaultValue: 'Add Invoice Document' })}
                </Button>

                {isEdit && existingDocs.length > 0 && (
                  <>
                    <Label className="text-xs text-muted-foreground">
                      {t('ops.invoiceSubmit.currentDocuments', { defaultValue: 'Current Documents' })}
                    </Label>
                    {existingDocs.map((d) => (
                      <div
                        key={d.invoiceDocumentId}
                        className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-2"
                      >
                        <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                        <a
                          href={cashAdvanceDocumentFileUrl(d.documentId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 truncate text-sm text-sky-700 hover:underline dark:text-sky-400"
                        >
                          {d.fileName}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeExistingDoc(d.documentId)}
                          disabled={!canSubmit}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </>
                )}

                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-4 py-2"
                  >
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{f.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(i)}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Operations card — LAST, black/white doubled-selector border. */}
          <div className="[&_div.rounded-xl.bg-card.bg-card]:border-black! dark:[&_div.rounded-xl.bg-card.bg-card]:border-white!">
            <Card>
              <CardHeader>
                <CardTitle>{t('ops.invoiceSubmit.operations', { defaultValue: 'Operations' })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-start gap-2">
                  <RiInformationFill className="text-amber-600 dark:text-amber-400 size-5 shrink-0 mt-0.5" />
                  <span className="text-sm text-card-foreground">
                    {isEdit
                      ? t('correctInvoiceDesc', {
                          defaultValue:
                            'Only the invoice amount and file can be corrected. Other fields are locked.',
                        })
                      : t('ops.invoiceSubmit.info', {
                          defaultValue: 'The invoice is submitted once and cannot be edited afterwards.',
                        })}
                  </span>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                    <Save className="size-4" />
                    {saving
                      ? t('ops.common.processing', { defaultValue: 'Processing...' })
                      : isEdit
                        ? t('correctInvoice', { defaultValue: 'Submit Correction' })
                        : t('ops.invoiceSubmit.submit', { defaultValue: 'Submit Invoice' })}
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
