'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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
  type InvoiceView,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
} from '@/lib/cash-advance/api/client';
import { formatDate, formatRial } from '@/lib/cash-advance/format';
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

export function InvoiceViewContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const { hasPermission } = usePermission();
  const canRead = hasPermission(['CashAdvance.Invoice.Read']);

  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);

  const [fundFilter, setFundFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

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

                <Table>
                  <TableHeader>
                    <TableRow>
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
                                <Link href={`/invoice/${i.id}`}>
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
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
    </div>
  );
}
