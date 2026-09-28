import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listInvoiceDocuments,
  createInvoiceDocument,
  updateInvoiceDocument,
  removeInvoiceDocument,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/invoice-documents — list all invoice documents
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listInvoiceDocuments(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing invoice documents');
  }
}

// POST /api/cash-advance/invoice-documents — link an uploaded invoice document to an invoice
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createInvoiceDocument(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating invoice document');
  }
}

// PUT /api/cash-advance/invoice-documents — update invoice-document status (FM review)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateInvoiceDocument(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating invoice document');
  }
}

// DELETE /api/cash-advance/invoice-documents — remove an invoice document (body = full entity)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeInvoiceDocument(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting invoice document');
  }
}
