'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Printer } from 'lucide-react';
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
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { usePermission } from '@/hooks/use-permission';
import {
  listInvoices,
  listFunds,
  listMyFunds,
  listFundTranslations,
  listWorksites,
  listProjects,
  type InvoiceView,
  type CashAdvanceView,
  type CashAdvanceTranslationView,
  type WorksiteView,
  type ProjectView,
  type ProjectTranslationView,
} from '@/lib/cash-advance/api/client';
import { formatDate, formatRial } from '@/lib/cash-advance/format';
import { FundPicker, fundDisplayName } from '@/components/common/fund-picker';
import { COVER_PRINT_CSS } from './print-css';

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

/** invoiceDate may arrive as a full ISO timestamp; compare on the date part only. */
const dayOf = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

/**
 * Fully approved = the CEO has approved. Approval is strictly sequential — the financial
 * manager must approve before the CEO can — so ceoStatusId === 2 (seed: 1=Pending,
 * 2=Approved, 3=Rejected) implies both stages passed.
 *
 * DO NOT "SIMPLIFY" THIS TO `i.isApproved`. THAT FIELD IS WRONG HERE, NOT MERELY UNUSED.
 * `isApproved` is written true once and is never reset, so after a reversed decision it
 * still reads true while ceoStatusId has moved to 3. Switching to it would silently put
 * reversed-decision invoices onto a signed financial document — a defect nobody reviewing
 * the diff would see, because `isApproved` is the obviously-named field and this looks like
 * a magic number. It is not. ceoStatusId is the one that tracks current state.
 */
const isCeoApproved = (i: InvoiceView): boolean => i.ceoStatusId === 2;

export function CoverSheetContent() {
  const { t } = useTranslation('cash-advance');
  const { language } = useLanguage();
  const langId = language.code === 'en' ? EN : FA;
  const { hasPermission } = usePermission();
  const canRead = hasPermission(['CashAdvance.Invoice.Read']);

  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [funds, setFunds] = useState<CashAdvanceView[]>([]);
  const [myFunds, setMyFunds] = useState<CashAdvanceView[]>([]);
  const [fundTranslations, setFundTranslations] = useState<CashAdvanceTranslationView[]>([]);
  const [worksites, setWorksites] = useState<WorksiteView[]>([]);
  const [projects, setProjects] = useState<ProjectView[]>([]);
  const [projectTranslations, setProjectTranslations] = useState<ProjectTranslationView[]>([]);

  // Whether the Project column is shown at all. Worksite and Project sit behind their own
  // permissions, separate from CashAdvance.Invoice.Read, and a caller can legitimately hold
  // the invoice permission and neither of those. Starts true so the common case never
  // flickers; a rejection below turns it off and the column is then absent ENTIRELY.
  const [showProject, setShowProject] = useState(true);

  const [fundFilter, setFundFilter] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadAll = useCallback(async () => {
    // THE SHEET — the four calls it cannot render without. A failure here IS a failed page
    // and is reported as one.
    try {
      const [inv, f, ft, mine] = await Promise.all([
        // Scoped server-side: every invoice with CashAdvance.Invoice.ReadAll, otherwise
        // only the caller's own. No client-side re-filtering on ownership belongs here.
        listInvoices(),
        listFunds(),
        listFundTranslations(),
        // Scoped server-side: the funds this person is in charge of, or all with
        // Request.ReadAll. Second authorised source for the picker — see selectableFunds.
        listMyFunds(),
      ]);
      setInvoices(inv);
      setFunds(f);
      setFundTranslations(ft);
      setMyFunds(mine);
    } catch {
      showError(t('ops.common.toasts.loadError', { defaultValue: 'Failed to load data' }));
      return;
    }

    // ONE COLUMN — settled separately, and deliberately silent on failure. These two sit
    // behind their own permissions and a caller may hold CashAdvance.Invoice.Read without
    // either. They previously shared the Promise.all above, so a 403 on either emptied the
    // WHOLE SHEET: the customer saw a blank page for want of one optional column.
    //
    // Both must succeed for the column to mean anything — the name is reached
    // fund -> worksite.projectId -> project, so worksites alone or projects alone yields
    // nothing renderable. Either rejection therefore hides the column, which is why one
    // catch covers both rather than two independent flags.
    //
    // No toast. A caller without the permission is not looking at an error; they are looking
    // at a sheet that does not carry that column.
    try {
      const [ws, pr] = await Promise.all([listWorksites(), listProjects()]);
      // Only the worksite rows are needed — they are the hop from fund to projectId; the
      // worksite's own name is not shown on the sheet.
      setWorksites(ws.worksites);
      setProjects(pr.projects);
      setProjectTranslations(pr.translations);
      setShowProject(true);
    } catch {
      setWorksites([]);
      setProjects([]);
      setProjectTranslations([]);
      setShowProject(false);
    }
  }, [t]);

  // Gated on canRead so a caller without the permission issues NO requests at all. The
  // `if (!canRead)` early return below suppresses rendering only, and a guard placed after
  // the fetch would leave the calls firing — deliberately not copied from the view page.
  useEffect(() => {
    if (!canRead) return;
    loadAll();
  }, [loadAll, canRead]);

  // Offer the union of two SERVER-AUTHORISED sources: funds appearing in the scoped invoice
  // set, plus the funds this caller is in charge of. Neither is a client-side rule, so the
  // picker still cannot advertise a fund the caller is not entitled to — the guarantee is
  // preserved, it now just draws on two sources instead of one.
  //
  // THIS IS THE ADDITIVE HALF OF A CUSTOMER REQUEST. The same request contained two
  // REMOVALS, and both are deferred pending confirmation:
  //   1. a role list that would strip fund visibility from three roles that hold it today;
  //   2. the word "only", which would remove a holder's sight of her own past invoices on a
  //      fund she has since handed over.
  // Adding the union takes nothing away from anyone, which is why it could ship alone.
  // DO NOT "COMPLETE" THIS BY IMPLEMENTING THE REMOVALS — they are not pending work, they
  // are unconfirmed, and shipping them would be two silent subtractions.
  const selectableFunds = useMemo(() => {
    const allowed = new Set<string>(invoices.map((i) => i.cashAdvanceId));
    for (const f of myFunds) allowed.add(f.id);
    return funds.filter((f) => allowed.has(f.id));
  }, [invoices, myFunds, funds]);

  // Project is reached invoice -> fund.worksiteId -> worksite.projectId -> project. It is
  // therefore a property of the FUND, not of the invoice: every invoice drawn on one fund
  // carries the same project. On a sheet filtered to a single fund this column is constant
  // by construction. That is what the model says; the paper form appears to vary it per row,
  // and that discrepancy is deliberately left visible rather than papered over.
  const projectNameOfFund = useCallback(
    (fundId: string): string => {
      const fund = funds.find((f) => f.id === fundId);
      if (!fund) return '—';
      const worksite = worksites.find((w) => w.id === fund.worksiteId);
      if (!worksite) return '—';
      const rows = projectTranslations.filter((x) => x.projectId === worksite.projectId);
      const tr = rows.find((x) => x.languageId === langId) ?? rows[0];
      if (tr?.name) return tr.name;
      return projects.find((p) => p.id === worksite.projectId)?.code ?? '—';
    },
    [funds, worksites, projects, projectTranslations, langId],
  );

  const inFund = useCallback(
    (i: InvoiceView) => (fundFilter ? i.cashAdvanceId === fundFilter : true),
    [fundFilter],
  );

  const inPeriod = useCallback(
    (i: InvoiceView) => {
      const d = dayOf(i.invoiceDate);
      if (!d) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    },
    [fromDate, toDate],
  );

  // Dated invoices in the range REGARDLESS of approval. Not rendered — it exists only to
  // tell the two empty states apart: "no invoices at all here" vs "invoices here, none
  // approved". Those are different facts and reporting the first when the second is true
  // would be false on a sheet someone signs.
  const inPeriodAny = useMemo(
    () => invoices.filter(inFund).filter(inPeriod),
    [invoices, inFund, inPeriod],
  );

  // The sheet itself: CEO-approved dated invoices inside the range, oldest first.
  const rows = useMemo(
    () =>
      inPeriodAny
        .filter(isCeoApproved)
        .slice()
        .sort((a, b) => dayOf(a.invoiceDate).localeCompare(dayOf(b.invoiceDate))),
    [inPeriodAny],
  );

  // Invoices with no date cannot be placed in a period. They are neither silently dropped
  // nor silently counted: they are listed separately, outside the total, so the question
  // "what should happen to these?" is visible on the sheet rather than decided here.
  // Approval-filtered like the sheet, so this lists only invoices that WOULD have counted.
  const undated = useMemo(
    () => invoices.filter(inFund).filter((i) => !dayOf(i.invoiceDate)).filter(isCeoApproved),
    [invoices, inFund],
  );

  const total = useMemo(() => rows.reduce((s, i) => s + (i.invoiceAmount ?? 0), 0), [rows]);

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
      <style>{COVER_PRINT_CSS}</style>

      <Card className="print:hidden bg-amber-50/25! border-amber-100! dark:bg-amber-950/25! dark:border-amber-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle
                text={t('ops.coverSheet.title', { defaultValue: 'Cash Advance Cover Sheet' })}
              />
              <ToolbarDescription>
                {t('ops.coverSheet.description', {
                  defaultValue: 'Invoices for a fund over a period, oldest first.',
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
            <div className="print:hidden flex flex-wrap items-end gap-4 mb-5">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('ops.coverSheet.filters.fund', { defaultValue: 'Fund' })}
                </Label>
                <div className="w-64">
                  <FundPicker
                    funds={selectableFunds}
                    translations={fundTranslations}
                    value={fundFilter}
                    onChange={setFundFilter}
                    langId={langId}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('ops.coverSheet.filters.fromDate', { defaultValue: 'From Date' })}
                </Label>
                <div className="w-44">
                  <DatePickerComponent value={fromDate} onChange={setFromDate} forcePersian />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('ops.coverSheet.filters.toDate', { defaultValue: 'To Date' })}
                </Label>
                <div className="w-44">
                  <DatePickerComponent
                    value={toDate}
                    onChange={setToDate}
                    minDate={fromDate ? new Date(fromDate) : undefined}
                    forcePersian
                  />
                </div>
              </div>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" />
                {t('ops.coverSheet.print', { defaultValue: 'Print' })}
              </Button>
            </div>

            {/* Sheet heading — printed only, because on screen the controls above already
                say which fund and which period are selected. */}
            <div className="hidden print:block mb-4">
              <p className="text-base font-medium">
                {t('ops.coverSheet.title', { defaultValue: 'Cash Advance Cover Sheet' })}
              </p>
              <p className="text-xs">
                {fundFilter
                  ? fundDisplayName(fundFilter, fundTranslations, funds, langId)
                  : t('ops.coverSheet.allFunds', { defaultValue: 'All funds' })}
                {(fromDate || toDate) && ` — ${fromDate || '…'} / ${toDate || '…'}`}
              </p>
              {/* Same key as the on-screen heading, deliberately not a print-specific copy:
                  it states that the sheet is CEO-approved invoices only, and that scope must
                  be identical in both places or one of them is lying. */}
              <p className="text-xs">
                {t('ops.coverSheet.description', {
                  defaultValue:
                    'CEO-approved invoices for a fund over a period, oldest first.',
                })}
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    {t('ops.coverSheet.columns.row', { defaultValue: '#' })}
                  </TableHead>
                  {/* Blank box for marking off each line by hand on the printed sheet. */}
                  <TableHead className="hidden print:table-cell w-10 text-center">
                    {t('ops.coverSheet.columns.check', { defaultValue: '✓' })}
                  </TableHead>
                  <TableHead>
                    {t('ops.coverSheet.columns.date', { defaultValue: 'Date' })}
                  </TableHead>
                  <TableHead>
                    {t('ops.coverSheet.columns.invoiceNumber', { defaultValue: 'Invoice #' })}
                  </TableHead>
                  {showProject && (
                    <TableHead>
                      {t('ops.coverSheet.columns.project', { defaultValue: 'Project' })}
                    </TableHead>
                  )}
                  <TableHead>
                    {t('ops.coverSheet.columns.description', { defaultValue: 'Description' })}
                  </TableHead>
                  <TableHead className="text-end">
                    {t('ops.coverSheet.columns.amount', { defaultValue: 'Amount' })}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i, idx) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="hidden print:table-cell text-center">☐</TableCell>
                    <TableCell>{formatDate(i.invoiceDate)}</TableCell>
                    <TableCell className="font-medium">{i.invoiceNumber ?? '—'}</TableCell>
                    {showProject && (
                      <TableCell>{projectNameOfFund(i.cashAdvanceId)}</TableCell>
                    )}
                    <TableCell>{i.description ?? '—'}</TableCell>
                    <TableCell className="text-end font-mono text-xs">
                      {formatRial(i.invoiceAmount)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={showProject ? 7 : 6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {/* Two distinct facts, and reporting the wrong one on a sheet someone
                          signs would be false. "None here at all" vs "some here, none
                          CEO-approved" — inPeriodAny is what tells them apart. */}
                      {inPeriodAny.length > 0
                        ? t('ops.coverSheet.emptyUnapproved', {
                            defaultValue:
                              'Invoices exist in this period, but none are CEO-approved.',
                          })
                        : t('ops.coverSheet.empty', {
                            defaultValue: 'No invoices in this period',
                          })}
                    </TableCell>
                  </TableRow>
                )}
                {rows.length > 0 && (
                  <TableRow className="font-medium">
                    <TableCell colSpan={showProject ? 6 : 5} className="text-end">
                      {t('ops.coverSheet.total', { defaultValue: 'Total' })}
                    </TableCell>
                    <TableCell className="text-end font-mono text-xs">
                      {formatRial(total)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* EXCLUSION DISCLOSURE — must appear in PRINT, not only on screen.
                The detailed undated card below is screen-only, so without this the printed
                total would silently omit CEO-approved invoices that carry no date, on a
                document people sign. Rendered in both media, immediately under the total and
                above the signatures, so it cannot be signed around.
                It discloses the exclusion; it does NOT add them to the total — whether they
                belong in it is the customer's call, not ours. */}
            {undated.length > 0 && (
              <div className="print-keep mt-4 border border-black/30 p-3 text-xs">
                <p className="font-medium">
                  {t('ops.coverSheet.undated.title', { defaultValue: 'Invoices with no date' })}
                </p>
                <p>
                  {t('ops.coverSheet.undated.hint', {
                    defaultValue:
                      'These carry no invoice date, so they fall in no period and are not counted in the total.',
                  })}
                </p>
              </div>
            )}

            {/* Signature blocks — printed only, at the foot of the sheet, so they land after
                the last row wherever that falls. Order and labelling are what matter here;
                positions are deliberately NOT matched to the paper form's coordinates. */}
            {rows.length > 0 && (
              <div className="hidden print:grid print-keep grid-cols-3 gap-8 mt-16">
                {[
                  t('ops.coverSheet.signatures.ceo', { defaultValue: 'CEO' }),
                  t('ops.coverSheet.signatures.worksiteSupervisor', {
                    defaultValue: 'Worksite Supervisor',
                  }),
                  t('ops.coverSheet.signatures.fundInCharge', { defaultValue: 'Fund In Charge' }),
                ].map((role) => (
                  <div key={role} className="print-keep text-center">
                    <div className="h-16 border-b border-black/40" />
                    <p className="mt-2 text-xs">{role}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Undated invoices: an open product question, rendered rather than resolved.
            They carry no invoiceDate, so they belong to no period and are excluded from
            the sheet and its total above. Shown here with a count so the decision is
            visible to whoever is looking at the sheet. Absent entirely when there are none. */}
        {undated.length > 0 && (
          <Card className="print:hidden">
            <CardContent className="py-5">
              <div className="mb-3">
                <p className="text-sm font-medium text-foreground">
                  {t('ops.coverSheet.undated.title', { defaultValue: 'Invoices with no date' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('ops.coverSheet.undated.hint', {
                    defaultValue:
                      'These carry no invoice date, so they fall in no period and are not counted in the total above.',
                  })}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('ops.coverSheet.columns.invoiceNumber', { defaultValue: 'Invoice #' })}
                    </TableHead>
                    <TableHead>
                      {t('ops.coverSheet.columns.fund', { defaultValue: 'Fund' })}
                    </TableHead>
                    <TableHead>
                      {t('ops.coverSheet.columns.description', { defaultValue: 'Description' })}
                    </TableHead>
                    <TableHead className="text-end">
                      {t('ops.coverSheet.columns.amount', { defaultValue: 'Amount' })}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {undated.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.invoiceNumber ?? '—'}</TableCell>
                      <TableCell>
                        {fundDisplayName(i.cashAdvanceId, fundTranslations, funds, langId)}
                      </TableCell>
                      <TableCell>{i.description ?? '—'}</TableCell>
                      <TableCell className="text-end font-mono text-xs">
                        {formatRial(i.invoiceAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
