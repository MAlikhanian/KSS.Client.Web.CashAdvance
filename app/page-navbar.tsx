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
