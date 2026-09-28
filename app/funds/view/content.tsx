'use client';

import { FundForm } from '../components/fund-form';
import { FundSelectionCard } from '../components/fund-selection-card';
import { useFundContext } from '../contexts/fund-context';

// Read-only view of the currently-selected fund (from the fund context). The
// selector lives inside the person-style skeleton (first black/white Selection
// card); the form is forced read-only and renders its sections once picked.
export function ViewFundContent() {
  const { selectedFundId } = useFundContext();

  return (
    <FundForm
      key={selectedFundId || 'none'}
      selector={<FundSelectionCard />}
      fundId={selectedFundId || undefined}
      readOnly
    />
  );
}
