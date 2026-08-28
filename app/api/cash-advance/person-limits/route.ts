import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listCashAdvancePersons,
  createCashAdvancePerson,
  updateCashAdvancePerson,
  removeCashAdvancePerson,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/person-limits — list all per-person limit profiles
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listCashAdvancePersons(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing person limits');
  }
}

// POST /api/cash-advance/person-limits — create a per-person limit profile
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createCashAdvancePerson(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating person limit');
  }
}

// PUT /api/cash-advance/person-limits — update a per-person limit profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateCashAdvancePerson(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating person limit');
  }
}

// DELETE /api/cash-advance/person-limits — remove a per-person limit profile
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeCashAdvancePerson(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting person limit');
  }
}
