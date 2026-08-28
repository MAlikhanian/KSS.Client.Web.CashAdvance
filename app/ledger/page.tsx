'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CashAdvanceLedgerContent } from './content';

export default function CashAdvanceLedgerPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CashAdvanceLedgerContent />
      </Container>
    </Fragment>
  );
}
