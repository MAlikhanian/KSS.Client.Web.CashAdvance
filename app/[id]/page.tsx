'use client';

import { Fragment, use } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CashAdvanceDetailContent } from './content';

export default function CashAdvanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CashAdvanceDetailContent id={id} />
      </Container>
    </Fragment>
  );
}
