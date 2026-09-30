'use client';

import { Fragment, Suspense } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CashAdvanceRequestsContent } from './content';

export default function CashAdvanceRequestsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        {/* The list reads its filters from the URL (useSearchParams), which needs a Suspense boundary. */}
        <Suspense>
          <CashAdvanceRequestsContent />
        </Suspense>
      </Container>
    </Fragment>
  );
}
