'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CreateChargeRequestContent } from './content';

export default function CreateChargeRequestPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CreateChargeRequestContent />
      </Container>
    </Fragment>
  );
}
