'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ADDLogoProps {
  variant?: 'full' | 'mark' | 'academy';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Hide the "by ADD Individual Solutions" subtitle below the `sm` breakpoint — the
   * uppercase, wide-tracking mono text is often wider than the wordmark itself and
   * is the first thing worth dropping when horizontal space is tight (e.g. header). */
  hideSubtitleOnMobile?: boolean;
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
 * - `academy` — logo image + "Academica" branded text (default)
 */
export function ADDLogo({ variant = 'academy', className, size = 'md', hideSubtitleOnMobile = false }: ADDLogoProps) {
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

  // academy variant: logo + "Academica" text
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
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            'truncate font-heading font-bold tracking-wide text-secondary',
            s.text
          )}
        >
          Academica
        </span>
        <span
          className={cn(
            'truncate font-mono uppercase tracking-widest text-current opacity-50',
            s.subtitle,
            hideSubtitleOnMobile && 'hidden sm:block'
          )}
        >
          by ADD Individual Solutions
        </span>
      </span>
    </span>
  );
}
