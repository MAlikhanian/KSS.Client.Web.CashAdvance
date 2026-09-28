'use client';

import { FundForm } from '../components/fund-form';
import { FundSelectionCard } from '../components/fund-selection-card';
import { useFundContext } from '../contexts/fund-context';

// Edit the currently-selected fund (from the fund context). The selector lives
// inside the person-style skeleton (first black/white Selection card); the form
// renders its sections once a fund is picked.
export function UpdateFundContent() {
  const { selectedFundId } = useFundContext();

  return (
    <FundForm
      key={selectedFundId || 'none'}
      selector={<FundSelectionCard />}
      fundId={selectedFundId || undefined}
    />
  );
}
