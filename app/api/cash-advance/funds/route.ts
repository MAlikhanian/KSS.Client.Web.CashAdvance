import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listCashAdvances,
  createCashAdvance,
  updateCashAdvance,
  removeCashAdvance,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/funds — list all cash advance funds
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listCashAdvances(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing funds');
  }
}

// POST /api/cash-advance/funds — create a fund
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createCashAdvance(session.accessToken, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'creating fund');
  }
}

// PUT /api/cash-advance/funds — update a fund
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateCashAdvance(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating fund');
  }
}

// DELETE /api/cash-advance/funds — remove a fund (body = full entity)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeCashAdvance(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting fund');
  }
}
