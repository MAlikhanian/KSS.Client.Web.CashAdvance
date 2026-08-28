import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listChargeRequests,
  createChargeRequest,
  updateChargeRequest,
  removeChargeRequest,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/charge-requests — list all recharge requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listChargeRequests(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing charge requests');
  }
}

// POST /api/cash-advance/charge-requests — create a recharge request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createChargeRequest(session.accessToken, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'creating charge request');
  }
}

// PUT /api/cash-advance/charge-requests — update a recharge request
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateChargeRequest(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating charge request');
  }
}

// DELETE /api/cash-advance/charge-requests — remove a recharge request (body = full entity)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeChargeRequest(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting charge request');
  }
}
