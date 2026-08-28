import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listChargeRequestItems,
  addChargeRequestItemManaged,
  updateChargeRequestItemManaged,
  removeChargeRequestItemManaged,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/charge-request-items — list all charge-request line items
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listChargeRequestItems(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing charge request items');
  }
}

// POST /api/cash-advance/charge-request-items — add a line item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await addChargeRequestItemManaged(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating charge request item');
  }
}

// PUT /api/cash-advance/charge-request-items — update a line item
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateChargeRequestItemManaged(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating charge request item');
  }
}

// DELETE /api/cash-advance/charge-request-items — remove a line item (body = full entity)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    // Client sends the full item (or { id }); the managed endpoint keys off the id.
    await removeChargeRequestItemManaged(session.accessToken, body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting charge request item');
  }
}
