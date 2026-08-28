'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CashAdvanceRequestsContent } from './content';

export default function CashAdvanceRequestsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CashAdvanceRequestsContent />
      </Container>
    </Fragment>
  );
}
