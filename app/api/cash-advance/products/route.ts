import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import {
  listProducts,
  createProduct,
  updateProduct,
  removeProduct,
} from '@/services/cash-advance-api';

// GET /api/cash-advance/products — list all products
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listProducts(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing products');
  }
}

// POST /api/cash-advance/products — create a product
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await createProduct(session.accessToken, body), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'creating product');
  }
}

// PUT /api/cash-advance/products — update a product
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json(await updateProduct(session.accessToken, body));
  } catch (error) {
    return apiErrorResponse(error, 'updating product');
  }
}

// DELETE /api/cash-advance/products — remove a product (body = full entity)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    await removeProduct(session.accessToken, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'deleting product');
  }
}
