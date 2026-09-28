import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { invoiceCeoRequestCorrection } from '@/services/cash-advance-api';

// POST /api/cash-advance/workflow/invoice-ceo-request-correction — CEO requests invoice correction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(
      await invoiceCeoRequestCorrection(session.accessToken, body),
    );
  } catch (error) {
    return apiErrorResponse(error, 'invoice CEO correction request');
  }
}
