import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listMyCashAdvances } from '@/services/cash-advance-api';

// GET /api/cash-advance/funds/my — funds the caller may raise a request against:
// every fund for holders of CashAdvance.Request.ReadAll, otherwise only the funds they are
// currently in charge of. The scoping is done by the backend, not here.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listMyCashAdvances(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing funds in charge');
  }
}
