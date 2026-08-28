import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listWorksites, listWorksiteTranslations } from '@/services/project-api';

/**
 * GET /api/cash-advance/worksites
 * Worksite picker source for the funds screen. Returns the worksite rows plus
 * their localized names (from KSS.Service.Project) so the page can render
 * names per language without a second round-trip.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const [worksites, translations] = await Promise.all([
      listWorksites(session.accessToken),
      listWorksiteTranslations(session.accessToken),
    ]);
    return NextResponse.json({ worksites, translations });
  } catch (error) {
    return apiErrorResponse(error, 'listing worksites');
  }
}
