'use client';

import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { useTranslation } from '@/hooks/useTranslation';

const PageNavbar = () => {
  const { settings } = useSettings();
  const { t } = useTranslation('cash-advance');

  const items = [
    { title: t('navMyRequests', { defaultValue: 'Requests' }), path: '/cash-advance/requests' },
    { title: t('navApprovals', { defaultValue: 'Approvals' }), path: '/cash-advance/approvals' },
    { title: t('navSubmitInvoice', { defaultValue: 'Submit Invoice' }), path: '/cash-advance/invoice/submit' },
    { title: t('navInvoices', { defaultValue: 'Invoices' }), path: '/cash-advance/invoice/view' },
    { title: t('navLedger', { defaultValue: 'Ledger' }), path: '/cash-advance/ledger' },
    { title: t('navAdminProducts', { defaultValue: 'Products' }), path: '/cash-advance/products' },
    {
      title: t('navAdminFunds', { defaultValue: 'Funds' }),
      children: [
        { title: t('navAdminFundsView', { defaultValue: 'View Cash' }), path: '/cash-advance/funds/view' },
        { title: t('navAdminFundsAdd', { defaultValue: 'Add Cash' }), path: '/cash-advance/funds/create' },
        { title: t('navAdminFundsUpdate', { defaultValue: 'Update Cash' }), path: '/cash-advance/funds/update' },
        // Placement, parent and label all specified by the customer (2026-09-06): right-side
        // menu, under the تنخواه subsection, labelled روکش تنخواه. Reuses ops.coverSheet.title
        // rather than minting a nav* key, so the menu label and the page heading cannot drift.
        //
        // Deliberately NOT permission-gated, because NOTHING in this navbar is — Products,
        // Funds and Person Limits are all admin screens rendered for every user of the zone.
        // Gating this one item alone would be inconsistent and would need a mechanism the
        // navbar does not have. The ungated navbar is a real finding; it is not this entry's
        // to fix, and fixing it here would be scope creep on a customer request.
        { title: t('ops.coverSheet.title', { defaultValue: 'Cover Sheet' }), path: '/cash-advance/invoice/cover' },
      ],
    },
    { title: t('navAdminPersonLimits', { defaultValue: 'Person Limits' }), path: '/cash-advance/person-limits' },
  ];

  if (settings?.layout === 'demo1') {
    return (
      <Navbar>
        <Container>
          <NavbarMenu items={items} />
        </Container>
      </Navbar>
    );
  }
  return <></>;
};

export { PageNavbar };
