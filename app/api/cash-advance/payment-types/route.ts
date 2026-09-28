import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listPaymentTypes, listPaymentTypeTranslations } from '@/services/cash-advance-api';

// GET /api/cash-advance/payment-types — payment methods + localized names (read only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const [paymentTypes, translations] = await Promise.all([
      listPaymentTypes(session.accessToken),
      listPaymentTypeTranslations(session.accessToken),
    ]);
    return NextResponse.json({ paymentTypes, translations });
  } catch (error) {
    return apiErrorResponse(error, 'listing payment types');
  }
}
