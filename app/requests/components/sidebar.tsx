'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText, Wallet, CircleDollarSign } from 'lucide-react';

interface SidebarProps {
  totalRequests: number;
  fundsCount: number;
  totalAmountLabel: string;
}

export function Sidebar({ totalRequests, fundsCount, totalAmountLabel }: SidebarProps) {
  const { t } = useTranslation('cash-advance');

  const stats = [
    {
      icon: <FileText className="w-5 h-5 text-white" />,
      bg: 'bg-amber-500',
      label: t('ops.requests.title', { defaultValue: 'Recharge Requests' }),
      value: totalRequests,
    },
    {
      icon: <Wallet className="w-5 h-5 text-white" />,
      bg: 'bg-orange-500',
      label: t('ops.requests.columns.fund', { defaultValue: 'Fund' }),
      value: fundsCount,
    },
    {
      icon: <CircleDollarSign className="w-5 h-5 text-white" />,
      bg: 'bg-yellow-500',
      label: t('ops.requests.columns.amount', { defaultValue: 'Amount' }),
      value: totalAmountLabel,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ops.requests.title', { defaultValue: 'Recharge Requests' })}</CardTitle>
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
