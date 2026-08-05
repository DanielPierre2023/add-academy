'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Menu,
  X,
  Globe,
  Sun,
  Moon,
  GraduationCap,
  MessageCircle,
  User,
} from 'lucide-react';

import { t, LANGUAGE_NAMES } from '@/lib/i18n';
import { useAcademyStore } from '@/lib/store/academy-store';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Header() {
  const {
    language,
    setLanguage,
    sidebarOpen,
    setSidebarOpen,
    tutorOpen,
    setTutorOpen,
    getCompletionPercentage,
  } = useAcademyStore();

  const { theme, setTheme } = useTheme();
  const completion = getCompletionPercentage();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full',
        'border-b border-border/40',
        'bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60'
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline-block text-lg">
              ADD Academy
            </span>
          </Link>
        </div>

        {/* Center: Progress bar */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <Tooltip>
            <TooltipTrigger
              render={<div className="flex items-center gap-2 w-[200px]" />}
            >
              <Progress value={completion} className="h-2" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {Math.round(completion)}%
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t('course_progress', language)}: {Math.round(completion)}%{' '}
                {t('course_completed', language)}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer for mobile when progress is hidden */}
        <div className="flex-1 md:hidden" />

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="relative" />}
            >
              <Globe className="h-4 w-4" />
              <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-bold uppercase leading-none">
                {language}
              </span>
              <span className="sr-only">
                {t('nav_home', language)} - Language
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.entries(LANGUAGE_NAMES) as [Language, string][]).map(
                ([code, name]) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => setLanguage(code)}
                    className={cn(
                      'cursor-pointer',
                      language === code && 'font-semibold bg-accent'
                    )}
                  >
                    <span className="uppercase text-xs font-mono mr-2">
                      {code}
                    </span>
                    {name}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* AI Tutor toggle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={tutorOpen ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setTutorOpen(!tutorOpen)}
                  aria-label={t('nav_ai_tutor', language)}
                  className="hidden sm:inline-flex"
                />
              }
            >
              <MessageCircle className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('nav_ai_tutor', language)}</p>
            </TooltipContent>
          </Tooltip>

          {/* User / Login */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/login"
                  aria-label={t('nav_login', language)}
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                />
              }
            >
              <User className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('nav_login', language)}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
