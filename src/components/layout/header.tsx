'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, User, LogOut, Settings, CreditCard, Globe, ChevronDown } from 'lucide-react';

import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { Language } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ADDLogo } from '@/components/brand/add-logo';
import { AnnouncementBell } from '@/components/academy/announcements';

const LANGUAGES: { code: Language; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ro', label: 'RO', name: 'Română' },
  { code: 'el', label: 'EL', name: 'Ελληνικά' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'ar', label: 'AR', name: 'العربية' },
];

const menuPopupClass =
  'min-w-40 border border-white/10 bg-primary text-primary-foreground shadow-xl';
const menuItemClass =
  'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-white/10 focus:bg-white/10 data-highlighted:bg-white/10 transition-colors';

function LanguageSwitcher() {
  const { language, setLanguage } = useAcademyStore();
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1 rounded-full border border-white/20 px-2 sm:px-2.5 py-1 text-xs font-bold text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground transition-colors"
        aria-label="Change language"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{current.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={cn(menuPopupClass, 'p-1')}>
        {LANGUAGES.map(({ code, label, name }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLanguage(code)}
            className={cn(menuItemClass, 'justify-between', language === code && 'bg-white/10')}
          >
            <span>{name}</span>
            <span className="text-primary-foreground/50 text-[10px]">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { language, getCompletionPercentage, setSidebarOpen, sidebarOpen } =
    useAcademyStore();
  const { theme, setTheme } = useTheme();
  const { user, isOrgUser, signOut } = useAuth();
  const router = useRouter();
  const completion = getCompletionPercentage();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-primary text-primary-foreground">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
        {/* Left: Sidebar toggle (mobile) + Logo */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0 rounded-md p-1.5 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <ADDLogo variant="academy" size="sm" hideSubtitleOnMobile />
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
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Auth section */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-white/20 px-2 sm:px-3 py-1 text-xs hover:bg-white/10 transition-colors">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
                {isOrgUser && (
                  <span className="rounded bg-secondary/20 px-1.5 py-0.5 text-[9px] font-bold text-secondary">
                    ORG
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className={cn(menuPopupClass, 'w-48 p-1')}>
                <DropdownMenuItem onClick={() => router.push('/dashboard')} className={menuItemClass}>
                  <Settings className="h-3.5 w-3.5" />
                  {t('nav_dashboard', language)}
                </DropdownMenuItem>
                {!isOrgUser && (
                  <DropdownMenuItem onClick={() => router.push('/pricing')} className={menuItemClass}>
                    <CreditCard className="h-3.5 w-3.5" />
                    {t('nav_subscription', language)}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className={cn(menuItemClass, 'text-red-300')}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t('auth_sign_out', language)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-secondary bg-secondary/10 px-3 sm:px-4 py-1 text-xs font-semibold text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all"
            >
              {t('nav_login', language)}
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
                  className="h-8 w-8 shrink-0 text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground"
                />
              }
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>

          {/* Language switcher (dropdown - scales to any number of languages without overflow) */}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
