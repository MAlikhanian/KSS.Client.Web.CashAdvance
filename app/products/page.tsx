'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CashAdvanceAdminProductsContent } from './content';

export default function CashAdvanceAdminProductsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CashAdvanceAdminProductsContent />
      </Container>
    </Fragment>
  );
}
