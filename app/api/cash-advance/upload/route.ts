import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { getAvailableInstance, uploadFile } from '@/services/file-orchestrator-api';
import { createDocument } from '@/services/cash-advance-api';

// Storage category used to route Cash Advance invoice-document / payment-receipt files.
const CATEGORY = 'CashAdvanceDocument';

/**
 * POST /api/cash-advance/upload
 *
 * Create-row-first upload of a single Cash Advance file (invoice document or payment receipt):
 *   1. get an available storage instance for the category,
 *   2. create the Document metadata row — the backend stamps a v7 Id, which IS the
 *      FileStorage blob reference (no browser/BFF-minted guid),
 *   3. push the bytes through the FileOrchestrator under that Id.
 *
 * Returns the created Document. The caller then links it —
 * CashAdvanceChargeRequest.PaymentDocumentId (via record-payment) or InvoiceDocument.DocumentId.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ message: 'file is required' }, { status: 400 });
    }

    // 1. Pick a storage instance.
    const instance = await getAvailableInstance(session.accessToken, CATEGORY);

    // 2. Create the Document row — the backend owns the v7 Id (= the blob reference).
    const doc = await createDocument(session.accessToken, {
      storageInstanceId: instance.id,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type || 'application/octet-stream',
    });

    // 3. Upload the bytes under the Document Id.
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(session.accessToken, doc.id, CATEGORY, buffer);

    return NextResponse.json(doc);
  } catch (error) {
    return apiErrorResponse(error, 'uploading cash advance document');
  }
}
