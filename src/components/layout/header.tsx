'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, User, LogOut, Settings, CreditCard } from 'lucide-react';

import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ADDLogo } from '@/components/brand/add-logo';
import { AnnouncementBell } from '@/components/academy/announcements';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ro', label: 'RO' },
  { code: 'el', label: 'EL' },
];

export function Header() {
  const { language, setLanguage, getCompletionPercentage, setSidebarOpen, sidebarOpen } =
    useAcademyStore();
  const { theme, setTheme } = useTheme();
  const { user, isOrgUser, signOut } = useAuth();
  const completion = getCompletionPercentage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        {/* Left: Sidebar toggle (mobile) + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <ADDLogo variant="academy" size="sm" />
          </Link>
        </div>

        {/* Center: completion % */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-xs text-primary-foreground/60 tabular-nums">
              {Math.round(completion)}%
            </span>
          </div>
        </div>

        {/* Right: User + Theme + Language */}
        <div className="flex items-center gap-2">
          {/* Auth section */}
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs hover:bg-white/10 transition-colors">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
                {isOrgUser && (
                  <span className="rounded bg-secondary/20 px-1.5 py-0.5 text-[9px] font-bold text-secondary">
                    ORG
                  </span>
                )}
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full hidden w-48 pt-1 group-hover:block">
              <div className="rounded-lg border border-white/10 bg-primary p-1 shadow-xl">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-white/10 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {language === 'ro' ? 'Panou de control' : language === 'el' ? 'Πίνακας ελέγχου' : 'Dashboard'}
                </Link>
                {!isOrgUser && (
                  <Link
                    href="/pricing"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-white/10 transition-colors"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {language === 'ro' ? 'Abonament' : language === 'el' ? 'Συνδρομή' : 'Subscription'}
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-red-300 hover:bg-white/10 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {language === 'ro' ? 'Deconectare' : language === 'el' ? 'Αποσύνδεση' : 'Sign out'}
                </button>
              </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-secondary bg-secondary/10 px-4 py-1 text-xs font-semibold text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all"
            >
              {language === 'ro' ? 'Autentificare' : language === 'el' ? 'Σύνδεση' : 'Sign in'}
            </Link>
          )}

          {/* Announcement bell */}
          {user && <AnnouncementBell />}

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
