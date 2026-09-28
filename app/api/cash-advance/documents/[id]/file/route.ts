import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { listDocuments } from '@/services/cash-advance-api';
import { downloadFile } from '@/services/file-orchestrator-api';

// GET /api/cash-advance/documents/[id]/file — stream a stored file through the orchestrator
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Resolve the Document to get its storageInstanceId + metadata.
    const docs = await listDocuments(session.accessToken);
    const doc = Array.isArray(docs)
      ? docs.find((d) => d.id.toLowerCase() === id.toLowerCase())
      : null;
    if (!doc) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    const fileDataBase64 = await downloadFile(session.accessToken, id, doc.storageInstanceId);
    if (!fileDataBase64) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    const buffer = Buffer.from(fileDataBase64, 'base64');
    const viewableTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
    const disposition = viewableTypes.includes(doc.contentType)
      ? `inline; filename="${encodeURIComponent(doc.fileName)}"`
      : `attachment; filename="${encodeURIComponent(doc.fileName)}"`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': doc.contentType || 'application/octet-stream',
        'Content-Disposition': disposition,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 },
    );
  }
}
