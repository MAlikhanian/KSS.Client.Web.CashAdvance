import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listCashAdvanceTranslations,
  createCashAdvanceTranslation,
  updateCashAdvanceTranslation,
  removeCashAdvanceTranslation,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/cash-advance-translations — list all fund translations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listCashAdvanceTranslations(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing fund translations');
  }
}

// POST /api/cash-advance/cash-advance-translations — create a fund translation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createCashAdvanceTranslation(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating fund translation');
  }
}

// PUT /api/cash-advance/cash-advance-translations — update a fund translation
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateCashAdvanceTranslation(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating fund translation');
  }
}

// DELETE /api/cash-advance/cash-advance-translations — remove a fund translation
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeCashAdvanceTranslation(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting fund translation');
  }
}
