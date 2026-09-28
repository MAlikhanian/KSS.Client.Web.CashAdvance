'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, Download } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { translateApiError } from '@/lib/format-utils';
import {
  listChargeRequests,
  listChargeRequestItems,
  ceoDecideItem,
  ceoDecideRequest,
  financialManagerDecide,
  recordPayment,
  uploadCashAdvanceDocument,
  listCashAdvanceDocuments,
  cashAdvanceDocumentFileUrl,
  listProducts,
  listProductTranslations,
  listStatuses,
  listStatusTranslations,
  listPaymentTypes,
  listFunds,
  listFundTranslations,
  listPersons,
  type ChargeRequestView,
  type ChargeRequestItemView,
  type DocumentView,
  type ProductView,
  type ProductTranslationView,
  type StatusView,
  type StatusTranslationView,
  type PaymentTypeView,
  type PaymentTypeTranslationView,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type PersonDirectoryRecord,
} from '@/lib/cash-advance/api/client';
import { formatDate, formatRial } from '@/lib/cash-advance/format';
import { StatusSelect, statusName, statusIsRejected } from './components/status-select';
import { usePermission } from '@/hooks/use-permission';

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

export function CashAdvanceDetailContent({ id }: { id: string }) {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const router = useRouter();
  const { hasPermission } = usePermission();
  const langId = language.code === 'en' ? 10 : 12;

  const [request, setRequest] = useState<ChargeRequestView | null>(null);
  const [items, setItems] = useState<ChargeRequestItemView[]>([]);
  const [products, setProducts] = useState<ProductView[]>([]);
  const [productTranslations, setProductTranslations] = useState<ProductTranslationView[]>([]);
  const [statuses, setStatuses] = useState<StatusView[]>([]);
  const [statusTranslations, setStatusTranslations] = useState<StatusTranslationView[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeView[]>([]);
  const [paymentTypeTranslations, setPaymentTypeTranslations] = useState<PaymentTypeTranslationView[]>([]);
  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [persons, setPersons] = useState<PersonDirectoryRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentView[]>([]);
  const [loading, setLoading] = useState(true);

  // CEO / FM approval local state
  const [ceoStatusId, setCeoStatusId] = useState(0);
  const [ceoDesc, setCeoDesc] = useState('');
  const [savingCeo, setSavingCeo] = useState(false);
  const [fmStatusId, setFmStatusId] = useState(0);
  const [fmDesc, setFmDesc] = useState('');
  const [savingFm, setSavingFm] = useState(false);

  // Payment upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [payDate, setPayDate] = useState('');
  const [payTypeId, setPayTypeId] = useState(0);

  const loadRequest = async () => {
    const all = await listChargeRequests();
    const found = all.find((r) => r.id === id) ?? null;
    setRequest(found);
    if (found) {
      setCeoStatusId(found.ceoStatusId);
      setCeoDesc(found.ceoStatusDescription ?? '');
      setFmStatusId(found.financialManagerStatusId);
      setFmDesc(found.financialManagerStatusDescription ?? '');
    }
    return found;
  };

  const loadItems = async () => {
    // listChargeRequestItems is now row-level scoped server-side: the caller's own items, or
    // every item with Request.ReadAll. This filter is NOT the access boundary any more — it
    // narrows the caller's items down to the request being viewed, which the endpoint does not
    // do. Removing it would show the caller their other requests' items on this page.
    const all = await listChargeRequestItems();
    setItems(all.filter((it) => it.cashAdvanceChargeRequestId === id));
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [, , prods, prodTr, sts, stsTr, fnds, fndTr, ppl, payt, docs] = await Promise.all([
        loadRequest(),
        loadItems(),
        listProducts(),
        listProductTranslations(),
        listStatuses(),
        listStatusTranslations(),
        listFunds(),
        listFundTranslations(),
        listPersons(),
        listPaymentTypes(),
        listCashAdvanceDocuments(),
      ]);
      setProducts(prods);
      setProductTranslations(prodTr);
      setStatuses(sts);
      setStatusTranslations(stsTr);
      setFunds(fnds);
      setFundTranslations(fndTr);
      setPersons(ppl);
      setPaymentTypes(payt.paymentTypes);
      setPaymentTypeTranslations(payt.translations);
      setDocuments(docs);
    } catch {
      showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Display helpers ──
  const productName = (productId: string) =>
    productTranslations.find((x) => x.productId === productId && x.languageId === langId)?.name ||
    productTranslations.find((x) => x.productId === productId)?.name ||
    products.find((p) => p.id === productId)?.code ||
    '—';

  const fundName = (fundId: string) =>
    fundTranslations.find((x) => x.cashAdvanceId === fundId && x.languageId === langId)?.name ||
    fundTranslations.find((x) => x.cashAdvanceId === fundId)?.name ||
    funds.find((f) => f.id === fundId)?.code ||
    '—';

  const personName = (personId: string) => {
    const p = persons.find((x) => x.id === personId);
    if (!p) return personId;
    const tr = p.translations.find((x) => x.languageId === langId) || p.translations[0];
    return tr ? `${tr.firstName} ${tr.lastName}`.trim() : p.nationalId;
  };

  const documentName = (docId: string) =>
    documents.find((d) => d.id.toLowerCase() === docId.toLowerCase())?.fileName ?? docId;

  // ── Permission gates + status ids ──
  const canCeo = hasPermission(['CashAdvance.Approval.Ceo']);
  const canFm = hasPermission(['CashAdvance.Approval.FinancialManager']);
  const canPay = hasPermission(['CashAdvance.Payment.Manage']);
  const approvedStatusId = statuses.find((s) => s.code === 'Approved')?.id ?? 2;
  const rejectedStatusId = statuses.find((s) => s.code === 'Rejected')?.id ?? 3;

  // Payable total: rejected items drop out (matches the backend request Amount).
  const itemsTotal = items
    .filter((it) => it.statusId !== rejectedStatusId)
    .reduce((sum, it) => sum + (it.lineTotal || 0), 0);


  // CEO per-item approve/reject (workflow endpoint, gated by Approval.Ceo)
  const decideItem = async (item: ChargeRequestItemView, statusId: number) => {
    let desc: string | null = null;
    if (statusId === rejectedStatusId) {
      const reason = window.prompt(
        t('ops.common.statusReason', { defaultValue: 'Reason' }),
        item.statusDescription ?? '',
      );
      if (reason === null) return;
      if (!reason.trim()) {
        showError(
          t('ops.requestDetail.itemValidation.reasonRequired', {
            defaultValue: 'A reason is required when rejected',
          }),
        );
        return;
      }
      desc = reason.trim();
    }
    try {
      await ceoDecideItem({ itemId: item.id, statusId, statusDescription: desc });
      showSuccess(t('ops.common.toasts.saved', { defaultValue: 'Saved successfully' }));
      // Reload items AND the request — the backend re-derives request.Amount
      // (rejected items drop out), so the header total must refresh too.
      await Promise.all([loadItems(), loadRequest()]);
    } catch (e) {
      showError(
        (e as Error)?.message || t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    }
  };

  // ── Approval handlers ──
  const saveCeo = async () => {
    if (!request) return;
    if (statusIsRejected(statuses, ceoStatusId) && !ceoDesc.trim()) {
      showError(
        t('ops.requestDetail.itemValidation.reasonRequired', {
          defaultValue: 'A reason is required when rejected',
        }),
      );
      return;
    }
    setSavingCeo(true);
    try {
      await ceoDecideRequest({
        requestId: request.id,
        statusId: ceoStatusId,
        statusDescription: statusIsRejected(statuses, ceoStatusId) ? ceoDesc.trim() : null,
      });
      await loadRequest();
      showSuccess(t('ops.common.toasts.saved', { defaultValue: 'Saved successfully' }));
    } catch (e) {
      showError(
        (e as Error)?.message || t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    } finally {
      setSavingCeo(false);
    }
  };

  const saveFm = async () => {
    if (!request) return;
    if (statusIsRejected(statuses, fmStatusId) && !fmDesc.trim()) {
      showError(
        t('ops.requestDetail.itemValidation.reasonRequired', {
          defaultValue: 'A reason is required when rejected',
        }),
      );
      return;
    }
    setSavingFm(true);
    try {
      await financialManagerDecide({
        requestId: request.id,
        statusId: fmStatusId,
        statusDescription: statusIsRejected(statuses, fmStatusId) ? fmDesc.trim() : null,
      });
      await loadRequest();
      showSuccess(t('ops.common.toasts.saved', { defaultValue: 'Saved successfully' }));
    } catch (e) {
      showError(
        (e as Error)?.message || t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    } finally {
      setSavingFm(false);
    }
  };

  const paymentTypeName = (ptId: number) =>
    paymentTypeTranslations.find((x) => x.paymentTypeId === ptId && x.languageId === langId)?.name ??
    paymentTypeTranslations.find((x) => x.paymentTypeId === ptId)?.name ??
    paymentTypes.find((p) => p.id === ptId)?.code ??
    String(ptId);

  // ── Payment upload ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request) return;
    if (!payDate) {
      showError(t('ops.requestDetail.payment.dateRequired', { defaultValue: 'Payment date is required' }));
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (!payTypeId) {
      showError(t('ops.requestDetail.payment.typeRequired', { defaultValue: 'Payment type is required' }));
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadCashAdvanceDocument(file);
      await recordPayment({
        requestId: request.id,
        documentId: uploaded.id,
        paymentDate: payDate,
        paymentTypeId: payTypeId,
      });
      await loadRequest();
      setDocuments(await listCashAdvanceDocuments());
      showSuccess(
        t('ops.requestDetail.toasts.paymentUploaded', {
          defaultValue: 'Payment receipt uploaded',
        }),
      );
    } catch (e) {
      // Surface backend business errors (e.g. FM-approval gate) as a clean toast.
      showError(translateApiError((e as Error)?.message ?? '', t));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
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

  if (!request) {
    return (
      <div className="space-y-5 lg:space-y-7.5">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('ops.requestDetail.notFound', { defaultValue: 'Request not found.' })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-amber-50/25! border-amber-100! dark:bg-amber-950/25! dark:border-amber-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <div className="flex items-center gap-3 flex-wrap">
                <ToolbarPageTitle
                  text={`${t('ops.requestDetail.title', { defaultValue: 'Recharge Request' })} — ${
                    request.requestNumber
                  }`}
                />
                <Badge variant="outline" appearance="light">
                  {request.status}
                </Badge>
              </div>
              <ToolbarDescription>
                {t('ops.requestDetail.description', {
                  defaultValue:
                    'Edit the request, manage its line items, and submit for approval.',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div
        className={
          'grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5 ' +
          '[&_div.rounded-xl.bg-card]:bg-amber-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-amber-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-amber-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-amber-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <div className="xl:col-span-3 grid gap-5 lg:gap-7.5">
          {/* Request information */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('ops.requestDetail.infoTitle', { defaultValue: 'Request Information' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('ops.requestDetail.requestNumber', { defaultValue: 'Request #' })}
                  </Label>
                  <div className="text-sm font-medium">{request.requestNumber}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('ops.requestDetail.fund', { defaultValue: 'Fund' })}
                  </Label>
                  <div className="text-sm font-medium">{fundName(request.cashAdvanceId)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('ops.requestDetail.requester', { defaultValue: 'Requester' })}
                  </Label>
                  <div className="text-sm font-medium">{personName(request.requesterPersonId)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('ops.requestDetail.amount', { defaultValue: 'Amount' })}
                  </Label>
                  <div className="text-sm font-medium">{formatRial(request.amount)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('ops.requestDetail.requestedAt', { defaultValue: 'Requested' })}
                  </Label>
                  <div className="text-sm font-medium">{formatDate(request.requestedAt)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('ops.requestDetail.approvedAt', { defaultValue: 'Approved' })}
                  </Label>
                  <div className="text-sm font-medium">{formatDate(request.approvedAt)}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t('ops.requestDetail.paidAt', { defaultValue: 'Paid' })}
                  </Label>
                  <div className="text-sm font-medium">{formatDate(request.paidAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {t('ops.requestDetail.itemsTitle', { defaultValue: 'Line Items' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('ops.requestDetail.itemColumns.product', { defaultValue: 'Product' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.requestDetail.itemColumns.description', {
                          defaultValue: 'Description',
                        })}
                      </TableHead>
                      <TableHead className="text-end">
                        {t('ops.requestDetail.itemColumns.quantity', { defaultValue: 'Qty' })}
                      </TableHead>
                      <TableHead className="text-end">
                        {t('ops.requestDetail.itemColumns.unitPrice', {
                          defaultValue: 'Unit Price',
                        })}
                      </TableHead>
                      <TableHead className="text-end">
                        {t('ops.requestDetail.itemColumns.lineTotal', { defaultValue: 'Total' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.requestDetail.itemColumns.status', { defaultValue: 'Status' })}
                      </TableHead>
                      <TableHead className="text-center w-24">
                        {t('ops.requestDetail.itemColumns.actions', { defaultValue: 'Actions' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{productName(it.productId)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {it.description || '—'}
                        </TableCell>
                        <TableCell className="text-end">{it.quantity}</TableCell>
                        <TableCell className="text-end">{formatRial(it.unitPrice)}</TableCell>
                        <TableCell className="text-end">{formatRial(it.lineTotal)}</TableCell>
                        <TableCell>
                          {it.statusId ? (
                            <div className="flex flex-col">
                              <Badge variant="outline" appearance="light" className="w-fit">
                                {statusName(statuses, statusTranslations, it.statusId, langId)}
                              </Badge>
                              {statusIsRejected(statuses, it.statusId) && it.statusDescription && (
                                <span className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                                  {it.statusDescription}
                                </span>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex gap-1">
                            {canCeo && (
                              <>
                                <Button
                                  variant="ghost"
                                  mode="icon"
                                  size="sm"
                                  title={t('ops.common.approve', { defaultValue: 'Approve' })}
                                  onClick={() => decideItem(it, approvedStatusId)}
                                >
                                  <RiCheckboxCircleFill className="size-4 text-emerald-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  mode="icon"
                                  size="sm"
                                  title={t('ops.common.reject', { defaultValue: 'Reject' })}
                                  onClick={() => decideItem(it, rejectedStatusId)}
                                >
                                  <RiErrorWarningFill className="size-4 text-rose-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('ops.requestDetail.itemsEmpty', { defaultValue: 'No line items yet.' })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {items.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="text-end font-semibold">
                          {t('ops.requestDetail.total', { defaultValue: 'Total' })}
                        </TableCell>
                        <TableCell className="text-end font-semibold">
                          {formatRial(itemsTotal)}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* CEO approval */}
          {canCeo && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t('ops.requestDetail.ceoStatus', { defaultValue: 'CEO Status' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>{t('ops.common.status', { defaultValue: 'Status' })}</Label>
                <StatusSelect
                  statuses={statuses}
                  translations={statusTranslations}
                  langId={langId}
                  value={ceoStatusId}
                  onChange={setCeoStatusId}
                />
              </div>
              {statusIsRejected(statuses, ceoStatusId) && (
                <div className="space-y-1">
                  <Label>{t('ops.common.statusReason', { defaultValue: 'Reason' })}</Label>
                  <Textarea
                    value={ceoDesc}
                    onChange={(e) => setCeoDesc(e.target.value)}
                    placeholder={t('ops.common.statusReasonPlaceholder', {
                      defaultValue: 'Explain the reason (required when rejected)…',
                    })}
                  />
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={saveCeo} disabled={savingCeo}>
                  {savingCeo
                    ? t('ops.common.processing', { defaultValue: 'Processing...' })
                    : t('ops.common.save', { defaultValue: 'Save' })}
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Financial manager approval */}
          {canFm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t('ops.requestDetail.fmStatus', { defaultValue: 'Finance Manager Status' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>{t('ops.common.status', { defaultValue: 'Status' })}</Label>
                <StatusSelect
                  statuses={statuses}
                  translations={statusTranslations}
                  langId={langId}
                  value={fmStatusId}
                  onChange={setFmStatusId}
                />
              </div>
              {statusIsRejected(statuses, fmStatusId) && (
                <div className="space-y-1">
                  <Label>{t('ops.common.statusReason', { defaultValue: 'Reason' })}</Label>
                  <Textarea
                    value={fmDesc}
                    onChange={(e) => setFmDesc(e.target.value)}
                    placeholder={t('ops.common.statusReasonPlaceholder', {
                      defaultValue: 'Explain the reason (required when rejected)…',
                    })}
                  />
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={saveFm} disabled={savingFm}>
                  {savingFm
                    ? t('ops.common.processing', { defaultValue: 'Processing...' })
                    : t('ops.common.save', { defaultValue: 'Save' })}
                </Button>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Payment receipt */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('ops.requestDetail.paymentDocument', { defaultValue: 'Payment Receipt' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.paymentDocumentId ? (
                <a
                  href={cashAdvanceDocumentFileUrl(request.paymentDocumentId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <Download className="size-4" />
                  <span>{documentName(request.paymentDocumentId)}</span>
                </a>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t('ops.common.upload.noFile', { defaultValue: 'No file uploaded yet.' })}
                </div>
              )}
              {(request.paymentDate || request.paymentTypeId) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {request.paymentDate && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('ops.requestDetail.payment.date', { defaultValue: 'Payment Date' })}:{' '}
                      </span>
                      <span style={{ unicodeBidi: 'plaintext' }}>{formatDate(request.paymentDate)}</span>
                    </div>
                  )}
                  {request.paymentTypeId && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('ops.requestDetail.payment.type', { defaultValue: 'Payment Type' })}:{' '}
                      </span>
                      <span>{paymentTypeName(request.paymentTypeId)}</span>
                    </div>
                  )}
                </div>
              )}
              {canPay && request.financialManagerStatusId !== approvedStatusId && (
                <div className="text-sm text-muted-foreground">
                  {t('ops.requestDetail.payment.fmRequired', {
                    defaultValue: 'Payment can be recorded after Financial Manager approval.',
                  })}
                </div>
              )}
              {canPay && request.financialManagerStatusId === approvedStatusId && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
                    <div className="space-y-1">
                      <Label>{t('ops.requestDetail.payment.date', { defaultValue: 'Payment Date' })}</Label>
                      <DatePickerComponent value={payDate} onChange={setPayDate} forcePersian />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('ops.requestDetail.payment.type', { defaultValue: 'Payment Type' })}</Label>
                      <Select
                        value={payTypeId ? String(payTypeId) : undefined}
                        onValueChange={(v) => setPayTypeId(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('ops.requestDetail.payment.typePlaceholder', {
                              defaultValue: 'Select payment type',
                            })}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTypes
                            .filter((p) => p.isActive)
                            .map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {paymentTypeName(p.id)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || !payDate || !payTypeId}
                  >
                    <Upload className="size-4" />
                    {uploading
                      ? t('ops.common.upload.uploading', { defaultValue: 'Uploading...' })
                      : t('ops.requestDetail.uploadPayment', {
                          defaultValue: 'Upload Payment Receipt',
                        })}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Back */}
          <Card>
            <CardContent className="py-5">
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => router.push('/requests')}>
                  {t('ops.requestDetail.back', { defaultValue: 'Back to requests' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('ops.common.status', { defaultValue: 'Status' })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('ops.requestDetail.fund', { defaultValue: 'Fund' })}
                </span>
                <span className="font-medium">{fundName(request.cashAdvanceId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('ops.requestDetail.ceoStatus', { defaultValue: 'CEO Status' })}
                </span>
                <span className="font-medium">
                  {statusName(statuses, statusTranslations, request.ceoStatusId, langId)}
                </span>
              </div>
              {request.ceoStatusDescription && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    {t('ops.common.statusReason', { defaultValue: 'Reason' })}
                  </span>
                  <span className="text-xs whitespace-pre-wrap">
                    {request.ceoStatusDescription}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('ops.requestDetail.fmStatus', { defaultValue: 'Finance Manager Status' })}
                </span>
                <span className="font-medium">
                  {statusName(
                    statuses,
                    statusTranslations,
                    request.financialManagerStatusId,
                    langId,
                  )}
                </span>
              </div>
              {request.financialManagerStatusDescription && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    {t('ops.common.statusReason', { defaultValue: 'Reason' })}
                  </span>
                  <span className="text-xs whitespace-pre-wrap">
                    {request.financialManagerStatusDescription}
                  </span>
                </div>
              )}
              <div className="mt-2 pt-3 border-t border-border flex justify-between">
                <span className="text-muted-foreground">
                  {t('ops.requestDetail.total', { defaultValue: 'Total' })}
                </span>
                <span className="font-medium">{formatRial(itemsTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
