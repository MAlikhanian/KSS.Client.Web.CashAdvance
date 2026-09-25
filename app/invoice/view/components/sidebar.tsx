'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText, CheckCircle2, Clock } from 'lucide-react';

interface SidebarProps {
  total: number;
  pending: number;
  approved: number;
}

export function Sidebar({ total, pending, approved }: SidebarProps) {
  const { t } = useTranslation('cash-advance');

  const stats = [
    {
      icon: <FileText className="w-5 h-5 text-white" />,
      bg: 'bg-amber-500',
      label: t('ops.invoiceView.stats.total', { defaultValue: 'Total' }),
      value: total,
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      bg: 'bg-green-500',
      label: t('ops.invoiceView.stats.approved', { defaultValue: 'Approved' }),
      value: approved,
    },
    {
      icon: <Clock className="w-5 h-5 text-white" />,
      bg: 'bg-amber-400',
      label: t('ops.invoiceView.stats.pending', { defaultValue: 'Pending' }),
      value: pending,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ops.invoiceView.title', { defaultValue: 'Invoices' })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center shrink-0`}
              >
                {s.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
