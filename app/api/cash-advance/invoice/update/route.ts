import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { INVOICE_MONTH_SETTLED, settledMonthOf } from '@/lib/cash-advance/month-settled';
import {
  INVOICE_REGISTRATION_WINDOW_CLOSED,
  closedWindowOf,
} from '@/lib/cash-advance/registration-window';
import { updateInvoiceFull } from '@/services/cash-advance-api';

// POST /api/cash-advance/invoice/update — full-replace invoice edit / submit correction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateInvoiceFull(session.accessToken, body));
  } catch (error) {
    // These two refusals carry values the form names in its message. The shared error response
    // keeps only "message", so they are answered here.
    const closedWindow = closedWindowOf(error);
    if (closedWindow) {
      return NextResponse.json({ message: INVOICE_REGISTRATION_WINDOW_CLOSED, ...closedWindow }, { status: 400 });
    }
    const closed = settledMonthOf(error);
    if (closed) {
      return NextResponse.json(
        { message: INVOICE_MONTH_SETTLED, year: closed.year, month: closed.month },
        { status: 400 },
      );
    }
    return apiErrorResponse(error, 'updating invoice');
  }
}
