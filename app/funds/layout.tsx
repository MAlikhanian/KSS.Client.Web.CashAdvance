import { ReactNode } from 'react';
import { FundProvider } from './contexts/fund-context';

// Scopes the fund selection context to every /cash-advance/funds/* page
// (list, create, view, update) so the selection persists across them.
export default function FundsLayout({ children }: { children: ReactNode }) {
  return <FundProvider>{children}</FundProvider>;
}
