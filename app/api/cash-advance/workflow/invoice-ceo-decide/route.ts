import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { invoiceCeoDecide } from '@/services/cash-advance-api';

// POST /api/cash-advance/workflow/invoice-ceo-decide — CEO invoice decision
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await invoiceCeoDecide(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'invoice CEO decision');
  }
}
