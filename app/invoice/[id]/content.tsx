'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Link2 } from 'lucide-react';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarActions,
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
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { usePermission } from '@/hooks/use-permission';
import { formatDate, formatDateTime, formatRial } from '@/lib/cash-advance/format';
import {
  listInvoices,
  listFunds,
  listFundTranslations,
  listStatuses,
  listStatusTranslations,
  listInvoiceDocuments,
  listInvoiceItemLinks,
  listChargeRequests,
  listChargeRequestItems,
  listProducts,
  listProductTranslations,
  listCashAdvanceDocuments,
  cashAdvanceDocumentFileUrl,
  invoiceFinancialManagerDecide,
  invoiceCeoDecide,
  invoiceFinancialManagerRequestCorrection,
  invoiceCeoRequestCorrection,
  type InvoiceView,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type StatusView,
  type StatusTranslationView,
  type InvoiceDocumentView,
  type DocumentView,
  type InvoiceItemLinkView,
  type ChargeRequestView,
  type ChargeRequestItemView,
  type ProductView,
  type ProductTranslationView,
} from '@/lib/cash-advance/api/client';

// Persian = 12, English = 10 (project-wide language ids).
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

export function InvoiceReadonlyDetailContent({ id }: { id: string }) {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const { hasPermission } = usePermission();
  const langId = language.code === 'en' ? EN : FA;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceView | null>(null);

  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [statuses, setStatuses] = useState<StatusView[]>([]);
  const [statusTranslations, setStatusTranslations] = useState<StatusTranslationView[]>([]);
  const [documents, setDocuments] = useState<InvoiceDocumentView[]>([]);
  const [fileDocuments, setFileDocuments] = useState<DocumentView[]>([]);
  const [links, setLinks] = useState<InvoiceItemLinkView[]>([]);
  const [chargeRequests, setChargeRequests] = useState<ChargeRequestView[]>([]);
  const [chargeItems, setChargeItems] = useState<ChargeRequestItemView[]>([]);
  const [products, setProducts] = useState<ProductView[]>([]);
  const [productTranslations, setProductTranslations] = useState<ProductTranslationView[]>([]);

  // Staged decision drafts (synced from the loaded invoice via the effect below).
  const [fmDraft, setFmDraft] = useState<{ statusId: number; reason: string }>({
    statusId: 1,
    reason: '',
  });
  const [ceoDraft, setCeoDraft] = useState<{ statusId: number; reason: string }>({
    statusId: 1,
    reason: '',
  });
  const [fmCorrectionNote, setFmCorrectionNote] = useState('');
  const [ceoCorrectionNote, setCeoCorrectionNote] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [inv, fnd, fndTr, sts, stsTr, docs, lnks, reqs, items, prods, prodTr, fileDocs] =
        await Promise.all([
          listInvoices(),
          listFunds(),
          listFundTranslations(),
          listStatuses(),
          listStatusTranslations(),
          listInvoiceDocuments(),
          listInvoiceItemLinks(),
          listChargeRequests(),
          listChargeRequestItems(),
          listProducts(),
          listProductTranslations(),
          listCashAdvanceDocuments(),
        ]);
      const current = inv.find((x) => x.id === id) ?? null;
      setInvoice(current);
      setFunds(fnd);
      setFundTranslations(fndTr);
      setStatuses(sts);
      setStatusTranslations(stsTr);
      setDocuments(docs.filter((d) => d.invoiceId === id));
      setFileDocuments(fileDocs);
      setLinks(lnks.filter((l) => l.invoiceId === id));
      setChargeRequests(reqs);
      setChargeItems(items);
      setProducts(prods);
      setProductTranslations(prodTr);
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

  // Re-sync the decision drafts whenever the invoice reloads.
  useEffect(() => {
    if (invoice) {
      setFmDraft({
        statusId: invoice.financialManagerStatusId,
        reason: invoice.financialManagerStatusDescription ?? '',
      });
      setCeoDraft({
        statusId: invoice.ceoStatusId,
        reason: invoice.ceoStatusDescription ?? '',
      });
    }
  }, [invoice]);

  // ── display helpers ──
  const fundLabel = (fundId: string) =>
    fundTranslations.find((x) => x.cashAdvanceId === fundId && x.languageId === langId)?.name ??
    funds.find((f) => f.id === fundId)?.code ??
    '—';

  const documentName = (documentId: string) =>
    fileDocuments.find((d) => d.id.toLowerCase() === documentId.toLowerCase())?.fileName ?? documentId;

  const statusName = (statusId: number) =>
    statusTranslations.find((x) => x.statusId === statusId && x.languageId === langId)?.name ??
    statuses.find((s) => s.id === statusId)?.code ??
    String(statusId);

  const isRejectedStatus = (statusId: number | null) => {
    if (statusId === null) return false;
    const code = statuses.find((s) => s.id === statusId)?.code ?? '';
    return code.toLowerCase().includes('reject');
  };

  const productLabel = (productId: string) =>
    productTranslations.find((x) => x.productId === productId && x.languageId === langId)?.name ??
    products.find((p) => p.id === productId)?.code ??
    '—';

  const itemById = useMemo(() => {
    const m = new Map<string, ChargeRequestItemView>();
    for (const i of chargeItems) m.set(i.id, i);
    return m;
  }, [chargeItems]);

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

  if (!invoice) {
    return (
      <div className="space-y-5 lg:space-y-7.5">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('ops.invoiceDetail.notFound', { defaultValue: 'Invoice not found.' })}
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/invoice/view">
                  <ArrowLeft className="size-4" />
                  {t('ops.invoiceDetail.back', { defaultValue: 'Back to invoices' })}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── staged decision actions (FM first, then CEO gated on FM approval) ──
  const canFm = hasPermission(['CashAdvance.Approval.FinancialManager']);
  const canCeo = hasPermission(['CashAdvance.Approval.Ceo']);
  const activeStatuses = statuses.filter((s) => s.isActive);
  const ceoEnabled = invoice.financialManagerStatusId === 2; // CEO acts only after FM approves

  const saveFm = async () => {
    if (invoice.correctionRequested) return;
    if (isRejectedStatus(fmDraft.statusId) && !fmDraft.reason.trim())
      return showError(t('ops.invoiceDetail.reason', { defaultValue: 'Reason' }));
    await invoiceFinancialManagerDecide({
      invoiceId: invoice.id,
      statusId: fmDraft.statusId,
      statusDescription: isRejectedStatus(fmDraft.statusId) ? fmDraft.reason.trim() : null,
    });
    showSuccess(t('ops.invoiceDetail.toasts.fmSaved', { defaultValue: 'Finance decision saved' }));
    await refresh();
  };
  const saveCeo = async () => {
    if (invoice.correctionRequested) return;
    if (isRejectedStatus(ceoDraft.statusId) && !ceoDraft.reason.trim())
      return showError(t('ops.invoiceDetail.reason', { defaultValue: 'Reason' }));
    await invoiceCeoDecide({
      invoiceId: invoice.id,
      statusId: ceoDraft.statusId,
      statusDescription: isRejectedStatus(ceoDraft.statusId) ? ceoDraft.reason.trim() : null,
    });
    showSuccess(t('ops.invoiceDetail.toasts.ceoSaved', { defaultValue: 'CEO decision saved' }));
    await refresh();
  };

  const requestFmCorrection = async () => {
    if (!fmCorrectionNote.trim())
      return showError(
        t('ops.invoiceDetail.correctionNoteRequired', { defaultValue: 'A correction note is required' }),
      );
    try {
      await invoiceFinancialManagerRequestCorrection({ invoiceId: invoice.id, note: fmCorrectionNote.trim() });
      showSuccess(t('ops.invoiceDetail.toasts.correctionRequested', { defaultValue: 'Correction requested' }));
      setFmCorrectionNote('');
      await refresh();
    } catch (e) {
      showError((e as Error)?.message || t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }));
    }
  };
  const requestCeoCorrection = async () => {
    if (!ceoCorrectionNote.trim())
      return showError(
        t('ops.invoiceDetail.correctionNoteRequired', { defaultValue: 'A correction note is required' }),
      );
    try {
      await invoiceCeoRequestCorrection({ invoiceId: invoice.id, note: ceoCorrectionNote.trim() });
      showSuccess(t('ops.invoiceDetail.toasts.correctionRequested', { defaultValue: 'Correction requested' }));
      setCeoCorrectionNote('');
      await refresh();
    } catch (e) {
      showError((e as Error)?.message || t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }));
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card */}
      <Card className="bg-amber-50/25! border-amber-100! dark:bg-amber-950/25! dark:border-amber-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle
                text={`${t('ops.invoiceDetail.title', { defaultValue: 'Invoice' })}${
                  invoice.invoiceNumber ? ` — ${invoice.invoiceNumber}` : ''
                }`}
              />
              <ToolbarDescription>
                {t('ops.invoiceDetail.readonlyDescription', {
                  defaultValue: 'Review the invoice, its documents, and its staged Finance → CEO approval.',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
            <ToolbarActions>
              <Button asChild variant="outline" size="sm">
                <Link href="/invoice/view">
                  <ArrowLeft className="size-4" />
                  {t('ops.invoiceDetail.back', { defaultValue: 'Back to invoices' })}
                </Link>
              </Button>
            </ToolbarActions>
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
          {/* Main column */}
          <div className="col-span-3 grid gap-5 lg:gap-7.5">
            {/* ── Invoice header (read-only) ── */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('ops.invoiceDetail.infoTitle', { defaultValue: 'Invoice Information' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{t('ops.invoiceDetail.fund', { defaultValue: 'Fund' })}</Label>
                    <Input value={fundLabel(invoice.cashAdvanceId)} disabled readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('ops.invoiceDetail.invoiceNumber', { defaultValue: 'Invoice #' })}</Label>
                    <Input value={invoice.invoiceNumber ?? '—'} disabled readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('ops.invoiceDetail.invoiceAmount', { defaultValue: 'Amount' })}</Label>
                    <Input value={formatRial(invoice.invoiceAmount)} disabled readOnly />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('ops.invoiceDetail.invoiceDate', { defaultValue: 'Date' })}</Label>
                    <Input value={formatDate(invoice.invoiceDate)} disabled readOnly />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>
                      {t('ops.invoiceDetail.descriptionField', { defaultValue: 'Description' })}
                    </Label>
                    <Textarea rows={2} value={invoice.description ?? ''} disabled readOnly />
                  </div>
                </div>

                {/* Two-stage status summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                  <div className="space-y-1">
                    <Label>{t('ops.invoiceDetail.fmStatus', { defaultValue: 'Finance Status' })}</Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isRejectedStatus(invoice.financialManagerStatusId) ? 'destructive' : 'secondary'}
                        appearance="light"
                        className="text-xs"
                      >
                        {statusName(invoice.financialManagerStatusId)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(invoice.financialManagerApprovedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t('ops.invoiceDetail.ceoStatus', { defaultValue: 'CEO Status' })}</Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isRejectedStatus(invoice.ceoStatusId) ? 'destructive' : 'secondary'}
                        appearance="light"
                        className="text-xs"
                      >
                        {statusName(invoice.ceoStatusId)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(invoice.approvedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {invoice.correctionRequested && (
                  <div className="pt-2">
                    <Alert variant="warning" icon="warning" appearance="light">
                      <AlertIcon>
                        <RiErrorWarningFill />
                      </AlertIcon>
                      <AlertTitle>
                        {t('ops.invoiceDetail.correctionRequestedBanner', {
                          defaultValue: 'Correction requested — awaiting resubmission by the submitter.',
                        })}
                        {invoice.correctionNote ? ` — ${invoice.correctionNote}` : ''}
                      </AlertTitle>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Invoice documents — view/download only ── */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('ops.invoiceDetail.documentsTitle', { defaultValue: 'Invoice Documents' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('ops.invoiceDetail.documentColumns.file', { defaultValue: 'File' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.invoiceDetail.documentColumns.status', { defaultValue: 'Status' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.invoiceDetail.documentColumns.statusReason', { defaultValue: 'Reason' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.invoiceDetail.documentColumns.uploadedAt', { defaultValue: 'Uploaded' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="max-w-[220px] truncate">
                          <a
                            href={cashAdvanceDocumentFileUrl(doc.documentId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-sky-700 hover:underline dark:text-sky-400"
                          >
                            {documentName(doc.documentId)}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isRejectedStatus(doc.statusId) ? 'destructive' : 'secondary'}
                            appearance="light"
                            className="text-xs"
                          >
                            {statusName(doc.statusId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          {doc.statusDescription ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">{formatDateTime(doc.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {documents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {t('ops.invoiceDetail.documentsEmpty', {
                            defaultValue: 'No invoice documents uploaded yet.',
                          })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* ── Linked charge-request rows (read-only) ── */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('ops.invoiceDetail.linksTitle', { defaultValue: 'Linked Charge-Request Rows' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('ops.invoiceDetail.linkColumns.row', { defaultValue: 'Row' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.invoiceDetail.linkColumns.item', { defaultValue: 'Item' })}
                      </TableHead>
                      <TableHead className="text-end">
                        {t('ops.invoiceDetail.linkColumns.amount', { defaultValue: 'Amount' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => {
                      const item = itemById.get(link.cashAdvanceChargeRequestItemId);
                      const reqNumber = item
                        ? chargeRequests.find((r) => r.id === item.cashAdvanceChargeRequestId)?.requestNumber
                        : undefined;
                      return (
                        <TableRow key={link.cashAdvanceChargeRequestItemId}>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="size-3.5 text-muted-foreground" />
                              {reqNumber ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>{item ? productLabel(item.productId) : '—'}</TableCell>
                          <TableCell className="text-end">
                            {item ? formatRial(item.lineTotal) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {links.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          {t('ops.invoiceDetail.linksEmpty', {
                            defaultValue: 'No rows linked to this invoice yet.',
                          })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — staged decision cards */}
          <div className="col-span-1">
            <div className="grid gap-5 lg:gap-7.5">
              {/* ── Finance Manager decision ── */}
              {canFm && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t('ops.invoiceDetail.fmDecisionTitle', { defaultValue: 'Finance Decision' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Select
                        value={String(fmDraft.statusId)}
                        onValueChange={(v) => setFmDraft({ ...fmDraft, statusId: Number(v) })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t('ops.common.selectStatus', { defaultValue: 'Select status' })}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {activeStatuses.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {statusName(s.id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isRejectedStatus(fmDraft.statusId) && (
                        <Textarea
                          rows={2}
                          value={fmDraft.reason}
                          onChange={(e) => setFmDraft({ ...fmDraft, reason: e.target.value })}
                          placeholder={t('ops.invoiceDetail.reasonPlaceholder', {
                            defaultValue: 'Explain the rejection (required when rejected)…',
                          })}
                        />
                      )}
                    </div>
                    <Button className="w-full" onClick={saveFm} disabled={invoice.correctionRequested}>
                      {t('ops.invoiceDetail.finalizeFm', { defaultValue: 'Finalize Finance Decision' })}
                    </Button>
                    {invoice.financialManagerStatusId === 1 && !invoice.correctionRequested && (
                      <div className="space-y-2 pt-3 border-t">
                        <Label className="text-xs text-muted-foreground">
                          {t('ops.invoiceDetail.correctionNote', { defaultValue: 'Correction note' })}
                        </Label>
                        <Textarea
                          rows={2}
                          value={fmCorrectionNote}
                          onChange={(e) => setFmCorrectionNote(e.target.value)}
                          placeholder={t('ops.invoiceDetail.correctionNotePlaceholder', {
                            defaultValue: 'Explain what the submitter must fix…',
                          })}
                        />
                        <Button variant="outline" className="w-full" onClick={requestFmCorrection}>
                          {t('ops.invoiceDetail.requestCorrection', { defaultValue: 'Request Correction' })}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── CEO decision (gated on FM approval) ── */}
              {canCeo && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t('ops.invoiceDetail.ceoDecisionTitle', { defaultValue: 'CEO Decision' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!ceoEnabled && (
                      <Alert variant="warning" icon="warning" appearance="light">
                        <AlertIcon>
                          <RiErrorWarningFill />
                        </AlertIcon>
                        <AlertTitle>
                          {t('ops.invoiceDetail.ceoBlockedHint', {
                            defaultValue: 'The CEO can decide only after Finance approves this invoice.',
                          })}
                        </AlertTitle>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Select
                        value={String(ceoDraft.statusId)}
                        onValueChange={(v) => setCeoDraft({ ...ceoDraft, statusId: Number(v) })}
                        disabled={!ceoEnabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t('ops.common.selectStatus', { defaultValue: 'Select status' })}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {activeStatuses.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {statusName(s.id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isRejectedStatus(ceoDraft.statusId) && (
                        <Textarea
                          rows={2}
                          value={ceoDraft.reason}
                          onChange={(e) => setCeoDraft({ ...ceoDraft, reason: e.target.value })}
                          disabled={!ceoEnabled}
                          placeholder={t('ops.invoiceDetail.reasonPlaceholder', {
                            defaultValue: 'Explain the rejection (required when rejected)…',
                          })}
                        />
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={saveCeo}
                      disabled={!ceoEnabled || invoice.correctionRequested}
                    >
                      {t('ops.invoiceDetail.finalizeCeo', { defaultValue: 'Finalize CEO Decision' })}
                    </Button>
                    {ceoEnabled && !invoice.correctionRequested && (
                      <div className="space-y-2 pt-3 border-t">
                        <Label className="text-xs text-muted-foreground">
                          {t('ops.invoiceDetail.correctionNote', { defaultValue: 'Correction note' })}
                        </Label>
                        <Textarea
                          rows={2}
                          value={ceoCorrectionNote}
                          onChange={(e) => setCeoCorrectionNote(e.target.value)}
                          placeholder={t('ops.invoiceDetail.correctionNotePlaceholder', {
                            defaultValue: 'Explain what the submitter must fix…',
                          })}
                        />
                        <Button variant="outline" className="w-full" onClick={requestCeoCorrection}>
                          {t('ops.invoiceDetail.requestCorrection', { defaultValue: 'Request Correction' })}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
