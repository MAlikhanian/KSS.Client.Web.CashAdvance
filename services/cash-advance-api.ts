/**
 * KSS Cash Advance Service (KSS.Service.CashAdvance).
 * Server-side only. Base URL from CASHADVANCE_API_BASE_URL. JWT Bearer required.
 *
 * All entities use the generic BaseController routes:
 *   list   = GET    /Api/{Entity}/ToListAll
 *   create = POST   /Api/{Entity}/AddDto     (body = *AddDto*)
 *   update = PUT    /Api/{Entity}/UpdateDto  (body = *UpdateDto*)
 *   remove = DELETE /Api/{Entity}/Remove     (body = full entity/Dto object)
 * JSON is camelCase (System.Text.Json web defaults).
 */

function getBaseUrl(): string {
  const baseUrl = process.env.CASHADVANCE_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('CASHADVANCE_API_BASE_URL environment variable is required but not set.');
  }
  return baseUrl;
}

async function req<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.message) message = String(parsed.message);
    } catch {
      /* keep raw text */
    }
    throw new Error(message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ============================================
// Shared audit shape (read views)
// ============================================

interface AuditFields {
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  deletedBy: string | null;
  deletedAt: string | null;
}

// ============================================
// Product (کالا) — GUID key
// ============================================

export interface ProductView extends AuditFields {
  id: string;
  code: string;
  isActive: boolean;
}

export interface ProductInsert {
  code: string;
  isActive: boolean;
}

export interface ProductUpdate {
  id: string;
  code: string;
  isActive: boolean;
}

export const listProducts = (token: string) =>
  req<ProductView[]>(token, 'GET', `/Api/Product/ToListAll`);

export const createProduct = (token: string, dto: ProductInsert) =>
  req<ProductView>(token, 'POST', `/Api/Product/AddDto`, dto);

export const updateProduct = (token: string, dto: ProductUpdate) =>
  req<ProductView>(token, 'PUT', `/Api/Product/UpdateDto`, dto);

export const removeProduct = (token: string, entity: ProductView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/Product/Remove`, entity);

// ============================================
// ProductTranslation — composite key (productId + languageId)
// ============================================

export interface ProductTranslationView extends AuditFields {
  productId: string;
  languageId: number;
  name: string;
}

export interface ProductTranslationInsert {
  productId: string;
  languageId: number;
  name: string;
}

export interface ProductTranslationUpdate {
  productId: string;
  languageId: number;
  name: string;
}

export const listProductTranslations = (token: string) =>
  req<ProductTranslationView[]>(token, 'GET', `/Api/ProductTranslation/ToListAll`);

export const createProductTranslation = (token: string, dto: ProductTranslationInsert) =>
  req<ProductTranslationView>(token, 'POST', `/Api/ProductTranslation/AddDto`, dto);

export const updateProductTranslation = (token: string, dto: ProductTranslationUpdate) =>
  req<ProductTranslationView>(token, 'PUT', `/Api/ProductTranslation/UpdateDto`, dto);

export const removeProductTranslation = (
  token: string,
  entity: ProductTranslationView | { productId: string; languageId: number },
) => req<void>(token, 'DELETE', `/Api/ProductTranslation/Remove`, entity);

// ============================================
// Status — tinyint key, READ ONLY
// ============================================

export interface StatusView extends AuditFields {
  id: number;
  code: string;
  isActive: boolean;
}

export const listStatuses = (token: string) =>
  req<StatusView[]>(token, 'GET', `/Api/Status/ToListAll`);

// ============================================
// StatusTranslation — composite key, READ ONLY
// ============================================

export interface StatusTranslationView extends AuditFields {
  statusId: number;
  languageId: number;
  name: string;
}

export const listStatusTranslations = (token: string) =>
  req<StatusTranslationView[]>(token, 'GET', `/Api/StatusTranslation/ToListAll`);

// ============================================
// PaymentType — byte lookup, READ ONLY (Cash / BankTransfer / Cheque)
// ============================================

export interface PaymentTypeView extends AuditFields {
  id: number;
  code: string;
  isActive: boolean;
}

export const listPaymentTypes = (token: string) =>
  req<PaymentTypeView[]>(token, 'GET', `/Api/PaymentType/ToListAll`);

export interface PaymentTypeTranslationView extends AuditFields {
  paymentTypeId: number;
  languageId: number;
  name: string;
}

export const listPaymentTypeTranslations = (token: string) =>
  req<PaymentTypeTranslationView[]>(token, 'GET', `/Api/PaymentTypeTranslation/ToListAll`);

// ============================================
// CashAdvance (fund / tankhah) — GUID key
// ============================================

export interface CashAdvanceView extends AuditFields {
  id: string;
  code: string;
  amount: number;
  worksiteId: string;
  isActive: boolean;
}

export interface CashAdvanceInsert {
  code: string;
  amount: number;
  worksiteId: string;
  isActive: boolean;
}

export interface CashAdvanceUpdate {
  id: string;
  code: string;
  amount: number;
  worksiteId: string;
  isActive: boolean;
}

export const listCashAdvances = (token: string) =>
  req<CashAdvanceView[]>(token, 'GET', `/Api/CashAdvance/ToListAll`);

// Scoped by responsibility: every fund with Request.ReadAll, otherwise only the funds the
// caller is currently in charge of. For the new-request picker. The admin fund list above is
// deliberately left alone — the administration screens still show everything.
export const listMyCashAdvances = (token: string) =>
  req<CashAdvanceView[]>(token, 'GET', `/Api/CashAdvanceScopedRead/ListCashAdvances`);

export const createCashAdvance = (token: string, dto: CashAdvanceInsert) =>
  req<CashAdvanceView>(token, 'POST', `/Api/CashAdvance/AddDto`, dto);

export const updateCashAdvance = (token: string, dto: CashAdvanceUpdate) =>
  req<CashAdvanceView>(token, 'PUT', `/Api/CashAdvance/UpdateDto`, dto);

export const removeCashAdvance = (token: string, entity: CashAdvanceView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/CashAdvance/Remove`, entity);

// ============================================
// CashAdvanceTranslation — composite key (cashAdvanceId + languageId)
// ============================================

export interface CashAdvanceTranslationView extends AuditFields {
  cashAdvanceId: string;
  languageId: number;
  name: string;
}

export interface CashAdvanceTranslationInsert {
  cashAdvanceId: string;
  languageId: number;
  name: string;
}

export interface CashAdvanceTranslationUpdate {
  cashAdvanceId: string;
  languageId: number;
  name: string;
}

export const listCashAdvanceTranslations = (token: string) =>
  req<CashAdvanceTranslationView[]>(token, 'GET', `/Api/CashAdvanceTranslation/ToListAll`);

export const createCashAdvanceTranslation = (token: string, dto: CashAdvanceTranslationInsert) =>
  req<CashAdvanceTranslationView>(token, 'POST', `/Api/CashAdvanceTranslation/AddDto`, dto);

export const updateCashAdvanceTranslation = (token: string, dto: CashAdvanceTranslationUpdate) =>
  req<CashAdvanceTranslationView>(token, 'PUT', `/Api/CashAdvanceTranslation/UpdateDto`, dto);

export const removeCashAdvanceTranslation = (
  token: string,
  entity: CashAdvanceTranslationView | { cashAdvanceId: string; languageId: number },
) => req<void>(token, 'DELETE', `/Api/CashAdvanceTranslation/Remove`, entity);

// ============================================
// CashAdvanceInCharge — GUID key, history rows (current = toDate null)
// ============================================

export interface CashAdvanceInChargeView extends AuditFields {
  id: string;
  cashAdvanceId: string;
  personId: string;
  fromDate: string;
  toDate: string | null;
}

export interface CashAdvanceInChargeInsert {
  cashAdvanceId: string;
  personId: string;
  fromDate: string;
  toDate?: string | null;
}

export interface CashAdvanceInChargeUpdate {
  id: string;
  personId: string;
  fromDate: string;
  toDate?: string | null;
}

export const listCashAdvanceInCharges = (token: string) =>
  req<CashAdvanceInChargeView[]>(token, 'GET', `/Api/CashAdvanceInCharge/ToListAll`);

export const createCashAdvanceInCharge = (token: string, dto: CashAdvanceInChargeInsert) =>
  req<CashAdvanceInChargeView>(token, 'POST', `/Api/CashAdvanceInCharge/AddDto`, dto);

export const updateCashAdvanceInCharge = (token: string, dto: CashAdvanceInChargeUpdate) =>
  req<CashAdvanceInChargeView>(token, 'PUT', `/Api/CashAdvanceInCharge/UpdateDto`, dto);

export const removeCashAdvanceInCharge = (
  token: string,
  entity: CashAdvanceInChargeView | { id: string },
) => req<void>(token, 'DELETE', `/Api/CashAdvanceInCharge/Remove`, entity);

// ============================================
// CashAdvancePerson (per-person limit profile) — personId key
// ============================================

export interface CashAdvancePersonView extends AuditFields {
  personId: string;
  maxAmount: number;
  isActive: boolean;
}

export interface CashAdvancePersonInsert {
  personId: string;
  maxAmount: number;
  isActive: boolean;
}

export interface CashAdvancePersonUpdate {
  personId: string;
  maxAmount: number;
  isActive: boolean;
}

export const listCashAdvancePersons = (token: string) =>
  req<CashAdvancePersonView[]>(token, 'GET', `/Api/CashAdvancePerson/ToListAll`);

export const createCashAdvancePerson = (token: string, dto: CashAdvancePersonInsert) =>
  req<CashAdvancePersonView>(token, 'POST', `/Api/CashAdvancePerson/AddDto`, dto);

export const updateCashAdvancePerson = (token: string, dto: CashAdvancePersonUpdate) =>
  req<CashAdvancePersonView>(token, 'PUT', `/Api/CashAdvancePerson/UpdateDto`, dto);

export const removeCashAdvancePerson = (
  token: string,
  entity: CashAdvancePersonView | { personId: string },
) => req<void>(token, 'DELETE', `/Api/CashAdvancePerson/Remove`, entity);

// ============================================
// Phase 2/3 — Operations entities
// ============================================

// ============================================
// CashAdvanceChargeRequest (recharge request / درخواست شارژ) — GUID key
// ============================================

export interface ChargeRequestView extends AuditFields {
  id: string;
  cashAdvanceId: string;
  requesterPersonId: string;
  paymentDocumentId: string | null;
  paymentTypeId: number | null;
  paymentDate: string | null;
  requestNumber: string;
  amount: number;
  status: string;
  ceoStatusId: number;
  ceoStatusDescription: string | null;
  financialManagerStatusId: number;
  financialManagerStatusDescription: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
}

export interface ChargeRequestInsert {
  cashAdvanceId: string;
  requesterPersonId: string;
  requestNumber: string;
  amount: number;
  status?: string;
  requestedAt?: string | null;
}

export interface ChargeRequestUpdate {
  id: string;
  paymentDocumentId?: string | null;
  amount: number;
  status: string;
  ceoStatusId: number;
  ceoStatusDescription?: string | null;
  financialManagerStatusId: number;
  financialManagerStatusDescription?: string | null;
  requestedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
}

// Row-level scoped: returns every request only to callers holding
// CashAdvance.Request.ReadAll; a requester gets only their own. Do NOT switch this back to
// /Api/CashAdvanceChargeRequest/ToListAll — that endpoint returns everyone's rows.
export const listChargeRequests = (token: string) =>
  req<ChargeRequestView[]>(token, 'GET', `/Api/CashAdvanceScopedRead/ListChargeRequests`);

export const createChargeRequest = (token: string, dto: ChargeRequestInsert) =>
  req<ChargeRequestView>(token, 'POST', `/Api/CashAdvanceChargeRequest/AddDto`, dto);

export const updateChargeRequest = (token: string, dto: ChargeRequestUpdate) =>
  req<ChargeRequestView>(token, 'PUT', `/Api/CashAdvanceChargeRequest/UpdateDto`, dto);

export const removeChargeRequest = (token: string, entity: ChargeRequestView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/CashAdvanceChargeRequest/Remove`, entity);

// ============================================
// CashAdvanceChargeRequestItem (line item) — GUID key
// ============================================

export interface ChargeRequestItemView extends AuditFields {
  id: string;
  cashAdvanceChargeRequestId: string;
  productId: string;
  statusId: number;
  description: string | null;
  statusDescription: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ChargeRequestItemInsert {
  cashAdvanceChargeRequestId: string;
  productId: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ChargeRequestItemUpdate {
  id: string;
  productId: string;
  statusId: number;
  description?: string | null;
  statusDescription?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

// Row-level scoped: the caller's own items, or every item with Request.ReadAll. Do NOT use
// /Api/CashAdvanceChargeRequestItem/ToListAll — that endpoint returns everyone's rows.
export const listChargeRequestItems = (token: string) =>
  req<ChargeRequestItemView[]>(token, 'GET', `/Api/CashAdvanceScopedRead/ListChargeRequestItems`);

export const createChargeRequestItem = (token: string, dto: ChargeRequestItemInsert) =>
  req<ChargeRequestItemView>(token, 'POST', `/Api/CashAdvanceChargeRequestItem/AddDto`, dto);

export const updateChargeRequestItem = (token: string, dto: ChargeRequestItemUpdate) =>
  req<ChargeRequestItemView>(token, 'PUT', `/Api/CashAdvanceChargeRequestItem/UpdateDto`, dto);

export const removeChargeRequestItem = (
  token: string,
  entity: ChargeRequestItemView | { id: string },
) => req<void>(token, 'DELETE', `/Api/CashAdvanceChargeRequestItem/Remove`, entity);

// ── Charge-request management (multi-table: request + items + fund ceiling) ──
// The requester is taken from the JWT by the backend; the amount is Σ items and
// must stay below the fund's ceiling. Item add/edit/remove roll the amount up.

export interface ChargeRequestItemSeed {
  productId: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
}

export interface CreateChargeRequestWithItems {
  cashAdvanceId: string;
  items: ChargeRequestItemSeed[];
}

export const createChargeRequestWithItems = (token: string, dto: CreateChargeRequestWithItems) =>
  req<ChargeRequestView>(
    token,
    'POST',
    `/Api/CashAdvanceChargeRequestManagement/CreateWithItems`,
    dto,
  );

export const addChargeRequestItemManaged = (token: string, dto: ChargeRequestItemInsert) =>
  req<ChargeRequestItemView>(
    token,
    'POST',
    `/Api/CashAdvanceChargeRequestManagement/AddItem`,
    dto,
  );

export const updateChargeRequestItemManaged = (token: string, dto: ChargeRequestItemUpdate) =>
  req<ChargeRequestItemView>(
    token,
    'PUT',
    `/Api/CashAdvanceChargeRequestManagement/UpdateItem`,
    dto,
  );

export const removeChargeRequestItemManaged = (token: string, id: string) =>
  req<void>(token, 'DELETE', `/Api/CashAdvanceChargeRequestManagement/RemoveItem`, id);

// ============================================
// Invoice (factor / فاکتور) — GUID key
// ============================================

export interface InvoiceView extends AuditFields {
  id: string;
  cashAdvanceId: string;
  invoiceNumber: string | null;
  invoiceAmount: number;
  invoiceDate: string | null;
  description: string | null;
  isApproved: boolean;
  approvalState: string | null;
  // Two-stage approval (seed 1=Pending, 2=Approved, 3=Rejected)
  financialManagerStatusId: number;
  financialManagerStatusDescription: string | null;
  ceoStatusId: number;
  ceoStatusDescription: string | null;
  financialManagerApprovedAt: string | null;
  approvedAt: string | null;
  // Correction / rework loop
  correctionRequested: boolean;
  correctionNote: string | null;
  correctionRequestedAt: string | null;
}

export interface InvoiceInsert {
  cashAdvanceId: string;
  invoiceNumber?: string | null;
  invoiceAmount: number;
  invoiceDate?: string | null;
  description?: string | null;
}

export interface InvoiceUpdate {
  id: string;
  invoiceNumber?: string | null;
  invoiceAmount: number;
  invoiceDate?: string | null;
  description?: string | null;
  isApproved: boolean;
  approvalState?: string | null;
}

export const listInvoices = (token: string) =>
  req<InvoiceView[]>(token, 'GET', `/Api/Invoice/ToListAll`);

export const createInvoice = (token: string, dto: InvoiceInsert) =>
  req<InvoiceView>(token, 'POST', `/Api/Invoice/AddDto`, dto);

export const updateInvoice = (token: string, dto: InvoiceUpdate) =>
  req<InvoiceView>(token, 'PUT', `/Api/Invoice/UpdateDto`, dto);

export const removeInvoice = (token: string, entity: InvoiceView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/Invoice/Remove`, entity);

// ============================================
// InvoiceDocument (factor file) — GUID key
// ============================================

export interface InvoiceDocumentView extends AuditFields {
  id: string;
  invoiceId: string;
  documentId: string;
  statusId: number;
  statusDescription: string | null;
}

export interface InvoiceDocumentInsert {
  invoiceId: string;
  documentId: string;
}

export interface InvoiceDocumentUpdate {
  id: string;
  statusId: number;
  statusDescription?: string | null;
}

export const listInvoiceDocuments = (token: string) =>
  req<InvoiceDocumentView[]>(token, 'GET', `/Api/InvoiceDocument/ToListAll`);

export const createInvoiceDocument = (token: string, dto: InvoiceDocumentInsert) =>
  req<InvoiceDocumentView>(token, 'POST', `/Api/InvoiceDocument/AddDto`, dto);

export const updateInvoiceDocument = (token: string, dto: InvoiceDocumentUpdate) =>
  req<InvoiceDocumentView>(token, 'PUT', `/Api/InvoiceDocument/UpdateDto`, dto);

export const removeInvoiceDocument = (
  token: string,
  entity: InvoiceDocumentView | { id: string },
) => req<void>(token, 'DELETE', `/Api/InvoiceDocument/Remove`, entity);

// ============================================
// Document (stored-file metadata) — GUID key; Id is also the FileStorage blob ref
// ============================================

export interface DocumentView extends AuditFields {
  id: string;
  storageInstanceId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  isActive: boolean;
}

export interface DocumentInsert {
  storageInstanceId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export const listDocuments = (token: string) =>
  req<DocumentView[]>(token, 'GET', `/Api/Document/ToListAll`);

export const createDocument = (token: string, dto: DocumentInsert) =>
  req<DocumentView>(token, 'POST', `/Api/Document/AddDto`, dto);

export const removeDocument = (token: string, entity: DocumentView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/Document/Remove`, entity);

// ============================================
// InvoiceCashAdvanceChargeRequestItem (factor↔row link, junction)
// composite key (invoiceId + cashAdvanceChargeRequestItemId)
// ============================================

export interface InvoiceItemLinkView extends AuditFields {
  invoiceId: string;
  cashAdvanceChargeRequestItemId: string;
}

export interface InvoiceItemLinkInsert {
  invoiceId: string;
  cashAdvanceChargeRequestItemId: string;
}

export interface InvoiceItemLinkUpdate {
  invoiceId: string;
  cashAdvanceChargeRequestItemId: string;
}

export const listInvoiceItemLinks = (token: string) =>
  req<InvoiceItemLinkView[]>(token, 'GET', `/Api/InvoiceCashAdvanceChargeRequestItem/ToListAll`);

export const createInvoiceItemLink = (token: string, dto: InvoiceItemLinkInsert) =>
  req<InvoiceItemLinkView>(token, 'POST', `/Api/InvoiceCashAdvanceChargeRequestItem/AddDto`, dto);

export const updateInvoiceItemLink = (token: string, dto: InvoiceItemLinkUpdate) =>
  req<InvoiceItemLinkView>(token, 'PUT', `/Api/InvoiceCashAdvanceChargeRequestItem/UpdateDto`, dto);

export const removeInvoiceItemLink = (
  token: string,
  entity: InvoiceItemLinkView | { invoiceId: string; cashAdvanceChargeRequestItemId: string },
) => req<void>(token, 'DELETE', `/Api/InvoiceCashAdvanceChargeRequestItem/Remove`, entity);

// ============================================
// CashAdvanceTransaction (financial-flow ledger) — GUID key
// ============================================

export interface TransactionView extends AuditFields {
  id: string;
  cashAdvanceId: string;
  personId: string;
  sourceType: string | null;
  sourceId: string | null;
  flowType: string;
  direction: string;
  amount: number;
  balanceAfter: number | null;
  transactionDate: string;
  description: string | null;
}

export interface TransactionInsert {
  cashAdvanceId: string;
  personId: string;
  sourceType?: string | null;
  sourceId?: string | null;
  flowType: string;
  direction: string;
  amount: number;
  balanceAfter?: number | null;
  transactionDate: string;
  description?: string | null;
}

export interface TransactionUpdate {
  id: string;
  sourceType?: string | null;
  sourceId?: string | null;
  flowType: string;
  direction: string;
  amount: number;
  balanceAfter?: number | null;
  transactionDate: string;
  description?: string | null;
}

// Row-level scoped: full ledger only for callers holding CashAdvance.Ledger.ReadAll;
// a requester sees only their own transactions.
export const listTransactions = (token: string) =>
  req<TransactionView[]>(token, 'GET', `/Api/CashAdvanceScopedRead/ListTransactions`);

export const createTransaction = (token: string, dto: TransactionInsert) =>
  req<TransactionView>(token, 'POST', `/Api/CashAdvanceTransaction/AddDto`, dto);

export const updateTransaction = (token: string, dto: TransactionUpdate) =>
  req<TransactionView>(token, 'PUT', `/Api/CashAdvanceTransaction/UpdateDto`, dto);

export const removeTransaction = (token: string, entity: TransactionView | { id: string }) =>
  req<void>(token, 'DELETE', `/Api/CashAdvanceTransaction/Remove`, entity);

// ============================================
// Workflow (CashAdvanceWorkflowController) — per-actor, permission-gated actions
// ============================================

export interface SubmitRequestBody { requestId: string; }
export interface CeoItemDecisionBody { itemId: string; statusId: number; statusDescription?: string | null; }
export interface CeoRequestDecisionBody { requestId: string; statusId: number; statusDescription?: string | null; }
export interface FinancialManagerDecisionBody { requestId: string; statusId: number; statusDescription?: string | null; }
export interface InvoiceDocumentDecisionBody { invoiceDocumentId: string; statusId: number; statusDescription?: string | null; }
export interface RecordPaymentBody { requestId: string; documentId: string; paymentDate: string; paymentTypeId: number; }

export const submitRequest = (token: string, body: SubmitRequestBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/SubmitRequest`, body);

export const ceoDecideItem = (token: string, body: CeoItemDecisionBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/CeoDecideItem`, body);

export const ceoDecideRequest = (token: string, body: CeoRequestDecisionBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/CeoDecideRequest`, body);

export const financialManagerDecide = (token: string, body: FinancialManagerDecisionBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/FinancialManagerDecide`, body);

export const decideInvoiceDocument = (token: string, body: InvoiceDocumentDecisionBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/DecideInvoiceDocument`, body);

export const recordPayment = (token: string, body: RecordPaymentBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/RecordPayment`, body);

// ── Invoice submit (management: invoice + documents + item links in one call) ──
export interface SubmitInvoiceBody {
  cashAdvanceId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  invoiceDate: string | null;
  description: string | null;
  documentIds: string[];
  chargeRequestItemIds: string[];
}
export interface InvoiceDecisionBody {
  invoiceId: string;
  statusId: number;
  statusDescription?: string | null;
}

export const submitInvoice = (token: string, body: SubmitInvoiceBody) =>
  req<InvoiceView>(token, 'POST', `/Api/InvoiceManagement/SubmitInvoice`, body);

export const invoiceFinancialManagerDecide = (token: string, body: InvoiceDecisionBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/InvoiceFinancialManagerDecide`, body);

export const invoiceCeoDecide = (token: string, body: InvoiceDecisionBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/InvoiceCeoDecide`, body);

// ── Invoice correction / rework loop ──
export interface InvoiceCorrectionRequestBody {
  invoiceId: string;
  note: string;
}
export interface InvoiceUpdateFullBody {
  invoiceId: string;
  cashAdvanceId: string;
  invoiceNumber: string | null;
  invoiceAmount: number;
  invoiceDate: string | null;
  description: string | null;
  documentIds: string[];
  chargeRequestItemIds: string[];
}

export const invoiceFinancialManagerRequestCorrection = (
  token: string,
  body: InvoiceCorrectionRequestBody,
) =>
  req<unknown>(
    token,
    'POST',
    `/Api/CashAdvanceWorkflow/InvoiceFinancialManagerRequestCorrection`,
    body,
  );

export const invoiceCeoRequestCorrection = (token: string, body: InvoiceCorrectionRequestBody) =>
  req<unknown>(token, 'POST', `/Api/CashAdvanceWorkflow/InvoiceCeoRequestCorrection`, body);

export const updateInvoiceFull = (token: string, body: InvoiceUpdateFullBody) =>
  req<InvoiceView>(token, 'POST', `/Api/InvoiceManagement/UpdateInvoice`, body);
