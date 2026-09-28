import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listInvoices,
  createInvoice,
  updateInvoice,
  removeInvoice,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/invoices — list all invoices
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listInvoices(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing invoices');
  }
}

// POST /api/cash-advance/invoices — create an invoice
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createInvoice(session.accessToken, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'creating invoice');
  }
}

// PUT /api/cash-advance/invoices — update an invoice
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateInvoice(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating invoice');
  }
}

// DELETE /api/cash-advance/invoices — remove an invoice (body = full entity)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeInvoice(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting invoice');
  }
}
