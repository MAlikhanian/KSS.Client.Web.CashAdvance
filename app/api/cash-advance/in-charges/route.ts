import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listCashAdvanceInCharges,
  createCashAdvanceInCharge,
  updateCashAdvanceInCharge,
  removeCashAdvanceInCharge,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/in-charges — list all in-charge assignments
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listCashAdvanceInCharges(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing in-charge assignments');
  }
}

// POST /api/cash-advance/in-charges — assign an in-charge person
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createCashAdvanceInCharge(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating in-charge assignment');
  }
}

// PUT /api/cash-advance/in-charges — update an in-charge assignment
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateCashAdvanceInCharge(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating in-charge assignment');
  }
}

// DELETE /api/cash-advance/in-charges — remove an in-charge assignment
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeCashAdvanceInCharge(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting in-charge assignment');
  }
}
