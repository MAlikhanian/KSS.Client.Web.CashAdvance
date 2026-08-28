'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CashAdvanceApprovalsContent } from './content';

export default function CashAdvanceApprovalsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CashAdvanceApprovalsContent />
      </Container>
    </Fragment>
  );
}
