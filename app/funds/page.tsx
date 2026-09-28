import { redirect } from 'next/navigation';

// The Funds list page was removed. Manage funds via Add / Update / View
// (context-driven, with a fund picker). The bare route lands on View.
export default function CashAdvanceAdminFundsPage() {
  redirect('/funds/view');
}
