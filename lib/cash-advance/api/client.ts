/**
 * Cash Advance — client-side BFF wrappers.
 *
 * These run in the browser and call the BFF routes under /api/cash-advance/*.
 * The BFF attaches the caller's Bearer token and proxies to the backend.
 * Types are re-exported from the server service modules via `import type`
 * (no server-only code is bundled into the client).
 */

import type {
  ProductView,
  ProductInsert,
  ProductUpdate,
  ProductTranslationView,
  ProductTranslationInsert,
  ProductTranslationUpdate,
  StatusView,
  StatusTranslationView,
  PaymentTypeView,
  PaymentTypeTranslationView,
  CashAdvanceView,
  CashAdvanceInsert,
  CashAdvanceUpdate,
  CashAdvanceTranslationView,
  CashAdvanceTranslationInsert,
  CashAdvanceTranslationUpdate,
  CashAdvanceInChargeView,
  CashAdvanceInChargeInsert,
  CashAdvanceInChargeUpdate,
  CashAdvancePersonView,
  CashAdvancePersonInsert,
  CashAdvancePersonUpdate,
  ChargeRequestView,
  ChargeRequestInsert,
  ChargeRequestUpdate,
  ChargeRequestItemView,
  ChargeRequestItemInsert,
  ChargeRequestItemUpdate,
  ChargeRequestItemSeed,
  CreateChargeRequestWithItems,
  InvoiceView,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceDocumentView,
  InvoiceDocumentInsert,
  InvoiceDocumentUpdate,
  DocumentView,
  DocumentInsert,
  InvoiceItemLinkView,
  InvoiceItemLinkInsert,
  InvoiceItemLinkUpdate,
  TransactionView,
  TransactionInsert,
  TransactionUpdate,
  FlowTypeView,
} from '@/services/cash-advance-api';
import type {
  WorksiteView,
  WorksiteTranslationView,
  ProjectView,
  ProjectTranslationView,
} from '@/services/project-api';
import type { PersonDirectoryRecord } from '@/services/person-api';

export type {
  ProductView,
  ProductInsert,
  ProductUpdate,
  ProductTranslationView,
  ProductTranslationInsert,
  ProductTranslationUpdate,
  StatusView,
  StatusTranslationView,
  PaymentTypeView,
  PaymentTypeTranslationView,
  CashAdvanceView,
  CashAdvanceInsert,
  CashAdvanceUpdate,
  CashAdvanceTranslationView,
  CashAdvanceTranslationInsert,
  CashAdvanceTranslationUpdate,
  CashAdvanceInChargeView,
  CashAdvanceInChargeInsert,
  CashAdvanceInChargeUpdate,
  CashAdvancePersonView,
  CashAdvancePersonInsert,
  CashAdvancePersonUpdate,
  ChargeRequestView,
  ChargeRequestInsert,
  ChargeRequestUpdate,
  ChargeRequestItemView,
  ChargeRequestItemInsert,
  ChargeRequestItemUpdate,
  ChargeRequestItemSeed,
  CreateChargeRequestWithItems,
  InvoiceView,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceDocumentView,
  InvoiceDocumentInsert,
  InvoiceDocumentUpdate,
  DocumentView,
  DocumentInsert,
  InvoiceItemLinkView,
  InvoiceItemLinkInsert,
  InvoiceItemLinkUpdate,
  TransactionView,
  TransactionInsert,
  TransactionUpdate,
  FlowTypeView,
  WorksiteView,
  WorksiteTranslationView,
  ProjectView,
  ProjectTranslationView,
  PersonDirectoryRecord,
};

/**
 * This zone's OWN BFF routes, reached THROUGH the Shell.
 *
 * Must carry the basePath. The Shell's middleware routes on the FIRST path
 * segment, so a root-relative '/api/cash-advance/...' has segment "api", is
 * never a zone key, and is therefore answered by the SHELL — which no longer
 * has these routes (its copy was deleted 2026-08-27). With the prefix the
 * segment is "cash-advance", the middleware rewrites here, and this app serves
 * them from app/api/cash-advance/**.
 *
 * Note this does NOT apply to Shell-owned BFF (/api/person, /api/company,
 * /api/auth, /api/brokerages, /api/funds, /api/company-context). Those are
 * deliberately root-relative so the Shell keeps answering them.
 */
const RAW_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const ZONE_PREFIX = RAW_BASE_PATH.startsWith('/') && RAW_BASE_PATH !== '/'
  ? RAW_BASE_PATH.replace(/\/+$/, '')
  : '';
const BASE = `${ZONE_PREFIX}/api/cash-advance`;

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const parsed = await res.json();
      if (parsed?.message) message = String(parsed.message);
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Products ──
export const listProducts = () => http<ProductView[]>('GET', '/products');
export const createProduct = (dto: ProductInsert) => http<ProductView>('POST', '/products', dto);
export const updateProduct = (dto: ProductUpdate) => http<ProductView>('PUT', '/products', dto);
export const removeProduct = (entity: ProductView | { id: string }) =>
  http<void>('DELETE', '/products', entity);

// ── Product translations ──
export const listProductTranslations = () =>
  http<ProductTranslationView[]>('GET', '/product-translations');
export const createProductTranslation = (dto: ProductTranslationInsert) =>
  http<ProductTranslationView>('POST', '/product-translations', dto);
export const updateProductTranslation = (dto: ProductTranslationUpdate) =>
  http<ProductTranslationView>('PUT', '/product-translations', dto);
export const removeProductTranslation = (
  entity: ProductTranslationView | { productId: string; languageId: number },
) => http<void>('DELETE', '/product-translations', entity);

// ── Statuses (read only) ──
export const listStatuses = () => http<StatusView[]>('GET', '/statuses');

// ── Status translations (read only) ──
export const listStatusTranslations = () =>
  http<StatusTranslationView[]>('GET', '/status-translations');

// ── Payment types (read only) ──
export interface PaymentTypesResponse {
  paymentTypes: PaymentTypeView[];
  translations: PaymentTypeTranslationView[];
}
export const listPaymentTypes = () => http<PaymentTypesResponse>('GET', '/payment-types');

// ── Funds (CashAdvance) ──
export const listFunds = () => http<CashAdvanceView[]>('GET', '/funds');
// Funds the caller may raise a request against — scoped server-side by who is currently in
// charge. Use this on the new-request page; listFunds stays for the fund administration
// screens and the navbar, which are meant to show everything.
export const listMyFunds = () => http<CashAdvanceView[]>('GET', '/funds/my');
export const createFund = (dto: CashAdvanceInsert) => http<CashAdvanceView>('POST', '/funds', dto);
export const updateFund = (dto: CashAdvanceUpdate) => http<CashAdvanceView>('PUT', '/funds', dto);
export const removeFund = (entity: CashAdvanceView | { id: string }) =>
  http<void>('DELETE', '/funds', entity);

// ── Fund translations (CashAdvanceTranslation) ──
export const listFundTranslations = () =>
  http<CashAdvanceTranslationView[]>('GET', '/cash-advance-translations');
export const createFundTranslation = (dto: CashAdvanceTranslationInsert) =>
  http<CashAdvanceTranslationView>('POST', '/cash-advance-translations', dto);
export const updateFundTranslation = (dto: CashAdvanceTranslationUpdate) =>
  http<CashAdvanceTranslationView>('PUT', '/cash-advance-translations', dto);
export const removeFundTranslation = (
  entity: CashAdvanceTranslationView | { cashAdvanceId: string; languageId: number },
) => http<void>('DELETE', '/cash-advance-translations', entity);

// ── Keyed deletes (by key only) ──
// Use these for deleting products, product names and fund names; the remove* wrappers above
// go through the generic Remove route, which is rejected for these rows. A product delete
// also deletes its names on the server, so callers make one call.
export const removeProductByKey = (key: { id: string }) =>
  http<void>('DELETE', '/keyed-delete/product', key);
export const removeProductNameByKey = (key: { productId: string; languageId: number }) =>
  http<void>('DELETE', '/keyed-delete/product-name', key);
export const removeFundNameByKey = (key: { cashAdvanceId: string; languageId: number }) =>
  http<void>('DELETE', '/keyed-delete/fund-name', key);

// ── In-charges (CashAdvanceInCharge) ──
export const listInCharges = () => http<CashAdvanceInChargeView[]>('GET', '/in-charges');
export const createInCharge = (dto: CashAdvanceInChargeInsert) =>
  http<CashAdvanceInChargeView>('POST', '/in-charges', dto);
export const updateInCharge = (dto: CashAdvanceInChargeUpdate) =>
  http<CashAdvanceInChargeView>('PUT', '/in-charges', dto);
export const removeInCharge = (entity: CashAdvanceInChargeView | { id: string }) =>
  http<void>('DELETE', '/in-charges', entity);

// ── Person limits (CashAdvancePerson) ──
export const listPersonLimits = () => http<CashAdvancePersonView[]>('GET', '/person-limits');
export const createPersonLimit = (dto: CashAdvancePersonInsert) =>
  http<CashAdvancePersonView>('POST', '/person-limits', dto);
export const updatePersonLimit = (dto: CashAdvancePersonUpdate) =>
  http<CashAdvancePersonView>('PUT', '/person-limits', dto);
export const removePersonLimit = (entity: CashAdvancePersonView | { personId: string }) =>
  http<void>('DELETE', '/person-limits', entity);

// ── Pickers ──
export interface WorksitesResponse {
  worksites: WorksiteView[];
  translations: WorksiteTranslationView[];
}
export const listWorksites = () => http<WorksitesResponse>('GET', '/worksites');

export interface ProjectsResponse {
  projects: ProjectView[];
  translations: ProjectTranslationView[];
}
export const listProjects = () => http<ProjectsResponse>('GET', '/projects');

export const listPersons = (query?: string) =>
  http<PersonDirectoryRecord[]>(
    'GET',
    query ? `/persons?query=${encodeURIComponent(query)}` : '/persons',
  );

// ── Charge requests (CashAdvanceChargeRequest) ──
export const listChargeRequests = () =>
  http<ChargeRequestView[]>('GET', '/charge-requests');
export const createChargeRequest = (dto: ChargeRequestInsert) =>
  http<ChargeRequestView>('POST', '/charge-requests', dto);
/**
 * Create a recharge request from a fund + its line items in one call. Requester
 * (current user), request number, date and amount (= Σ items, must be under the
 * fund ceiling) are all set by the backend.
 */
export const createChargeRequestWithItems = (dto: CreateChargeRequestWithItems) =>
  http<ChargeRequestView>('POST', '/charge-requests/create-with-items', dto);
export const updateChargeRequest = (dto: ChargeRequestUpdate) =>
  http<ChargeRequestView>('PUT', '/charge-requests', dto);
export const removeChargeRequest = (entity: ChargeRequestView | { id: string }) =>
  http<void>('DELETE', '/charge-requests', entity);

// ── Charge request items (CashAdvanceChargeRequestItem) ──
export const listChargeRequestItems = () =>
  http<ChargeRequestItemView[]>('GET', '/charge-request-items');
export const createChargeRequestItem = (dto: ChargeRequestItemInsert) =>
  http<ChargeRequestItemView>('POST', '/charge-request-items', dto);
export const updateChargeRequestItem = (dto: ChargeRequestItemUpdate) =>
  http<ChargeRequestItemView>('PUT', '/charge-request-items', dto);
export const removeChargeRequestItem = (entity: ChargeRequestItemView | { id: string }) =>
  http<void>('DELETE', '/charge-request-items', entity);

// ── Invoices (Invoice) ──
export const listInvoices = () => http<InvoiceView[]>('GET', '/invoices');
export const createInvoice = (dto: InvoiceInsert) =>
  http<InvoiceView>('POST', '/invoices', dto);
export const updateInvoice = (dto: InvoiceUpdate) =>
  http<InvoiceView>('PUT', '/invoices', dto);
export const removeInvoice = (entity: InvoiceView | { id: string }) =>
  http<void>('DELETE', '/invoices', entity);

// ── Invoice documents (InvoiceDocument) ──
export const listInvoiceDocuments = () =>
  http<InvoiceDocumentView[]>('GET', '/invoice-documents');
export const createInvoiceDocument = (dto: InvoiceDocumentInsert) =>
  http<InvoiceDocumentView>('POST', '/invoice-documents', dto);
export const updateInvoiceDocument = (dto: InvoiceDocumentUpdate) =>
  http<InvoiceDocumentView>('PUT', '/invoice-documents', dto);
export const removeInvoiceDocument = (entity: InvoiceDocumentView | { id: string }) =>
  http<void>('DELETE', '/invoice-documents', entity);

// ── Invoice↔row links (InvoiceCashAdvanceChargeRequestItem — junction) ──
export const listInvoiceItemLinks = () =>
  http<InvoiceItemLinkView[]>('GET', '/invoice-item-links');
export const createInvoiceItemLink = (dto: InvoiceItemLinkInsert) =>
  http<InvoiceItemLinkView>('POST', '/invoice-item-links', dto);
export const updateInvoiceItemLink = (dto: InvoiceItemLinkUpdate) =>
  http<InvoiceItemLinkView>('PUT', '/invoice-item-links', dto);
export const removeInvoiceItemLink = (
  entity: InvoiceItemLinkView | { invoiceId: string; cashAdvanceChargeRequestItemId: string },
) => http<void>('DELETE', '/invoice-item-links', entity);

// ── Transactions (CashAdvanceTransaction — append-only ledger; GET + POST) ──
export const listTransactions = () => http<TransactionView[]>('GET', '/transactions');
export const createTransaction = (dto: TransactionInsert) =>
  http<TransactionView>('POST', '/transactions', dto);

// ── Flow types (read only; the one list the server also validates against) ──
export const listFlowTypes = () => http<FlowTypeView[]>('GET', '/flow-types');

// ── Documents (stored-file metadata) + upload/download (→ FileOrchestrator) ──
export const listCashAdvanceDocuments = () => http<DocumentView[]>('GET', '/documents');

/** URL that streams/downloads a stored file by its Document id (disposition set by the BFF). */
export const cashAdvanceDocumentFileUrl = (documentId: string) =>
  `${BASE}/documents/${documentId}/file`;

/**
 * Upload a single Cash Advance invoice-document / payment-receipt file through the BFF. It
 * creates the Document row (backend v7 Id = the blob reference) and pushes the
 * bytes to the FileOrchestrator. Returns the created Document — store its `id` on
 * the owner (InvoiceDocument.documentId, or the request via record-payment).
 */
export async function uploadCashAdvanceDocument(file: File): Promise<DocumentView> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  if (!res.ok) {
    let message = `Upload failed: ${res.status}`;
    try {
      const parsed = await res.json();
      if (parsed?.message) message = String(parsed.message);
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return (await res.json()) as DocumentView;
}

// ── Workflow (per-actor, permission-gated) ──
export interface SubmitRequestBody { requestId: string; }
export interface CeoItemDecisionBody { itemId: string; statusId: number; statusDescription?: string | null; }
export interface CeoRequestDecisionBody { requestId: string; statusId: number; statusDescription?: string | null; }
export interface FinancialManagerDecisionBody { requestId: string; statusId: number; statusDescription?: string | null; }
export interface InvoiceDocumentDecisionBody { invoiceDocumentId: string; statusId: number; statusDescription?: string | null; }
export interface RecordPaymentBody { requestId: string; documentId: string; paymentDate: string; paymentTypeId: number; }

export const submitRequest = (body: SubmitRequestBody) =>
  http<void>('POST', '/workflow/submit-request', body);
export const ceoDecideItem = (body: CeoItemDecisionBody) =>
  http<void>('POST', '/workflow/ceo-decide-item', body);
export const ceoDecideRequest = (body: CeoRequestDecisionBody) =>
  http<void>('POST', '/workflow/ceo-decide-request', body);
export const financialManagerDecide = (body: FinancialManagerDecisionBody) =>
  http<void>('POST', '/workflow/financial-manager-decide', body);
export const decideInvoiceDocument = (body: InvoiceDocumentDecisionBody) =>
  http<void>('POST', '/workflow/decide-invoice-document', body);
export const recordPayment = (body: RecordPaymentBody) =>
  http<void>('POST', '/workflow/record-payment', body);

// ── Invoice submit + two-stage approval ──
export interface SubmitInvoiceBody {
  cashAdvanceId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  invoiceDate: string | null;
  description: string | null;
  documentIds: string[];
  chargeRequestItemIds: string[];
}
export interface InvoiceDecisionBody { invoiceId: string; statusId: number; statusDescription?: string | null; }

export const submitInvoice = (body: SubmitInvoiceBody) =>
  http<InvoiceView>('POST', '/invoice/submit', body);
export const invoiceFinancialManagerDecide = (body: InvoiceDecisionBody) =>
  http<void>('POST', '/workflow/invoice-fm-decide', body);
export const invoiceCeoDecide = (body: InvoiceDecisionBody) =>
  http<void>('POST', '/workflow/invoice-ceo-decide', body);

// ── Invoice correction / rework loop ──
export interface InvoiceCorrectionRequestBody { invoiceId: string; note: string; }
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

export const invoiceFinancialManagerRequestCorrection = (body: InvoiceCorrectionRequestBody) =>
  http<void>('POST', '/workflow/invoice-fm-request-correction', body);
export const invoiceCeoRequestCorrection = (body: InvoiceCorrectionRequestBody) =>
  http<void>('POST', '/workflow/invoice-ceo-request-correction', body);
export const updateInvoiceFull = (body: InvoiceUpdateFullBody) =>
  http<InvoiceView>('POST', '/invoice/update', body);
