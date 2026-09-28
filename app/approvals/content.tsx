'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
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
  listChargeRequests,
  listInvoices,
  listFunds,
  listFundTranslations,
  listPersons,
} from '@/lib/cash-advance/api/client';
import type {
  ChargeRequestView,
  InvoiceView,
  CashAdvanceView,
  CashAdvanceTranslationView,
  PersonDirectoryRecord,
} from '@/lib/cash-advance/api/client';
import { formatDate, formatRial } from '@/lib/cash-advance/format';

// Language ids — Persian = 12, English = 10.
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

function personDisplayName(p: PersonDirectoryRecord, langId: number): string {
  const tr = p.translations?.find((x) => x.languageId === langId) ?? p.translations?.[0];
  return tr ? `${tr.firstName} ${tr.lastName}`.trim() : p.nationalId || p.id;
}

type Queue = 'waiting' | 'approved';

interface Row {
  kind: 'request' | 'invoice';
  id: string;
  number: string;
  fundId: string;
  personId: string;
  amount: number;
  date: string | null;
  queue: Queue;
  href: string;
}

export function CashAdvanceApprovalsContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const { hasPermission } = usePermission();
  const langId = language.code === 'en' ? EN : FA;

  const canFm = hasPermission(['CashAdvance.Approval.FinancialManager']);
  const canCeo = hasPermission(['CashAdvance.Approval.Ceo']);

  const [requests, setRequests] = useState<ChargeRequestView[]>([]);
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [persons, setPersons] = useState<PersonDirectoryRecord[]>([]);

  const [filter, setFilter] = useState<'waiting' | 'approved' | 'all'>('waiting');
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [cr, inv, f, ft, ps] = await Promise.all([
        listChargeRequests(),
        listInvoices(),
        listFunds(),
        listFundTranslations(),
        listPersons(),
      ]);
      setRequests(cr);
      setInvoices(inv);
      setFunds(f);
      setFundTranslations(ft);
      setPersons(ps);
    } catch {
      showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── name resolvers ──
  const fundName = useCallback(
    (fundId: string) => {
      const rows = fundTranslations.filter((x) => x.cashAdvanceId === fundId);
      const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
      if (tr?.name) return tr.name;
      return funds.find((f) => f.id === fundId)?.code ?? '—';
    },
    [fundTranslations, funds, langId],
  );

  const personName = useCallback(
    (personId: string) => {
      const p = persons.find((x) => x.id === personId);
      return p ? personDisplayName(p, langId) : personId;
    },
    [persons, langId],
  );

  // ── queue derivation — "pending for me" per role, unified row shape, deduped ──
  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>(); // key = kind:id ; waiting wins over approved
    const put = (r: Row) => {
      const k = `${r.kind}:${r.id}`;
      const cur = map.get(k);
      if (!cur || (cur.queue === 'approved' && r.queue === 'waiting')) map.set(k, r);
    };
    const reqRow = (r: ChargeRequestView, queue: Queue): Row => ({
      kind: 'request',
      id: r.id,
      number: r.requestNumber,
      fundId: r.cashAdvanceId,
      personId: r.requesterPersonId,
      amount: r.amount,
      date: r.requestedAt ?? r.createdAt,
      queue,
      href: `/cash-advance/${r.id}`,
    });
    const invRow = (i: InvoiceView, queue: Queue): Row => ({
      kind: 'invoice',
      id: i.id,
      number: i.invoiceNumber ?? '—',
      fundId: i.cashAdvanceId,
      personId: i.createdBy,
      amount: i.invoiceAmount,
      date: i.invoiceDate ?? i.createdAt,
      queue,
      href: `/cash-advance/invoice/${i.id}`,
    });
    // Requests: CEO first, then FM
    if (canCeo) {
      requests.filter((r) => r.ceoStatusId === 1).forEach((r) => put(reqRow(r, 'waiting')));
      requests.filter((r) => r.ceoStatusId === 2).forEach((r) => put(reqRow(r, 'approved')));
    }
    if (canFm) {
      requests
        .filter((r) => r.ceoStatusId === 2 && r.financialManagerStatusId === 1)
        .forEach((r) => put(reqRow(r, 'waiting')));
      requests
        .filter((r) => r.financialManagerStatusId === 2)
        .forEach((r) => put(reqRow(r, 'approved')));
    }
    // Invoices: FM first, then CEO
    if (canFm) {
      invoices.filter((i) => i.financialManagerStatusId === 1).forEach((i) => put(invRow(i, 'waiting')));
      invoices.filter((i) => i.financialManagerStatusId === 2).forEach((i) => put(invRow(i, 'approved')));
    }
    if (canCeo) {
      invoices
        .filter((i) => i.financialManagerStatusId === 2 && i.ceoStatusId === 1)
        .forEach((i) => put(invRow(i, 'waiting')));
      invoices.filter((i) => i.ceoStatusId === 2).forEach((i) => put(invRow(i, 'approved')));
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    );
  }, [requests, invoices, canFm, canCeo]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => (filter === 'all' ? true : r.queue === filter))
      .filter((r) => {
        if (!term) return true;
        return (
          r.number.toLowerCase().includes(term) ||
          fundName(r.fundId).toLowerCase().includes(term) ||
          personName(r.personId).toLowerCase().includes(term)
        );
      });
  }, [rows, filter, search, fundName, personName]);

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-amber-50/25! border-amber-100! dark:bg-amber-950/25! dark:border-amber-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('ops.approvals.title', { defaultValue: 'Approvals' })} />
              <ToolbarDescription>
                {t('ops.approvals.description', {
                  defaultValue:
                    'Review recharge requests awaiting a CEO or Finance Manager decision.',
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
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div className="space-y-1">
                <Select
                  value={filter}
                  onValueChange={(v) => setFilter(v as 'waiting' | 'approved' | 'all')}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiting">
                      {t('ops.approvals.filters.waiting', { defaultValue: 'Waiting' })}
                    </SelectItem>
                    <SelectItem value="approved">
                      {t('ops.approvals.filters.approved', { defaultValue: 'Approved' })}
                    </SelectItem>
                    <SelectItem value="all">
                      {t('ops.approvals.filters.all', { defaultValue: 'All' })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-48">
                <Label className="text-xs text-muted-foreground">
                  {t('ops.approvals.filters.search', { defaultValue: 'Search' })}
                </Label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('ops.approvals.filters.search', { defaultValue: 'Search' })}
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('ops.approvals.columns.type', { defaultValue: 'Type' })}
                  </TableHead>
                  <TableHead>
                    {t('ops.approvals.columns.number', { defaultValue: 'Number' })}
                  </TableHead>
                  <TableHead>
                    {t('ops.approvals.columns.fund', { defaultValue: 'Fund' })}
                  </TableHead>
                  <TableHead>
                    {t('ops.approvals.columns.requester', { defaultValue: 'Requester' })}
                  </TableHead>
                  <TableHead className="text-end">
                    {t('ops.approvals.columns.amount', { defaultValue: 'Amount' })}
                  </TableHead>
                  <TableHead>
                    {t('ops.approvals.columns.requestedAt', { defaultValue: 'Date' })}
                  </TableHead>
                  <TableHead className="text-center w-20">
                    {t('ops.approvals.columns.actions', { defaultValue: 'Actions' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r) => (
                  <TableRow key={`${r.kind}:${r.id}`}>
                    <TableCell>
                      {r.kind === 'request' ? (
                        <Badge className="text-xs font-medium bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900">
                          {t('ops.approvals.typeRequest', { defaultValue: 'Request' })}
                        </Badge>
                      ) : (
                        <Badge className="text-xs font-medium bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900">
                          {t('ops.approvals.typeInvoice', { defaultValue: 'Invoice' })}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.number}</TableCell>
                    <TableCell>{fundName(r.fundId)}</TableCell>
                    <TableCell>{personName(r.personId)}</TableCell>
                    <TableCell className="text-end font-mono text-xs">
                      {formatRial(r.amount)}
                    </TableCell>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="text-center">
                      <Button asChild variant="ghost" size="sm" mode="icon">
                        <Link href={r.href}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('ops.approvals.empty', { defaultValue: 'Nothing awaiting your decision' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
