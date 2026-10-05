import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listSelectableItems } from '@/services/cash-advance-api';

// GET /api/cash-advance/charge-request-items/selectable?cashAdvanceId=&excludeInvoiceId=
// Items an invoice can be linked to in one fund, with their linked and remaining amounts. The
// scoping (own items, or all with Request.ReadAll) is done by the backend, not here.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const cashAdvanceId = req.nextUrl.searchParams.get('cashAdvanceId') ?? '';
    if (!cashAdvanceId) {
      return NextResponse.json({ message: 'cashAdvanceId is required' }, { status: 400 });
    }
    const excludeInvoiceId = req.nextUrl.searchParams.get('excludeInvoiceId');
    return NextResponse.json(
      await listSelectableItems(session.accessToken, cashAdvanceId, excludeInvoiceId),
    );
  } catch (error) {
    return apiErrorResponse(error, 'listing selectable charge request items');
  }
}
