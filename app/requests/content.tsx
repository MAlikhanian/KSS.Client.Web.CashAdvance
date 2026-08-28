'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Eye, Plus } from 'lucide-react';
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
import {
  listChargeRequests,
  listFunds,
  listMyFunds,
  listFundTranslations,
  listPersons,
  type ChargeRequestView,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type PersonDirectoryRecord,
} from '@/lib/cash-advance/api/client';
import { formatDate, formatRial } from '@/lib/cash-advance/format';
import { personDisplayName } from './components/person-picker';
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

export function CashAdvanceRequestsContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;

  const [requests, setRequests] = useState<ChargeRequestView[]>([]);
  // Two fund lists, deliberately:
  //   funds   — every fund, used ONLY to resolve a fund id to its display name. A request the
  //             caller raised against a fund they are no longer in charge of must still show
  //             that fund's name, not a dash; scoping this list would break that.
  //   myFunds — the funds the caller is currently in charge of (or all, with Request.ReadAll).
  //             Feeds the filter combo, per the rule that a petty-cash selector shows a user
  //             only what they are responsible for.
  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [myFunds, setMyFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [persons, setPersons] = useState<PersonDirectoryRecord[]>([]);

  const [fundFilter, setFundFilter] = useState<string>('ALL');

  const loadAll = useCallback(async () => {
    try {
      const [reqs, f, mf, ft, ps] = await Promise.all([
        listChargeRequests(),
        listFunds(),
        listMyFunds(),
        listFundTranslations(),
        listPersons(),
      ]);
      setRequests(reqs);
      setFunds(f);
      setMyFunds(mf);
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
      return funds.find((x) => x.id === fundId)?.code ?? '—';
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

  // Single derived workflow stage for the grid: Submitted → CEO → Finance → Paid, or Rejected.
  // Status seed is fixed: 1=Pending, 2=Approved, 3=Rejected (backend StatusApproved = 2).
  const APPROVED_STATUS = 2;
  const REJECTED_STATUS = 3;
  const derivedStatus = (r: ChargeRequestView) => {
    if (r.paidAt)
      return {
        label: t('ops.requests.stage.paid', { defaultValue: 'Paid' }),
        badgeClass:
          'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
        rowClass: 'bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/40',
      };
    if (r.ceoStatusId === REJECTED_STATUS || r.financialManagerStatusId === REJECTED_STATUS)
      return {
        label: t('ops.requests.stage.rejected', { defaultValue: 'Rejected' }),
        badgeClass:
          'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
        rowClass: 'bg-rose-50/70 hover:bg-rose-50 dark:bg-rose-950/30 dark:hover:bg-rose-950/40',
      };
    if (r.financialManagerStatusId === APPROVED_STATUS)
      return {
        label: t('ops.requests.stage.financeApproved', { defaultValue: 'Finance Approved' }),
        badgeClass:
          'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900',
        rowClass: '',
      };
    if (r.ceoStatusId === APPROVED_STATUS)
      return {
        label: t('ops.requests.stage.ceoApproved', { defaultValue: 'CEO Approved' }),
        badgeClass:
          'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
        rowClass: '',
      };
    return {
      label: t('ops.requests.stage.submitted', { defaultValue: 'Submitted' }),
      badgeClass:
        'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      rowClass: '',
    };
  };

  const filtered = useMemo(() => {
    const sorted = [...requests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (fundFilter === 'ALL') return sorted;
    return sorted.filter((r) => r.cashAdvanceId === fundFilter);
  }, [requests, fundFilter]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    [filtered],
  );

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card */}
      <Card className="bg-amber-50/25! border-amber-100! dark:bg-amber-950/25! dark:border-amber-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle
                text={t('ops.requests.title', { defaultValue: 'Recharge Requests' })}
              />
              <ToolbarDescription>
                {t('ops.requests.description', {
                  defaultValue:
                    'Recharge requests raised against cash advance funds — track status, approvals, and payment.',
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
          <div className="col-span-3">
            <Card>
              <CardContent className="py-5">
                <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t('ops.requests.filters.fund', { defaultValue: 'Fund' })}
                    </Label>
                    <Select value={fundFilter} onValueChange={setFundFilter}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">
                          {t('ops.requests.filters.allFunds', { defaultValue: 'All funds' })}
                        </SelectItem>
                        {myFunds.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {fundName(f.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button asChild>
                    <Link href="/requests/create">
                      <Plus className="size-4" />
                      {t('ops.requests.addButton', { defaultValue: 'New Request' })}
                    </Link>
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t('ops.requests.columns.requestNumber', { defaultValue: 'Request #' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.requests.columns.fund', { defaultValue: 'Fund' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.requests.columns.requester', { defaultValue: 'Requester' })}
                      </TableHead>
                      <TableHead className="text-end">
                        {t('ops.requests.columns.amount', { defaultValue: 'Amount' })}
                      </TableHead>
                      <TableHead className="text-center">
                        {t('ops.requests.columns.status', { defaultValue: 'Status' })}
                      </TableHead>
                      <TableHead>
                        {t('ops.requests.columns.requestedAt', { defaultValue: 'Requested' })}
                      </TableHead>
                      <TableHead className="text-center w-20">
                        {t('ops.requests.columns.actions', { defaultValue: 'Actions' })}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const stage = derivedStatus(r);
                      return (
                        <TableRow key={r.id} className={stage.rowClass}>
                          <TableCell className="font-medium">{r.requestNumber}</TableCell>
                          <TableCell>{fundName(r.cashAdvanceId)}</TableCell>
                          <TableCell>{personName(r.requesterPersonId)}</TableCell>
                          <TableCell className="text-end font-mono text-xs">
                            {formatRial(r.amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-xs font-medium ${stage.badgeClass}`}>
                              {stage.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{r.requestedAt ? formatDate(r.requestedAt) : '—'}</TableCell>
                          <TableCell className="text-center">
                            <Button asChild variant="ghost" size="sm" mode="icon">
                              <Link href={`/${r.id}`}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('ops.requests.empty', { defaultValue: 'No recharge requests yet' })}
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
              <Sidebar
                totalRequests={filtered.length}
                fundsCount={funds.length}
                totalAmountLabel={formatRial(totalAmount)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
