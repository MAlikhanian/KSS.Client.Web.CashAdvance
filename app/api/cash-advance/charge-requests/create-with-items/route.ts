import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { createChargeRequestWithItems } from '@/services/cash-advance-api';

// POST /api/cash-advance/charge-requests/create-with-items
// Create a recharge request from a single fund + its line items. Requester (current
// user), request number, date and amount are all set by the backend; the amount must
// stay below the fund ceiling.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createChargeRequestWithItems(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating charge request with items');
  }
}
