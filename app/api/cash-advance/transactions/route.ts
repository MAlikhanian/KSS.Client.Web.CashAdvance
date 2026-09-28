import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listTransactions, createTransaction } from '@/services/cash-advance-api';

// GET /api/cash-advance/transactions — list all ledger entries (append-only ledger)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listTransactions(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing transactions');
  }
}

// POST /api/cash-advance/transactions — record a ledger entry
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createTransaction(session.accessToken, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'creating transaction');
  }
}
