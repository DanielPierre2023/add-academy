import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Presentational KPI tile for the admin dashboard (W4.5 extraction).
export function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  trendLabel,
  color = 'text-primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-2 text-xs font-medium', color)}>
          <Icon className="h-4 w-4" />
          {label}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-[10px] font-medium',
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : null}
            {trendLabel}
          </div>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
      {subValue && <div className="mt-0.5 text-xs text-muted-foreground">{subValue}</div>}
    </div>
  );
}
