'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { UpdateFundContent } from './content';

export default function UpdateFundPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <UpdateFundContent />
      </Container>
    </Fragment>
  );
}
