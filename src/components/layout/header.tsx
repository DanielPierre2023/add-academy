'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

import { useAcademyStore } from '@/lib/store/academy-store';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ro', label: 'RO' },
  { code: 'el', label: 'EL' },
];

export function Header() {
  const { language, setLanguage, getCompletionPercentage } = useAcademyStore();
  const { theme, setTheme } = useTheme();
  const completion = getCompletionPercentage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="flex h-12 items-center justify-between px-4 lg:px-6">
        {/* Left: Logo */}
        <Link
          href="/"
          className="flex items-baseline gap-2 font-semibold tracking-tight hover:opacity-90 transition-opacity"
        >
          <span className="text-xl font-heading font-bold tracking-wide text-secondary">
            LLM Academy
          </span>
          <span className="hidden sm:inline-block text-xs text-primary-foreground/60 font-mono">
            by ADD Individual Solutions
          </span>
        </Link>

        {/* Center: completion % */}
        <div className="hidden md:block text-xs text-primary-foreground/60 tabular-nums">
          {Math.round(completion)}%
        </div>

        {/* Right: Theme + Language pills */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label="Toggle theme"
                  className="h-8 w-8 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
                />
              }
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>

          {/* Language pills */}
          <div className="flex items-center rounded-full border border-white/20 p-0.5">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-bold transition-all',
                  language === code
                    ? 'bg-secondary text-secondary-foreground shadow-sm'
                    : 'text-primary-foreground/60 hover:text-primary-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
