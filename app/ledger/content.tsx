'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
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
import { AmountInput } from '@/components/ui/amount-input';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useLanguage } from '@/providers/i18n-provider';
import { formatRial, formatDate } from '@/lib/cash-advance/format';
import {
  listTransactions,
  createTransaction,
  listFunds,
  listMyFunds,
  listFundTranslations,
  listPersons,
  listPersonLimits,
  type TransactionView,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type PersonDirectoryRecord,
  type CashAdvancePersonView,
} from '@/lib/cash-advance/api/client';
import { PersonPicker, personDisplayName } from './components/person-picker';
import { Sidebar } from './components/sidebar';

const FA = 12;
const EN = 10;
const ALL = 'all';

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

/** Direction is stored as a 3-char string; treat "in" (case-insensitive) as inflow. */
function isInflow(direction: string | null | undefined): boolean {
  return (direction ?? '').trim().toLowerCase() === 'in';
}

interface Draft {
  cashAdvanceId: string;
  personId: string | null;
  flowType: string;
  direction: string;
  amount: string;
  balanceAfter: string;
  transactionDate: string;
  sourceType: string;
  description: string;
}

function emptyDraft(): Draft {
  return {
    cashAdvanceId: '',
    personId: null,
    flowType: '',
    direction: 'In',
    amount: '',
    balanceAfter: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    sourceType: '',
    description: '',
  };
}

interface PersonBalanceRow {
  personId: string;
  inflow: number;
  outflow: number;
  balance: number;
  limit: number | null;
  overLimit: boolean;
}

export function CashAdvanceLedgerContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;

  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  // Two fund lists, deliberately:
  //   funds   — every fund, used ONLY by fundName() to resolve an id to a display name. A
  //             transaction booked against a fund the caller is no longer in charge of must
  //             still show that fund's name, not a dash; scoping this list would break that.
  //   myFunds — the funds the caller is currently in charge of (or all, with Request.ReadAll).
  //             Feeds BOTH selectors on this page: the filter and the draft-entry picker.
  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [myFunds, setMyFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [persons, setPersons] = useState<PersonDirectoryRecord[]>([]);
  const [personLimits, setPersonLimits] = useState<CashAdvancePersonView[]>([]);

  // filters
  const [fundFilter, setFundFilter] = useState<string>(ALL);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string>(ALL);
  const [flowTypeFilter, setFlowTypeFilter] = useState<string>(ALL);
  const [search, setSearch] = useState('');

  // create dialog
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [tx, f, mf, ft, ps, pl] = await Promise.all([
        listTransactions(),
        listFunds(),
        listMyFunds(),
        listFundTranslations(),
        listPersons(),
        listPersonLimits(),
      ]);
      setTransactions(tx);
      setFunds(f);
      setMyFunds(mf);
      setFundTranslations(ft);
      setPersons(ps);
      setPersonLimits(pl);
    } catch {
      showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
    }
  }, [t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ── resolvers ──
  const fundName = useCallback(
    (fundId: string) => {
      const rows = fundTranslations.filter((x) => x.cashAdvanceId === fundId);
      const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
      if (tr?.name) return tr.name;
      return funds.find((f) => f.id === fundId)?.code ?? '—';
    },
    [fundTranslations, funds, langId],
  );

  const personsById = useMemo(() => {
    const m = new Map<string, PersonDirectoryRecord>();
    for (const p of persons) m.set(p.id, p);
    return m;
  }, [persons]);

  const personName = useCallback(
    (personId: string) => {
      const p = personsById.get(personId);
      return p ? personDisplayName(p, langId) : personId;
    },
    [personsById, langId],
  );

  const nationalIdOf = useCallback(
    (personId: string) => personsById.get(personId)?.nationalId ?? '—',
    [personsById],
  );

  const limitByPerson = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of personLimits) if (l.isActive) m.set(l.personId, l.maxAmount);
    return m;
  }, [personLimits]);

  // distinct flow types for the filter
  const flowTypes = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) if (tx.flowType) set.add(tx.flowType);
    return Array.from(set).sort();
  }, [transactions]);

  // transactions narrowed to the selected fund (basis for the balance summary)
  const fundScoped = useMemo(
    () =>
      fundFilter === ALL
        ? transactions
        : transactions.filter((tx) => tx.cashAdvanceId === fundFilter),
    [transactions, fundFilter],
  );

  // fully filtered rows for the ledger table
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fundScoped
      .filter((tx) => (personFilter ? tx.personId === personFilter : true))
      .filter((tx) =>
        directionFilter === ALL
          ? true
          : directionFilter === 'In'
            ? isInflow(tx.direction)
            : !isInflow(tx.direction),
      )
      .filter((tx) => (flowTypeFilter === ALL ? true : tx.flowType === flowTypeFilter))
      .filter((tx) => {
        if (!q) return true;
        const hay = [
          tx.description ?? '',
          tx.flowType ?? '',
          tx.sourceType ?? '',
          tx.direction ?? '',
          fundName(tx.cashAdvanceId),
          personName(tx.personId),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.transactionDate < b.transactionDate ? 1 : -1));
  }, [
    fundScoped,
    personFilter,
    directionFilter,
    flowTypeFilter,
    search,
    fundName,
    personName,
  ]);

  // per-person balance summary (In minus Out), scoped to the selected fund
  const balanceRows = useMemo<PersonBalanceRow[]>(() => {
    const byPerson = new Map<string, { inflow: number; outflow: number }>();
    for (const tx of fundScoped) {
      const acc = byPerson.get(tx.personId) ?? { inflow: 0, outflow: 0 };
      if (isInflow(tx.direction)) acc.inflow += tx.amount;
      else acc.outflow += tx.amount;
      byPerson.set(tx.personId, acc);
    }
    const rows: PersonBalanceRow[] = [];
    for (const [personId, { inflow, outflow }] of Array.from(byPerson.entries())) {
      // Balance = what the person still holds and has not accounted for:
      // paid out to them (Out) minus settled by approved factors (In).
      // This is the figure the per-person limit caps, so it must match the backend's
      // PersonLimitService (Out − In), not the reverse.
      const balance = outflow - inflow;
      const limit = limitByPerson.has(personId) ? limitByPerson.get(personId)! : null;
      rows.push({
        personId,
        inflow,
        outflow,
        balance,
        limit,
        overLimit: limit !== null && balance >= limit,
      });
    }
    return rows.sort((a, b) => b.balance - a.balance);
  }, [fundScoped, limitByPerson]);

  const totalIn = useMemo(
    () => filteredRows.filter((tx) => isInflow(tx.direction)).reduce((s, tx) => s + tx.amount, 0),
    [filteredRows],
  );
  const totalOut = useMemo(
    () => filteredRows.filter((tx) => !isInflow(tx.direction)).reduce((s, tx) => s + tx.amount, 0),
    [filteredRows],
  );
  const overLimitCount = useMemo(
    () => balanceRows.filter((r) => r.overLimit).length,
    [balanceRows],
  );

  // ── create entry ──
  const handleSave = async () => {
    if (!draft) return;
    if (!draft.cashAdvanceId) {
      showError(t('ops.ledger.validation.fundRequired', { defaultValue: 'Fund is required' }));
      return;
    }
    if (!draft.personId) {
      showError(t('ops.ledger.validation.personRequired', { defaultValue: 'Person is required' }));
      return;
    }
    if (!draft.flowType.trim()) {
      showError(t('ops.ledger.validation.flowTypeRequired', { defaultValue: 'Flow type is required' }));
      return;
    }
    if (!draft.direction.trim()) {
      showError(t('ops.ledger.validation.directionRequired', { defaultValue: 'Direction is required' }));
      return;
    }
    const amount = Number(draft.amount);
    if (!draft.amount.trim() || Number.isNaN(amount) || amount <= 0) {
      showError(t('ops.ledger.validation.amountRequired', { defaultValue: 'Amount is required' }));
      return;
    }
    if (!draft.transactionDate) {
      showError(t('ops.ledger.validation.dateRequired', { defaultValue: 'Transaction date is required' }));
      return;
    }
    const balanceAfter = draft.balanceAfter.trim() ? Number(draft.balanceAfter) : null;

    setSaving(true);
    try {
      await createTransaction({
        cashAdvanceId: draft.cashAdvanceId,
        personId: draft.personId,
        flowType: draft.flowType.trim(),
        direction: draft.direction.trim(),
        amount,
        balanceAfter: balanceAfter !== null && !Number.isNaN(balanceAfter) ? balanceAfter : null,
        transactionDate: new Date(draft.transactionDate).toISOString(),
        sourceType: draft.sourceType.trim() || null,
        description: draft.description.trim() || null,
      });
      showSuccess(t('ops.ledger.toasts.created', { defaultValue: 'Ledger entry recorded' }));
      setDraft(null);
      await loadAll();
    } catch (e) {
      showError(
        (e as Error)?.message ||
          t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card */}
      <Card className="bg-cyan-50/25! border-cyan-100! dark:bg-cyan-950/25! dark:border-cyan-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('ops.ledger.title', { defaultValue: 'Financial Ledger' })} />
              <ToolbarDescription>
                {t('ops.ledger.description', {
                  defaultValue: 'Append-only ledger of cash flows per fund and person.',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div
        className={
          'space-y-5 lg:space-y-7.5 ' +
          '[&_div.rounded-xl.bg-card]:bg-cyan-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-cyan-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-cyan-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-cyan-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 lg:gap-7.5">
          {/* Main column */}
          <div className="col-span-3">
            <div className="grid gap-5 lg:gap-7.5">
              {/* Filters + ledger table */}
              <Card>
                <CardContent className="py-5">
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
                    <div className="space-y-1">
                      <Label>{t('ops.ledger.filters.fund', { defaultValue: 'Fund' })}</Label>
                      <Select value={fundFilter} onValueChange={setFundFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>
                            {t('ops.ledger.filters.allFunds', { defaultValue: 'All funds' })}
                          </SelectItem>
                          {myFunds.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {fundName(f.id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t('ops.ledger.filters.person', { defaultValue: 'Person' })}</Label>
                      <PersonPicker
                        persons={persons}
                        value={personFilter}
                        onChange={setPersonFilter}
                        langId={langId}
                        placeholder={t('ops.ledger.filters.allPersons', {
                          defaultValue: 'All persons',
                        })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>{t('ops.ledger.filters.direction', { defaultValue: 'Direction' })}</Label>
                      <Select value={directionFilter} onValueChange={setDirectionFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>
                            {t('ops.ledger.filters.allDirections', { defaultValue: 'All directions' })}
                          </SelectItem>
                          <SelectItem value="In">
                            {t('ops.ledger.directionIn', { defaultValue: 'In' })}
                          </SelectItem>
                          <SelectItem value="Out">
                            {t('ops.ledger.directionOut', { defaultValue: 'Out' })}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t('ops.ledger.filters.flowType', { defaultValue: 'Flow Type' })}</Label>
                      <Select value={flowTypeFilter} onValueChange={setFlowTypeFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL}>
                            {t('ops.ledger.filters.allFlowTypes', { defaultValue: 'All flow types' })}
                          </SelectItem>
                          {flowTypes.map((ftype) => (
                            <SelectItem key={ftype} value={ftype}>
                              {ftype}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 md:col-span-2 xl:col-span-1">
                      <Label>{t('ops.ledger.filters.search', { defaultValue: 'Search' })}</Label>
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('ops.common.searchPlaceholder', { defaultValue: 'Search...' })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end mb-4">
                    <Button onClick={() => setDraft(emptyDraft())}>
                      <Plus className="size-4" />
                      {t('ops.ledger.addButton', { defaultValue: 'New Entry' })}
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t('ops.ledger.columns.transactionDate', { defaultValue: 'Date' })}
                          </TableHead>
                          <TableHead>
                            {t('ops.ledger.columns.fund', { defaultValue: 'Fund' })}
                          </TableHead>
                          <TableHead>
                            {t('ops.ledger.columns.person', { defaultValue: 'Person' })}
                          </TableHead>
                          <TableHead>
                            {t('ops.ledger.columns.flowType', { defaultValue: 'Flow Type' })}
                          </TableHead>
                          <TableHead className="text-center">
                            {t('ops.ledger.columns.direction', { defaultValue: 'Direction' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('ops.ledger.columns.amount', { defaultValue: 'Amount' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('ops.ledger.columns.balanceAfter', { defaultValue: 'Balance After' })}
                          </TableHead>
                          <TableHead>
                            {t('ops.ledger.columns.sourceType', { defaultValue: 'Source' })}
                          </TableHead>
                          <TableHead>
                            {t('ops.ledger.columns.description', { defaultValue: 'Description' })}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              {formatDate(tx.transactionDate)}
                            </TableCell>
                            <TableCell>{fundName(tx.cashAdvanceId)}</TableCell>
                            <TableCell>{personName(tx.personId)}</TableCell>
                            <TableCell>{tx.flowType}</TableCell>
                            <TableCell className="text-center">
                              {isInflow(tx.direction) ? (
                                <Badge variant="success" appearance="light">
                                  {t('ops.ledger.directionIn', { defaultValue: 'In' })}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" appearance="light">
                                  {t('ops.ledger.directionOut', { defaultValue: 'Out' })}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              {formatRial(tx.amount)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap text-muted-foreground">
                              {formatRial(tx.balanceAfter)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {tx.sourceType ?? '—'}
                            </TableCell>
                            <TableCell className="max-w-[16rem] truncate">
                              {tx.description ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              {t('ops.ledger.empty', { defaultValue: 'No ledger entries yet' })}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Per-person balance summary */}
              <Card>
                <CardContent className="py-5">
                  <h3 className="text-base font-semibold text-foreground mb-4">
                    {t('ops.ledger.balanceTitle', { defaultValue: 'Per-Person Balance' })}
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t('ops.ledger.columns.person', { defaultValue: 'Person' })}
                          </TableHead>
                          <TableHead>
                            {t('admin.personLimits.columns.nationalId', { defaultValue: 'National ID' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('ops.ledger.directionIn', { defaultValue: 'In' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('ops.ledger.directionOut', { defaultValue: 'Out' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('ops.ledger.balanceCol', { defaultValue: 'Balance' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('admin.personLimits.columns.maxAmount', { defaultValue: 'Max Amount' })}
                          </TableHead>
                          <TableHead className="text-center">
                            {t('ops.common.status', { defaultValue: 'Status' })}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balanceRows.map((r) => (
                          <TableRow
                            key={r.personId}
                            className={r.overLimit ? 'bg-rose-100/40 dark:bg-rose-900/20' : undefined}
                          >
                            <TableCell className="font-medium">{personName(r.personId)}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {nationalIdOf(r.personId)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              {formatRial(r.inflow)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              {formatRial(r.outflow)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap font-semibold">
                              {formatRial(r.balance)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap text-muted-foreground">
                              {r.limit !== null ? formatRial(r.limit) : '—'}
                            </TableCell>
                            <TableCell className="text-center">
                              {r.limit === null ? (
                                <Badge variant="secondary" appearance="light">
                                  {t('ops.ledger.noLimit', { defaultValue: 'No limit' })}
                                </Badge>
                              ) : r.overLimit ? (
                                <Badge variant="destructive" appearance="light">
                                  {t('ops.ledger.overLimit', { defaultValue: 'At / over limit' })}
                                </Badge>
                              ) : (
                                <Badge variant="success" appearance="light">
                                  {t('ops.ledger.withinLimit', { defaultValue: 'Within limit' })}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {balanceRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              {t('ops.ledger.empty', { defaultValue: 'No ledger entries yet' })}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1">
            <div className="grid gap-5 lg:gap-7.5">
              <Sidebar
                entryCount={filteredRows.length}
                totalIn={totalIn}
                totalOut={totalOut}
                overLimitCount={overLimitCount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create entry dialog */}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ops.ledger.addButton', { defaultValue: 'New Entry' })}</DialogTitle>
            <DialogDescription>
              {t('ops.ledger.description', {
                defaultValue: 'Append-only ledger of cash flows per fund and person.',
              })}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>{t('ops.ledger.form.fund', { defaultValue: 'Fund' })}</Label>
                <Select
                  value={draft.cashAdvanceId || undefined}
                  onValueChange={(v) => setDraft({ ...draft, cashAdvanceId: v })}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('ops.ledger.form.fundPlaceholder', {
                        defaultValue: 'Select a fund',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {myFunds
                      .filter((f) => f.isActive || f.id === draft.cashAdvanceId)
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {fundName(f.id)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t('ops.ledger.form.person', { defaultValue: 'Person' })}</Label>
                <PersonPicker
                  persons={persons}
                  value={draft.personId}
                  onChange={(personId) => setDraft({ ...draft, personId })}
                  langId={langId}
                  placeholder={t('ops.ledger.form.personPlaceholder', {
                    defaultValue: 'Select a person',
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{t('ops.ledger.form.flowType', { defaultValue: 'Flow Type' })}</Label>
                  <Input
                    value={draft.flowType}
                    onChange={(e) => setDraft({ ...draft, flowType: e.target.value })}
                    placeholder={t('ops.ledger.form.flowTypePlaceholder', {
                      defaultValue: 'e.g. Payment, Invoice, Settlement',
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t('ops.ledger.form.direction', { defaultValue: 'Direction' })}</Label>
                  <Select
                    value={draft.direction}
                    onValueChange={(v) => setDraft({ ...draft, direction: v })}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('ops.ledger.form.directionPlaceholder', {
                          defaultValue: 'In or Out',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In">
                        {t('ops.ledger.directionIn', { defaultValue: 'In' })}
                      </SelectItem>
                      <SelectItem value="Out">
                        {t('ops.ledger.directionOut', { defaultValue: 'Out' })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{t('ops.ledger.form.amount', { defaultValue: 'Amount' })}</Label>
                  <AmountInput
                    value={draft.amount}
                    onChange={(raw) => setDraft({ ...draft, amount: raw })}
                    placeholder={t('ops.ledger.form.amountPlaceholder', {
                      defaultValue: 'Enter amount',
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t('ops.ledger.form.balanceAfter', { defaultValue: 'Balance After' })}</Label>
                  <AmountInput
                    value={draft.balanceAfter}
                    onChange={(raw) => setDraft({ ...draft, balanceAfter: raw })}
                    placeholder={t('ops.ledger.form.balanceAfterPlaceholder', {
                      defaultValue: 'Optional running balance',
                    })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>
                  {t('ops.ledger.form.transactionDate', { defaultValue: 'Transaction Date' })}
                </Label>
                <DatePickerComponent
                  value={draft.transactionDate}
                  onChange={(v) => setDraft({ ...draft, transactionDate: v })}
                  forcePersian
                />
              </div>

              <div className="space-y-1">
                <Label>{t('ops.ledger.form.sourceType', { defaultValue: 'Source Type' })}</Label>
                <Input
                  value={draft.sourceType}
                  onChange={(e) => setDraft({ ...draft, sourceType: e.target.value })}
                  placeholder={t('ops.ledger.form.sourceTypePlaceholder', {
                    defaultValue: 'Optional source type',
                  })}
                />
              </div>

              <div className="space-y-1">
                <Label>{t('ops.ledger.form.description', { defaultValue: 'Description' })}</Label>
                <Input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder={t('ops.ledger.form.descriptionPlaceholder', {
                    defaultValue: 'Optional note',
                  })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              {t('ops.common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? t('ops.common.processing', { defaultValue: 'Processing...' })
                : t('ops.common.create', { defaultValue: 'Create' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
