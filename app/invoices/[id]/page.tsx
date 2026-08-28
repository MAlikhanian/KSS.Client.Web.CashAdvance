import { redirect } from 'next/navigation';

export default async function InvoiceLegacyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/invoice/${id}`);
}
