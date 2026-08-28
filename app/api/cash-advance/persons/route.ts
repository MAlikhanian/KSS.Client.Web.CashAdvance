import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { apiErrorResponse } from '@/lib/api-error';
import { listPersonDirectoryByCompany } from '@/services/person-api';

/**
 * GET /api/cash-advance/persons
 * Person directory for Cash Advance person pickers (requester, fund in-charge,
 * per-person limits, approvals, ledger).
 *
 * Scoping is enforced by the Person service's `DirectoryByCompany` endpoint:
 * only persons assigned to the caller's ACTIVE company (the X-Company-Id cookie,
 * validated server-side against CompanyPerson) are returned — an EMPTY list when
 * there is no valid active company for the caller. The optional `query` param
 * does a client-side name/nationalId search over that scoped set.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').toLowerCase();

    let persons = await listPersonDirectoryByCompany(session.accessToken);
    if (query) {
      persons = persons.filter((p) => {
        if (p.nationalId?.toLowerCase().includes(query)) return true;
        return p.translations?.some(
          (tr) =>
            tr.firstName?.toLowerCase().includes(query) ||
            tr.lastName?.toLowerCase().includes(query),
        );
      });
    }
    return NextResponse.json(persons);
  } catch (error) {
    return apiErrorResponse(error, 'listing persons');
  }
}
