import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listProductTranslations,
  createProductTranslation,
  updateProductTranslation,
  removeProductTranslation,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/product-translations — list all product translations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listProductTranslations(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing product translations');
  }
}

// POST /api/cash-advance/product-translations — create a product translation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createProductTranslation(session.accessToken, body), {
      status: 201,
    });
  } catch (error) {
    return apiErrorResponse(error, 'creating product translation');
  }
}

// PUT /api/cash-advance/product-translations — update a product translation
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateProductTranslation(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating product translation');
  }
}

// DELETE /api/cash-advance/product-translations — remove a product translation
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeProductTranslation(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting product translation');
  }
}
