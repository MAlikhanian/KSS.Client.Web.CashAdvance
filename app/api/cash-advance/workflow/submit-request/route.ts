import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { submitRequest } from '@/services/cash-advance-api';

// POST /api/cash-advance/workflow/submit-request — submit charge request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await submitRequest(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'submit charge request');
  }
}
