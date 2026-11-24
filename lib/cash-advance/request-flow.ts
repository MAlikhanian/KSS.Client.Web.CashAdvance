// Charge-request approval flow, as the server enforces it: the CEO decides, then the finance
// expert pays. The finance-manager column is kept on the record, but no step writes it any more:
// a request that already carries a finance-manager decision keeps it, and a finance-manager
// rejection still blocks payment.
//
// Status ids are passed in, never assumed, because the page resolves them from the status list.

export type FlowIds = { pendingId: number; approvedId: number; rejectedId: number };

export type PaymentGate = 'waitCeo' | 'fmRejected' | 'payable';

/** What the payment card offers the finance expert. */
export function paymentGate(
  req: { ceoStatusId: number; financialManagerStatusId: number },
  ids: FlowIds,
): PaymentGate {
  if (req.financialManagerStatusId === ids.rejectedId) return 'fmRejected';
  if (req.ceoStatusId !== ids.approvedId) return 'waitCeo';
  return 'payable';
}

/** The finance-manager row shows a dash while no decision exists (every new request). */
export function showFmStatus(fmStatusId: number, ids: FlowIds): boolean {
  return fmStatusId !== ids.pendingId;
}

type ItemLike = { statusId: number; deletedAt?: string | null };

/** True when the request has live items and every one of them is rejected. */
export function allLiveItemsRejected(items: ItemLike[], ids: FlowIds): boolean {
  const live = items.filter((it) => !it.deletedAt);
  return live.length > 0 && live.every((it) => it.statusId === ids.rejectedId);
}

/** Error codes the server sends for the request flow, and their texts' keys. */
const REQUEST_FLOW_ERROR_KEYS: Readonly<Record<string, string>> = {
  ALL_ITEMS_REJECTED: 'ops.requestDetail.flowErrors.allItemsRejected',
  FINANCIAL_MANAGER_REJECTED: 'ops.requestDetail.flowErrors.fmRejected',
  FM_STEP_REMOVED: 'ops.requestDetail.flowErrors.fmStepRemoved',
};
const LAST_ITEM_REJECT_KEY = 'ops.requestDetail.flowErrors.lastItemReject';

/**
 * The key for a request-flow error, or null when the code is not one of ours.
 * ALL_ITEMS_REJECTED reads differently on an item reject than on the request approval.
 */
export function requestFlowErrorKey(code: string, onItemReject = false): string | null {
  if (code === 'ALL_ITEMS_REJECTED' && onItemReject) return LAST_ITEM_REJECT_KEY;
  return Object.prototype.hasOwnProperty.call(REQUEST_FLOW_ERROR_KEYS, code)
    ? REQUEST_FLOW_ERROR_KEYS[code]
    : null;
}
