'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, LogOut, UserCircle, School } from 'lucide-react';

import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/components/auth/auth-provider';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { XPBar } from '@/components/gamification/xp-bar';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ro', label: 'RO' },
  { code: 'el', label: 'EL' },
];

export function Header() {
  const { language, setLanguage, getCompletionPercentage } = useAcademyStore();
  const { theme, setTheme } = useTheme();
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const completion = getCompletionPercentage();

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

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

        {/* Center: XP bar + completion % */}
        <div className="hidden md:flex items-center gap-3">
          <XPBar />
          <span className="text-xs text-primary-foreground/60 tabular-nums">
            {Math.round(completion)}%
          </span>
        </div>

        {/* Right: Auth + Theme + Language pills */}
        <div className="flex items-center gap-3">
          {/* Auth section */}
          {!loading && (
            <>
              {user ? (
                <div className="flex items-center gap-2">
                  {user.isSchoolContact && (
                    <Link
                      href="/school/dashboard"
                      className="hidden sm:flex items-center gap-1.5 text-xs text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                    >
                      <School className="h-4 w-4" />
                      <span>{t('school_dashboard', language as Language)}</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    className="hidden sm:flex items-center gap-1.5 text-xs text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                  >
                    <UserCircle className="h-4 w-4" />
                    <span className="max-w-[120px] truncate">
                      {user.name || user.email}
                    </span>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSignOut}
                          aria-label={t('auth_sign_out', language as Language)}
                          className="h-8 w-8 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
                        />
                      }
                    >
                      <LogOut className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>{t('auth_sign_out', language as Language)}</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground"
                    >
                      {t('auth_login', language as Language)}
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    >
                      {t('auth_register', language as Language)}
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}

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
