'use client';

import { Fragment, use } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { InvoiceReadonlyDetailContent } from './content';

export default function InvoiceReadonlyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <InvoiceReadonlyDetailContent id={id} />
      </Container>
    </Fragment>
  );
}
