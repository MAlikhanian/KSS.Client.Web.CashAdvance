'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CashAdvanceAdminPersonLimitsContent } from './content';

export default function CashAdvanceAdminPersonLimitsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CashAdvanceAdminPersonLimitsContent />
      </Container>
    </Fragment>
  );
}
