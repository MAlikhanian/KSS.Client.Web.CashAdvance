import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listInvoiceItemLinks,
  createInvoiceItemLink,
  updateInvoiceItemLink,
  removeInvoiceItemLink,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/invoice-item-links — list all invoice↔row links
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listInvoiceItemLinks(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing invoice item links');
  }
}

// POST /api/cash-advance/invoice-item-links — link an invoice to a charge-request row
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createInvoiceItemLink(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating invoice item link');
  }
}

// PUT /api/cash-advance/invoice-item-links — update an invoice↔row link (composite key)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateInvoiceItemLink(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating invoice item link');
  }
}

// DELETE /api/cash-advance/invoice-item-links — remove a link (body = full entity / composite key)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeInvoiceItemLink(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting invoice item link');
  }
}
