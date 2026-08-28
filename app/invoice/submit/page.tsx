'use client';

import { Fragment, use } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { SubmitInvoiceContent } from './content';

export default function SubmitInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = use(searchParams);
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <SubmitInvoiceContent editId={id ?? null} />
      </Container>
    </Fragment>
  );
}
