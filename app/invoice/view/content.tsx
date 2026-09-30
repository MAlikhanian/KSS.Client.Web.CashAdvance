'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, Pencil } from 'lucide-react';
import { RiErrorWarningFill } from '@remixicon/react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  listInvoices,
  listMyFunds,
  listFundTranslations,
  invoiceDecideBatch,
  type InvoiceView,
  type InvoiceBatchDecisionResult,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
} from '@/lib/cash-advance/api/client';
import { formatDate, formatRial } from '@/lib/cash-advance/format';
import { withQuery } from '@/lib/cash-advance/safe-back';
import { FundPicker, fundDisplayName } from '@/components/common/fund-picker';
import { Sidebar } from './components/sidebar';

const FA = 12;
const EN = 10;

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

// Two-stage seed status: 1=Pending, 2=Approved, 3=Rejected.
const stageOf = (i: InvoiceView) => {
  if (i.ceoStatusId === 2)
    return {
      key: 'approved',
      def: 'Approved',
      badge:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
    };
  if (i.financialManagerStatusId === 3 || i.ceoStatusId === 3)
    return {
      key: 'rejected',
      def: 'Rejected',
      badge:
        'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
    };
  if (i.correctionRequested)
    return {
      key: 'correctionRequested',
      def: 'Correction Requested',
      badge:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
    };
  if (i.financialManagerStatusId === 2)
    return {
      key: 'awaitingCeo',
      def: 'Awaiting CEO',
      badge:
        'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900',
    };
  return {
    key: 'awaitingFm',
    def: 'Awaiting Finance',
    badge:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  };
};

const STATUS_FILTERS = ['ALL', 'awaitingFm', 'awaitingCeo', 'approved', 'rejected', 'correctionRequested'];

// Free-text search is kept per browser tab, never in the URL: it can hold personal text, and URLs
// end up in logs, history and shared links.
const SEARCH_STORAGE_KEY = 'cash-advance:invoice-list:search';
const readStoredSearch = (): string => {
  try {
    return window.sessionStorage.getItem(SEARCH_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};
const writeStoredSearch = (value: string) => {
  try {
    if (value) window.sessionStorage.setItem(SEARCH_STORAGE_KEY, value);
    else window.sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  } catch {
    /* storage unavailable: the search simply is not remembered */
  }
};

// Bulk decisions: a row is selectable only when the caller can decide it at the chosen stage.
type DecideStage = 'fm' | 'ceo';
const BATCH_MAX = 100;
const eligibleAt = (i: InvoiceView, stage: DecideStage) => {
  if (i.correctionRequested) return false;
  return stage === 'fm'
    ? i.financialManagerStatusId === 1
    : i.financialManagerStatusId === 2 && i.ceoStatusId === 1;
};

export function InvoiceViewContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const { hasPermission } = usePermission();
  const canRead = hasPermission(['CashAdvance.Invoice.Read']);

  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);

  // Fund and status live in the URL (?fund=, ?status=), so returning to the list, or browser Back,
  // restores them. Search is restored from session storage (see SEARCH_STORAGE_KEY).
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [fundFilter, setFundFilterState] = useState<string | null>(() => searchParams.get('fund') || null);
  const [statusFilter, setStatusFilterState] = useState<string>(() => {
    const s = searchParams.get('status');
    return s && STATUS_FILTERS.includes(s) ? s : 'ALL';
  });
  const [search, setSearch] = useState('');
  const searchRestored = useRef(false);

  const writeUrl = useCallback(
    (fund: string | null, status: string) => {
      router.replace(withQuery(pathname, { fund, status: status === 'ALL' ? null : status }), {
        scroll: false,
      });
    },
    [router, pathname],
  );
  const setFundFilter = (value: string | null) => {
    setFundFilterState(value);
    writeUrl(value, statusFilter);
  };
  const setStatusFilter = (value: string) => {
    setStatusFilterState(value);
    writeUrl(fundFilter, value);
  };
  const listHref = withQuery('/invoice/view', {
    fund: fundFilter,
    status: statusFilter === 'ALL' ? null : statusFilter,
  });

  useEffect(() => {
    setSearch(readStoredSearch());
    searchRestored.current = true;
  }, []);
  useEffect(() => {
    if (!searchRestored.current) return;
    const timer = window.setTimeout(() => writeStoredSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAll = useCallback(async () => {
    try {
      const [inv, f, ft] = await Promise.all([
        listInvoices(),
        // Scoped: the funds this person is in charge of, or all with Request.ReadAll.
        listMyFunds(),
        listFundTranslations(),
      ]);
      setInvoices(inv);
      setFunds(f);
      setFundTranslations(ft);
    } catch {
      showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Scope is the server's. /Api/CashAdvanceScopedRead/ListInvoices returns every invoice to a
  // caller holding CashAdvance.Invoice.ReadAll and only their own to everyone else, so this list
  // is already correct for whoever is asking. Do NOT reintroduce a client-side owner filter
  // here: it would be cosmetic, and it would hide rows from the roles ReadAll exists to serve.
  const mine = invoices;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...mine]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((i) => (fundFilter ? i.cashAdvanceId === fundFilter : true))
      .filter((i) => (statusFilter === 'ALL' ? true : stageOf(i).key === statusFilter))
      .filter((i) => {
        if (!term) return true;
        return (
          (i.invoiceNumber ?? '').toLowerCase().includes(term) ||
          (i.description ?? '').toLowerCase().includes(term)
        );
      });
  }, [mine, fundFilter, statusFilter, search]);

  const totalCount = mine.length;
  const pendingCount = useMemo(
    () =>
      mine.filter(
        (i) =>
          i.financialManagerStatusId === 1 ||
          (i.financialManagerStatusId === 2 && i.ceoStatusId === 1),
      ).length,
    [mine],
  );
  const approvedCount = useMemo(() => mine.filter((i) => i.ceoStatusId === 2).length, [mine]);

  // ── Bulk approve / reject ──
  // A caller holding both approval permissions picks the stage explicitly; changing it clears the
  // selection, so a row can only ever be sent to the stage it is eligible for.
  const canFm = hasPermission(['CashAdvance.Approval.FinancialManager']);
  const canCeo = hasPermission(['CashAdvance.Approval.Ceo']);
  const [chosenStage, setChosenStage] = useState<DecideStage>('fm');
  const decideStage: DecideStage | null =
    canFm && canCeo ? chosenStage : canFm ? 'fm' : canCeo ? 'ceo' : null;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkMode, setBulkMode] = useState<'approve' | 'reject' | null>(null);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<InvoiceBatchDecisionResult[] | null>(null);
  // A whole-call error (the request was refused as a whole): its code and how many were not sent.
  const [bulkCallError, setBulkCallError] = useState<{ code: string; count: number } | null>(null);

  const eligibleVisible = useMemo(
    () => (decideStage ? filtered.filter((i) => eligibleAt(i, decideStage)) : []),
    [filtered, decideStage],
  );
  // Only rows that are visible and eligible now are ever sent.
  const selectedRows = useMemo(
    () => eligibleVisible.filter((i) => selected.has(i.id)),
    [eligibleVisible, selected],
  );
  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, i) => sum + (i.invoiceAmount ?? 0), 0),
    [selectedRows],
  );
  const allVisibleSelected =
    eligibleVisible.length > 0 && selectedRows.length === eligibleVisible.length;

  const changeStage = (stage: DecideStage) => {
    setChosenStage(stage);
    setSelected(new Set());
  };
  const toggleRow = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAllVisible = (on: boolean) =>
    setSelected(on ? new Set(eligibleVisible.map((i) => i.id)) : new Set());

  const stageLabel = (stage: DecideStage) =>
    stage === 'fm'
      ? t('ops.invoiceView.bulk.stageFm', { defaultValue: 'Finance' })
      : t('ops.invoiceView.bulk.stageCeo', { defaultValue: 'CEO' });

  // Codes the batch endpoint returns, per invoice and for the whole call. Unknown codes fall back
  // to a generic message that shows the code.
  const bulkErrorText = (code?: string | null) => {
    switch (code) {
      case 'REJECTION_REASON_REQUIRED':
        return t('ops.invoiceView.bulk.reasonRequired', { defaultValue: 'A reason is required to reject' });
      case 'BATCH_TOO_LARGE':
        return t('ops.invoiceView.bulk.errorTooLarge', {
          max: BATCH_MAX,
          defaultValue: 'At most {{max}} invoices can be decided at once',
        });
      case 'FORBIDDEN':
        return t('ops.invoiceView.bulk.errorForbidden', {
          defaultValue: 'You do not have permission for this stage',
        });
      case 'RECORD_NOT_FOUND':
        return t('ops.invoiceView.bulk.errNotFound', { defaultValue: 'Invoice not found' });
      case 'CORRECTION_PENDING_RESUBMIT':
        return t('ops.invoiceView.bulk.errCorrectionPending', {
          defaultValue: 'A correction is pending on this invoice',
        });
      case 'FINANCIAL_MANAGER_APPROVAL_REQUIRED':
        return t('ops.invoiceView.bulk.errFmApprovalRequired', {
          defaultValue: 'Finance approval is required first',
        });
      case 'INVOICE_NOT_LINKED_TO_REQUEST':
        return t('ops.invoiceView.bulk.errNotLinked', {
          defaultValue: 'This invoice is not linked to a recharge request, so it cannot be approved',
        });
      case 'INVALID_STATUS':
        return t('ops.invoiceView.bulk.errInvalidStatus', {
          defaultValue: 'The status is not valid for this decision',
        });
      case 'CONCURRENCY_ERROR':
        return t('ops.invoiceView.bulk.errConcurrency', {
          defaultValue: 'The invoice was changed at the same time; refresh and try again',
        });
      case 'UNEXPECTED_ERROR':
        return t('ops.invoiceView.bulk.errUnexpected', { defaultValue: 'An unexpected error occurred' });
      case 'INVOICE_IDS_REQUIRED':
        return t('ops.invoiceView.bulk.errIdsRequired', { defaultValue: 'No invoices were selected' });
      case 'INVALID_STAGE':
        return t('ops.invoiceView.bulk.errInvalidStage', { defaultValue: 'The decision stage is not valid' });
      default:
        return t('ops.invoiceView.bulk.errorGeneric', {
          code: code || '—',
          defaultValue: 'Could not be processed ({{code}})',
        });
    }
  };

  const runBulk = async () => {
    if (!decideStage || !bulkMode || selectedRows.length === 0) return;
    const reason = bulkReason.trim();
    if (bulkMode === 'reject' && !reason) return;
    setBulkBusy(true);
    const ids = selectedRows.map((i) => i.id);
    const results: InvoiceBatchDecisionResult[] = [];
    let callError: { code: string; count: number } | null = null;
    // Sent in chunks of at most BATCH_MAX. A whole-call error stops the run; the invoices not yet
    // sent are reported once, as not processed, with that error.
    for (let at = 0; at < ids.length; at += BATCH_MAX) {
      const chunk = ids.slice(at, at + BATCH_MAX);
      try {
        const res = await invoiceDecideBatch({
          stage: decideStage,
          invoiceIds: chunk,
          statusId: bulkMode === 'approve' ? 2 : 3,
          ...(bulkMode === 'reject' ? { statusDescription: reason } : {}),
        });
        const byId = new Map((res ?? []).map((r) => [r.invoiceId, r]));
        for (const id of chunk) results.push(byId.get(id) ?? { invoiceId: id, ok: false });
      } catch (e) {
        const msg = (e as Error)?.message ?? '';
        callError = { code: /\b403\b/.test(msg) ? 'FORBIDDEN' : msg, count: ids.length - at };
        break;
      }
    }
    setBulkBusy(false);
    setBulkMode(null);
    setBulkReason('');
    setBulkCallError(callError);
    setBulkResult(results);
    setSelected(new Set());
    await loadAll();
  };
  const invoiceNumberOf = (id: string) =>
    invoices.find((i) => i.id === id)?.invoiceNumber ?? id;

  if (!canRead) {
    return (
      <div className="space-y-5 lg:space-y-7.5">
        <Alert variant="mono" icon="destructive">
          <AlertIcon>
            <RiErrorWarningFill />
          </AlertIcon>
          <AlertTitle>
            {t('ops.common.readOnly', {
              defaultValue: 'You do not have permission to view this data.',
            })}
          </AlertTitle>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card */}
      <Card className="bg-amber-50/25! border-amber-100! dark:bg-amber-950/25! dark:border-amber-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle
                text={t('ops.invoiceView.title', { defaultValue: 'Invoices' })}
              />
              <ToolbarDescription>
                {t('ops.invoiceView.description', {
                  defaultValue: 'Track finance and CEO approval status.',
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
          {/* Main column */}
          <div className="xl:col-span-3">
            <Card>
              <CardContent className="py-5">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t('ops.invoiceView.filters.fund', { defaultValue: 'Fund' })}
                    </Label>
                    <div className="w-64">
                      <FundPicker
                        funds={funds}
                        translations={fundTranslations}
                        value={fundFilter}
                        onChange={setFundFilter}
                        langId={langId}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t('ops.invoiceView.filters.status', { defaultValue: 'Status' })}
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">
                          {t('ops.invoiceView.filters.allStatuses', { defaultValue: 'All statuses' })}
                        </SelectItem>
                        <SelectItem value="awaitingFm">
                          {t('ops.invoiceView.stage.awaitingFm', { defaultValue: 'Awaiting Finance' })}
                        </SelectItem>
                        <SelectItem value="awaitingCeo">
                          {t('ops.invoiceView.stage.awaitingCeo', { defaultValue: 'Awaiting CEO' })}
                        </SelectItem>
                        <SelectItem value="approved">
                          {t('ops.invoiceView.stage.approved', { defaultValue: 'Approved' })}
                        </SelectItem>
                        <SelectItem value="rejected">
                          {t('ops.invoiceView.stage.rejected', { defaultValue: 'Rejected' })}
                        </SelectItem>
                        <SelectItem value="correctionRequested">
                          {t('ops.invoiceView.stage.correctionRequested', { defaultValue: 'Correction Requested' })}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex-1 min-w-48">
                    <Label className="text-xs text-muted-foreground">
                      {t('ops.invoiceView.filters.search', { defaultValue: 'Search' })}
                    </Label>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('ops.invoiceView.filters.searchPlaceholder', {
                        defaultValue: 'Invoice # or description',
                      })}
                    />
                  </div>
                </div>

                {decideStage && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {canFm && canCeo && (
                      <div className="flex items-center gap-2 me-2">
                        <Label className="text-xs text-muted-foreground">
                          {t('ops.invoiceView.bulk.stage', { defaultValue: 'Decide as' })}
                        </Label>
                        <Select value={decideStage} onValueChange={(v) => changeStage(v as DecideStage)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fm">{stageLabel('fm')}</SelectItem>
                            <SelectItem value="ceo">{stageLabel('ceo')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button
                      size="sm"
                      disabled={selectedRows.length === 0 || bulkBusy}
                      onClick={() => setBulkMode('approve')}
                    >
                      {t('ops.invoiceView.bulk.approve', {
                        count: selectedRows.length,
                        defaultValue: 'Approve selected ({{count}})',
                      })}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedRows.length === 0 || bulkBusy}
                      onClick={() => setBulkMode('reject')}
                    >
                      {t('ops.invoiceView.bulk.reject', {
                        count: selectedRows.length,
                        defaultValue: 'Reject selected ({{count}})',
                      })}
                    </Button>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      {decideStage && (
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label={t('ops.invoiceView.bulk.selectAll', {
                              defaultValue: 'Select all eligible invoices',
                            })}
                            disabled={eligibleVisible.length === 0}
                            checked={
                              allVisibleSelected
                                ? true
                                : selectedRows.length > 0
                                  ? 'indeterminate'
                                  : false
                            }
                            onCheckedChange={(v) => toggleAllVisible(v === true)}
                          />
                        </TableHead>
                      )}
                      <TableHead>
                        {t('ops.invoiceView.columns.invoiceNumber', { defaultValue: 'Invoice #' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.invoiceView.columns.fund', { defaultValue: 'Fund' })}
                      </TableHead>
                      <TableHead className="text-end">
                        {t('ops.invoiceView.columns.amount', { defaultValue: 'Amount' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.invoiceView.columns.date', { defaultValue: 'Date' })}
                      </TableHead>
                      <TableHead className="text-center">
                        {t('ops.invoiceView.columns.status', { defaultValue: 'Status' })}
                      </TableHead>
                      <TableHead className="text-center w-20">
                        {t('ops.invoiceView.columns.actions', { defaultValue: 'Actions' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i) => {
                      const stage = stageOf(i);
                      return (
                        <TableRow key={i.id}>
                          {decideStage && (
                            <TableCell>
                              {eligibleAt(i, decideStage) && (
                                <Checkbox
                                  aria-label={t('ops.invoiceView.bulk.selectRow', {
                                    defaultValue: 'Select invoice',
                                  })}
                                  checked={selected.has(i.id)}
                                  onCheckedChange={(v) => toggleRow(i.id, v === true)}
                                />
                              )}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{i.invoiceNumber ?? '—'}</TableCell>
                          <TableCell>
                            {fundDisplayName(i.cashAdvanceId, fundTranslations, funds, langId)}
                          </TableCell>
                          <TableCell className="text-end font-mono text-xs">
                            {formatRial(i.invoiceAmount)}
                          </TableCell>
                          <TableCell>{i.invoiceDate ? formatDate(i.invoiceDate) : '—'}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-xs font-medium ${stage.badge}`}>
                              {t(`ops.invoiceView.stage.${stage.key}`, { defaultValue: stage.def })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              {i.financialManagerStatusId === 1 && (
                                <Button asChild variant="ghost" size="sm" mode="icon">
                                  <Link href={`/invoice/submit?id=${i.id}`}>
                                    <Pencil className="size-4" />
                                  </Link>
                                </Button>
                              )}
                              <Button asChild variant="ghost" size="sm" mode="icon">
                                <Link href={withQuery(`/invoice/${i.id}`, { back: listHref })}>
                                  <Eye className="size-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={decideStage ? 7 : 6} className="text-center py-8 text-muted-foreground">
                          {t('ops.invoiceView.empty', { defaultValue: 'No invoices yet' })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="col-span-1">
            <div className="grid gap-5 lg:gap-7.5">
              <Sidebar total={totalCount} pending={pendingCount} approved={approvedCount} />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk confirmation */}
      <Dialog open={bulkMode !== null} onOpenChange={(o) => !o && !bulkBusy && setBulkMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkMode === 'reject'
                ? t('ops.invoiceView.bulk.confirmRejectTitle', { defaultValue: 'Reject selected invoices' })
                : t('ops.invoiceView.bulk.confirmApproveTitle', { defaultValue: 'Approve selected invoices' })}
            </DialogTitle>
            <DialogDescription>
              {t('ops.invoiceView.bulk.confirmSummary', {
                count: selectedRows.length,
                amount: formatRial(selectedTotal),
                stage: decideStage ? stageLabel(decideStage) : '',
                defaultValue: '{{count}} invoices, total amount {{amount}}, stage: {{stage}}',
              })}
            </DialogDescription>
          </DialogHeader>
          {bulkMode === 'reject' && (
            <div className="space-y-1">
              <Label>
                {t('ops.invoiceView.bulk.reasonLabel', {
                  defaultValue: 'Reason (applies to all selected invoices)',
                })}
              </Label>
              <Textarea rows={3} value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
              {!bulkReason.trim() && (
                <p className="text-xs text-muted-foreground">
                  {t('ops.invoiceView.bulk.reasonRequired', { defaultValue: 'A reason is required to reject' })}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={bulkBusy} onClick={() => setBulkMode(null)}>
              {t('ops.common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant={bulkMode === 'reject' ? 'destructive' : 'primary'}
              disabled={bulkBusy || (bulkMode === 'reject' && !bulkReason.trim())}
              onClick={runBulk}
            >
              {bulkBusy
                ? t('ops.common.processing', { defaultValue: 'Processing...' })
                : t('ops.common.confirm', { defaultValue: 'Confirm' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk result */}
      <Dialog
        open={bulkResult !== null}
        onOpenChange={(o) => {
          if (!o) {
            setBulkResult(null);
            setBulkCallError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ops.invoiceView.bulk.resultTitle', { defaultValue: 'Result' })}</DialogTitle>
            <DialogDescription>
              {t('ops.invoiceView.bulk.resultSummary', {
                ok: bulkResult?.filter((r) => r.ok).length ?? 0,
                failed: (bulkResult?.filter((r) => !r.ok).length ?? 0) + (bulkCallError?.count ?? 0),
                defaultValue: '{{ok}} succeeded, {{failed}} failed',
              })}
            </DialogDescription>
          </DialogHeader>
          {bulkCallError && (
            <p className="text-sm text-destructive">
              {t('ops.invoiceView.bulk.callError', {
                message: bulkErrorText(bulkCallError.code),
                count: bulkCallError.count,
                defaultValue: '{{message}} Nothing was processed for {{count}} invoices.',
              })}
            </p>
          )}
          {bulkResult && bulkResult.some((r) => !r.ok) && (
            <div className="space-y-1">
              <Label>{t('ops.invoiceView.bulk.failedList', { defaultValue: 'Not processed' })}</Label>
              <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
                {bulkResult
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <li key={r.invoiceId}>
                      <span className="font-medium">{invoiceNumberOf(r.invoiceId)}</span>
                      {' — '}
                      {bulkErrorText(r.errorCode)}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setBulkResult(null);
                setBulkCallError(null);
              }}
            >
              {t('ops.common.close', { defaultValue: 'Close' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
