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
  listFlowTypes,
  type FlowTypeView,
  type TransactionView,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type PersonDirectoryRecord,
  type CashAdvancePersonView,
} from '@/lib/cash-advance/api/client';
import { flowTypeDisplay, INVALID_DIRECTION, INVALID_FLOW_TYPE } from './flow-types';
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

/** transactionDate is written as a full ISO string; compare on the date part only. */
const dayOf = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : '');

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
  // The accepted flow types, served by the backend with their display names (see ./flow-types).
  const [flowTypeList, setFlowTypeList] = useState<FlowTypeView[]>([]);
  const [flowTypesFailed, setFlowTypesFailed] = useState(false);
  const lang = langId === EN ? 'en' : 'fa';

  // filters
  const [fundFilter, setFundFilter] = useState<string>(ALL);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string>(ALL);
  const [flowTypeFilter, setFlowTypeFilter] = useState<string>(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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

  // Flow types load on their own, NOT inside loadAll's all-or-nothing Promise.all. If the list
  // is unavailable (a backend without the endpoint, or any failure), the ledger still loads:
  // stored values show as-is and only recording a new entry is blocked, so nothing is ever
  // written with a guessed type. An empty list is treated the same way: there is nothing valid
  // to choose, so the form says so instead of offering an empty picker.
  useEffect(() => {
    let cancelled = false;
    listFlowTypes()
      .then((list) => {
        if (cancelled) return;
        setFlowTypeList(list);
        setFlowTypesFailed(list.length === 0);
      })
      .catch(() => {
        if (cancelled) return;
        setFlowTypeList([]);
        setFlowTypesFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  /**
   * Display names come from the served flow-type list, not from this app's i18n: the list
   * carries each code's name in both languages, including wording that is the customer's own
   * rather than a literal translation (kept, with its reason, beside the list on the backend).
   * Do not re-add local names here — a second copy is exactly what drifts. A stored value not
   * in the list falls through unchanged rather than being hidden.
   */
  const flowTypeLabel = useCallback(
    (value: string | null | undefined): string => flowTypeDisplay(flowTypeList, value, lang),
    [flowTypeList, lang],
  );

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
      .filter((tx) => {
        // No bound set means no date filtering at all. Deliberately NOT the cover sheet's
        // predicate, which drops undated rows unconditionally — that page lists them in a
        // separate section, and this one has nowhere to show them, so copying it verbatim
        // would hide rows whenever both pickers were empty.
        if (!fromDate && !toDate) return true;
        const d = dayOf(tx.transactionDate);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      })
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
    fromDate,
    toDate,
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
    if (flowTypesFailed) {
      showError(
        t('ops.ledger.form.flowTypesUnavailable', {
          defaultValue: "Flow types could not be loaded, so an entry can't be recorded right now.",
        }),
      );
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
      const message = (e as Error)?.message;
      if (message === INVALID_FLOW_TYPE) {
        showError(
          t('ops.ledger.validation.invalidFlowType', {
            defaultValue: 'This flow type is not accepted. Choose one from the list.',
          }),
        );
      } else if (message === INVALID_DIRECTION) {
        showError(
          t('ops.ledger.validation.invalidDirection', {
            defaultValue: 'This nature is not accepted. Choose credit or debit.',
          }),
        );
      } else {
        showError(message || t('ops.common.toasts.saveError', { defaultValue: 'Failed to save' }));
      }
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
          {/* Main column.
              The span is xl: ONLY, matching the xl: on the container's column count. A bare
              `col-span-3` asks for three columns in the `grid-cols-1` that applies below xl,
              which makes the grid generate two IMPLICIT auto-width columns and lets this
              column's content exceed the container instead of stacking. Do not "tidy" the
              prefix away. */}
          <div className="xl:col-span-3">
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
                              {flowTypeLabel(ftype)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>{t('ops.ledger.filters.fromDate', { defaultValue: 'From Date' })}</Label>
                      <DatePickerComponent value={fromDate} onChange={setFromDate} forcePersian />
                    </div>

                    <div className="space-y-1">
                      <Label>{t('ops.ledger.filters.toDate', { defaultValue: 'To Date' })}</Label>
                      <DatePickerComponent
                        value={toDate}
                        onChange={setToDate}
                        minDate={fromDate ? new Date(fromDate) : undefined}
                        forcePersian
                      />
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
                            <TableCell>{flowTypeLabel(tx.flowType)}</TableCell>
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
                            <TableCell className="max-w-[16rem] truncate">
                              {tx.description ?? '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                          {/* DECOUPLED FROM THE LEDGER BADGES ON PURPOSE — DO NOT MERGE
                              THESE BACK ONTO ops.ledger.directionIn / directionOut.
                              These headers describe a PERSON'S STATE: بستانکار / بدهکار.
                              The badges in the table above describe an ENTRY'S NATURE:
                              بستانکاری / بدهکاری. The two differ by a single letter (ی) and
                              are genuinely different words, so anyone tidying this file will
                              read one pair as a typo of the other and "fix" it. They shared
                              one key until item 6; changing the shared value to suit either
                              screen silently corrupted the other, which is why they are now
                              separate keys rather than one. */}
                          <TableHead className="text-end">
                            {t('ops.ledger.balanceCreditor', { defaultValue: 'Creditor' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('ops.ledger.balanceDebtor', { defaultValue: 'Debtor' })}
                          </TableHead>
                          <TableHead className="text-end">
                            {t('ops.ledger.balanceCol', { defaultValue: 'Running balance' })}
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
                  <Select
                    value={draft.flowType || undefined}
                    onValueChange={(v) => setDraft({ ...draft, flowType: v })}
                    disabled={flowTypesFailed}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('ops.ledger.form.flowTypeSelectPlaceholder', {
                          defaultValue: 'Select a type',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {flowTypeList.map((ft) => (
                        <SelectItem key={ft.code} value={ft.code}>
                          {flowTypeLabel(ft.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {flowTypesFailed ? (
                    <p className="text-xs text-destructive">
                      {t('ops.ledger.form.flowTypesUnavailable', {
                        defaultValue: "Flow types could not be loaded, so an entry can't be recorded right now.",
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('ops.ledger.form.flowTypeHint', {
                        defaultValue: 'If the type you need is not in this list, write the actual type in Description.',
                      })}
                    </p>
                  )}
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
