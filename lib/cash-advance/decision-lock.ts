// An invoice's Finance and CEO decisions stay open only while its CEO stage is pending. After the
// CEO decides, the server refuses any further decision with INVOICE_DECISION_LOCKED, so the pages
// stop offering one (single and bulk). The server is the check; this only keeps the UI in step.

// Status id of "pending" (the same value the workflow gates compare against).
export const STATUS_PENDING = 1;

// The refusal code, sent as the error message (single decisions) or as a row's error code (batch).
export const INVOICE_DECISION_LOCKED = 'INVOICE_DECISION_LOCKED';

export const decisionsOpen = (invoice: { ceoStatusId: number | null }) =>
  invoice.ceoStatusId === STATUS_PENDING;
