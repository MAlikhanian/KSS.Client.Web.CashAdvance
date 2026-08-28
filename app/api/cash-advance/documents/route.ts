import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listDocuments } from '@/services/cash-advance-api';

// GET /api/cash-advance/documents — list stored-file metadata rows (for resolving filenames)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(await listDocuments(session.accessToken));
  } catch (error) {
    return apiErrorResponse(error, 'listing cash advance documents');
  }
}
