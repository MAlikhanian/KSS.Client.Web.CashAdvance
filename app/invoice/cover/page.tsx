'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '@/app/page-navbar';
import { CoverSheetContent } from './content';

/**
 * روکش تنخواه — reachable by URL, and linked from the zone navbar.
 *
 * The navbar entry and the reasoning for it live in app/page-navbar.tsx, written beside the
 * entry itself: where the link sits, what it is labelled, and why it is built that way. That
 * comment owns the placement decision.
 *
 * Do not restate any of it here. Two copies of one rationale drift apart, and the divergence
 * is then visible only to someone who happens to read both.
 */
export default function CoverSheetPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CoverSheetContent />
      </Container>
    </Fragment>
  );
}
