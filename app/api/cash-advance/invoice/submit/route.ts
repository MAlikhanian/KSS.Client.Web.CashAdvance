import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { submitInvoice } from '@/services/cash-advance-api';

// POST /api/cash-advance/invoice/submit — create invoice + documents + item links
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await submitInvoice(session.accessToken, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'submitting invoice');
  }
}
