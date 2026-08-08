'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ADDLogoProps {
  variant?: 'full' | 'mark' | 'academy';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { imgH: 32, imgW: 68, text: 'text-sm', subtitle: 'text-[8px]' },
  md: { imgH: 40, imgW: 86, text: 'text-base', subtitle: 'text-[9px]' },
  lg: { imgH: 56, imgW: 120, text: 'text-xl', subtitle: 'text-[10px]' },
};

/**
 * ADD Individual Solutions logo component.
 *
 * Uses the actual company logo image from /add-logo.jpg.
 *
 * - `mark`    — just the logo image (for compact spaces)
 * - `full`    — logo image at full width
 * - `academy` — logo image + "Academy" branded text (default)
 */
export function ADDLogo({ variant = 'academy', className, size = 'md' }: ADDLogoProps) {
  const s = SIZES[size];

  if (variant === 'mark') {
    return (
      <Image
        src="/add-logo.jpg"
        alt="ADD Individual Solutions"
        width={s.imgW}
        height={s.imgH}
        className={cn('rounded-md object-contain', className)}
        priority
      />
    );
  }

  if (variant === 'full') {
    return (
      <Image
        src="/add-logo.jpg"
        alt="ADD Individual Solutions — Our Vision Your Way"
        width={s.imgW * 2}
        height={s.imgH * 2}
        className={cn('object-contain', className)}
        priority
      />
    );
  }

  // academy variant: logo + "Academy" text
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <Image
        src="/add-logo.jpg"
        alt="ADD Individual Solutions"
        width={s.imgW}
        height={s.imgH}
        className="rounded-md object-contain"
        priority
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-heading font-bold tracking-wide text-secondary',
            s.text
          )}
        >
          Academy
        </span>
        <span
          className={cn(
            'font-mono uppercase tracking-widest text-current opacity-50',
            s.subtitle
          )}
        >
          by ADD Individual Solutions
        </span>
      </span>
    </span>
  );
}
