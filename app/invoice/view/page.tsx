'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { InvoiceViewContent } from './content';

export default function InvoiceViewPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <InvoiceViewContent />
      </Container>
    </Fragment>
  );
}
