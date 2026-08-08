'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  User,
  CreditCard,
  Calendar,
  BookOpen,
  Trophy,
  Flame,
  Shield,
  Building2,
  ExternalLink,
  Clock,
  Download,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { SAAS_PRODUCTS, BILLING_CYCLE_MONTHS } from '@/lib/subscriptions/plans';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const language = useAcademyStore((s) => s.language);
  const { user, isOrgUser, isAdmin, effectiveTier, canAccessStage, canAccessProduct } = useAuth();
  const { getGamificationStats, getLevel, getXPProgress, getCompletionPercentage } = useAcademyStore();

  const stats = getGamificationStats();
  const level = getLevel();
  const xpProgress = getXPProgress();
  const completion = getCompletionPercentage();

  const daysLeft = useMemo(() => {
    if (!user?.subscription?.periodEnd) return null;
    const diff = new Date(user.subscription.periodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [user?.subscription?.periodEnd]);

  if (!user) {
    return (
      <div className="py-12 text-center">
        <User className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 font-heading text-xl font-bold text-foreground">
          {language === 'ro' ? 'Autentifică-te pentru a vedea panoul de control' : 'Sign in to view your dashboard'}
        </h2>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {language === 'ro' ? 'Autentificare' : 'Sign in'}
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <User className="h-8 w-8" />
          )}
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {user.displayName || user.email.split('@')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {isOrgUser && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
              <Building2 className="h-3 w-3" />
              {language === 'ro' ? 'Cont de organizație' : 'Organization account'}
              {isAdmin && (
                <span className="ml-1 rounded bg-secondary px-1 text-[9px] text-secondary-foreground">
                  Admin
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-secondary" />
            {language === 'ro' ? 'Nivel' : 'Level'}
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{level}</div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{ width: `${xpProgress.percentage}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{stats.xp} XP</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            {language === 'ro' ? 'Serie' : 'Streak'}
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{stats.streak} {language === 'ro' ? 'zile' : 'days'}</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            {language === 'ro' ? 'Progres' : 'Progress'}
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{completion}%</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.lecturesCompleted} / 49 {language === 'ro' ? 'lecții' : 'lectures'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-green-500" />
            {language === 'ro' ? 'Realizări' : 'Achievements'}
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{stats.perfectQuizzes}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {language === 'ro' ? 'Quiz-uri perfecte' : 'Perfect quizzes'}
          </p>
        </div>
      </div>

      {/* Download threshold note */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {language === 'ro'
              ? 'Descarcari de deployment'
              : language === 'el'
                ? 'Λήψεις ανάπτυξης'
                : 'Deployment Downloads'}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {completion >= 80
              ? (language === 'ro'
                  ? 'Ai atins pragul de 80%! Verifica pagina de descarcari.'
                  : language === 'el'
                    ? 'Φτάσατε το όριο 80%! Ελέγξτε τις λήψεις σας.'
                    : 'You\'ve reached the 80% threshold! Check your downloads page.')
              : (language === 'ro'
                  ? `Finalizeaza cel putin 80% din curs pentru a debloca descarcarile ZIP. Progresul tau: ${completion}%.`
                  : language === 'el'
                    ? `Ολοκληρώστε τουλάχιστον 80% για λήψεις ZIP. Πρόοδος: ${completion}%.`
                    : `Complete at least 80% of a course to unlock ZIP downloads. Your progress: ${completion}%.`)}
          </p>
          <Link
            href="/downloads"
            className="mt-2 inline-flex items-center gap-1 text-sm text-amber-600 hover:underline dark:text-amber-400"
          >
            {language === 'ro' ? 'Pagina descarcari' : language === 'el' ? 'Σελίδα λήψεων' : 'Downloads page'}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Subscription section — hidden for org users */}
      {!isOrgUser && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <CreditCard className="h-5 w-5 text-primary" />
            {language === 'ro' ? 'Abonament' : 'Subscription'}
          </h2>

          {user.subscription ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary capitalize">
                    {effectiveTier.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {daysLeft !== null && (
                    <span>
                      {daysLeft} {language === 'ro' ? 'zile rămase' : 'days remaining'}
                    </span>
                  )}
                </div>
              </div>

              {/* What's unlocked */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  {language === 'ro' ? 'Acces deblocat:' : 'Unlocked access:'}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[2, 3, 4, 5, 6].map((stage) => (
                    <div
                      key={stage}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        canAccessStage(stage) ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {canAccessStage(stage) ? '✓' : '🔒'} Stage {stage}
                    </div>
                  ))}
                  {SAAS_PRODUCTS.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        canAccessProduct(p.id) ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {canAccessProduct(p.id) ? '✓' : '🔒'} {p.icon} {p.name}
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {language === 'ro' ? 'Schimbă planul' : 'Change plan'}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {language === 'ro'
                  ? 'Ai acces gratuit la Etapele 0 și 1. Abonează-te pentru a debloca mai mult conținut.'
                  : 'You have free access to Stages 0 & 1. Subscribe to unlock more content.'}
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors"
              >
                {language === 'ro' ? 'Vezi planurile' : 'View plans'}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Organization admin section */}
      {isAdmin && (
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-6">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
            <Building2 className="h-5 w-5 text-secondary" />
            {language === 'ro' ? 'Administrare organizație' : 'Organization Admin'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {language === 'ro'
              ? 'Gestionează membrii organizației, coduri de invitare și setări.'
              : 'Manage organization members, invite codes, and settings.'}
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors"
          >
            {language === 'ro' ? 'Panou de administrare' : 'Admin Panel'}
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
