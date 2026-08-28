'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { ViewFundContent } from './content';

export default function ViewFundPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <ViewFundContent />
      </Container>
    </Fragment>
  );
}
