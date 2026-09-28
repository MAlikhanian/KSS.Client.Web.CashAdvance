'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { ArrowDownLeft, ArrowUpRight, ListChecks, AlertTriangle } from 'lucide-react';
import { formatRial } from '@/lib/cash-advance/format';

interface SidebarProps {
  entryCount: number;
  totalIn: number;
  totalOut: number;
  overLimitCount: number;
}

export function Sidebar({ entryCount, totalIn, totalOut, overLimitCount }: SidebarProps) {
  const { t } = useTranslation('cash-advance');

  const stats = [
    {
      icon: <ListChecks className="w-5 h-5 text-white" />,
      bg: 'bg-cyan-500',
      label: t('ops.ledger.title', { defaultValue: 'Financial Ledger' }),
      value: String(entryCount),
    },
    {
      icon: <ArrowDownLeft className="w-5 h-5 text-white" />,
      bg: 'bg-emerald-500',
      label: t('ops.ledger.directionIn', { defaultValue: 'In' }),
      value: formatRial(totalIn),
    },
    {
      icon: <ArrowUpRight className="w-5 h-5 text-white" />,
      bg: 'bg-rose-500',
      label: t('ops.ledger.directionOut', { defaultValue: 'Out' }),
      value: formatRial(totalOut),
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      bg: 'bg-amber-500',
      label: t('ops.ledger.overLimit', { defaultValue: 'At / over limit' }),
      value: String(overLimitCount),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ops.ledger.title', { defaultValue: 'Financial Ledger' })}</CardTitle>
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
