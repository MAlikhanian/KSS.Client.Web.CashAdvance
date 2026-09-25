import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { keyedDeleteProduct } from '@/services/cash-advance-api';

// DELETE /api/cash-advance/keyed-delete/product — delete a product and its names (body = { id })
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await keyedDeleteProduct(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting product by key');
  }
}
