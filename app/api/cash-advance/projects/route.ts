import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listProjects, listProjectTranslations } from '@/services/project-api';

/**
 * GET /api/cash-advance/projects
 * Project picker source for the funds screen. Returns the project rows plus
 * their localized names (from KSS.Service.Project) so the page can render
 * names per language and cascade the worksite list off the chosen project.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const [projects, translations] = await Promise.all([
      listProjects(session.accessToken),
      listProjectTranslations(session.accessToken),
    ]);
    return NextResponse.json({ projects, translations });
  } catch (error) {
    return apiErrorResponse(error, 'listing projects');
  }
}
