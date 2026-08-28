'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { Wallet, CheckCircle2, UserCheck } from 'lucide-react';

interface SidebarProps {
  totalFunds: number;
  activeFunds: number;
  activeInCharges: number;
}

export function Sidebar({ totalFunds, activeFunds, activeInCharges }: SidebarProps) {
  const { t } = useTranslation('cash-advance');

  const stats = [
    {
      icon: <Wallet className="w-5 h-5 text-white" />,
      bg: 'bg-emerald-500',
      label: t('admin.funds.title', { defaultValue: 'Funds' }),
      value: totalFunds,
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      bg: 'bg-green-500',
      label: t('admin.common.active', { defaultValue: 'Active' }),
      value: activeFunds,
    },
    {
      icon: <UserCheck className="w-5 h-5 text-white" />,
      bg: 'bg-sky-500',
      label: t('admin.funds.inCharge.current', { defaultValue: 'Current' }),
      value: activeInCharges,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.funds.title', { defaultValue: 'Funds' })}</CardTitle>
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
