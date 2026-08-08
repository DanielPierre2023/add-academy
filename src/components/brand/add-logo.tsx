'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ADDLogoProps {
  variant?: 'full' | 'mark' | 'academy';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { mark: 'h-6', full: 'h-6', text: 'text-sm' },
  md: { mark: 'h-8', full: 'h-8', text: 'text-base' },
  lg: { mark: 'h-10', full: 'h-10', text: 'text-xl' },
};

/**
 * ADD Individual Solutions logo component.
 *
 * - `mark`    — just the ADD pill (for favicons, compact spaces)
 * - `full`    — ADD pill + "Individual Solutions" text
 * - `academy` — ADD pill + "Academy" branded text (default)
 */
export function ADDLogo({ variant = 'academy', className, size = 'md' }: ADDLogoProps) {
  const s = SIZES[size];

  if (variant === 'mark') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-lg bg-[#E8453C] px-2 py-0.5 font-heading font-black tracking-wide text-white',
          s.text,
          className
        )}
      >
        ADD
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {/* ADD pill mark */}
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-lg bg-[#E8453C] px-2 py-0.5 font-heading font-black tracking-wide text-white',
          s.text
        )}
      >
        ADD
      </span>

      {variant === 'academy' ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'font-heading font-bold tracking-wide text-secondary',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
            )}
          >
            Academy
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-current opacity-50">
            by ADD Individual Solutions
          </span>
        </span>
      ) : (
        <span className="flex flex-col leading-tight">
          <span className={cn('font-heading font-bold tracking-tight', s.text)}>
            Individual
          </span>
          <span className={cn('font-heading font-bold tracking-tight', s.text)}>
            Solutions
          </span>
        </span>
      )}
    </span>
  );
}
