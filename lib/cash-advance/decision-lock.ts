// What the invoice screens offer, kept in step with the server's gates. The server is the check;
// these only stop the pages offering an action it would refuse.
//
// - An invoice's Finance and CEO decisions stay open only while its CEO stage is pending. After
//   the CEO decides, the server refuses any further decision with INVOICE_DECISION_LOCKED.
// - A SETTLED invoice takes no action at all: no Finance or CEO decision, no correction request
//   and no correction, whatever its stage columns read.

// Status id of "pending" (the same value the workflow gates compare against).
export const STATUS_PENDING = 1;

// The refusal code, sent as the error message (single decisions) or as a row's error code (batch).
export const INVOICE_DECISION_LOCKED = 'INVOICE_DECISION_LOCKED';

// Settled, by the server's rule: approved (isApproved, the flag of the original single-stage
// approval, which older invoices can carry while both stage columns still read pending), or
// carrying a live ledger posting against the invoice. The posting half arrives as isSettled once
// the service sends it; until then isApproved alone decides, and an invoice settled only by a
// posting is still refused by the server.
type SettledFields = { isApproved: boolean; isSettled?: boolean | null };

export const invoiceSettled = (invoice: SettledFields) =>
  invoice.isApproved === true || invoice.isSettled === true;

export const decisionsOpen = (invoice: SettledFields & { ceoStatusId: number | null }) =>
  !invoiceSettled(invoice) && invoice.ceoStatusId === STATUS_PENDING;

// The submitter may correct (edit and resubmit) an invoice only while Finance has not decided it
// and it is not settled.
export const correctionOpen = (invoice: SettledFields & { financialManagerStatusId: number | null }) =>
  !invoiceSettled(invoice) && invoice.financialManagerStatusId === STATUS_PENDING;
