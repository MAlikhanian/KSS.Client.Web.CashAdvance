'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CreateFundContent } from './content';

export default function CreateFundPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CreateFundContent />
      </Container>
    </Fragment>
  );
}
