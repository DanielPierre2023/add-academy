'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  ArrowRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { SAAS_PRODUCTS, BILLING_CYCLE_MONTHS } from '@/lib/subscriptions/plans';
import { getIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
} as const;

const statCards = [
  {
    key: 'level',
    icon: Trophy,
    iconColor: 'text-amber-500',
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    borderGlow: 'hover:border-amber-500/30',
  },
  {
    key: 'streak',
    icon: Flame,
    iconColor: 'text-orange-500',
    gradient: 'from-orange-500/10 via-orange-500/5 to-transparent',
    borderGlow: 'hover:border-orange-500/30',
  },
  {
    key: 'progress',
    icon: BookOpen,
    iconColor: 'text-blue-500',
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    borderGlow: 'hover:border-blue-500/30',
  },
  {
    key: 'achievements',
    icon: Shield,
    iconColor: 'text-emerald-500',
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    borderGlow: 'hover:border-emerald-500/30',
  },
] as const;

export default function DashboardView() {
  const language = useAcademyStore((s) => s.language);
  const { user, isOrgUser, isAdmin, effectiveTier, canAccessStage, canAccessProduct } = useAuth();
  const { getGamificationStats, getLevel, getXPProgress, getCompletionPercentage } = useAcademyStore();

  const stats = getGamificationStats();
  const level = getLevel();
  const xpProgress = getXPProgress();
  const completion = getCompletionPercentage();

  // W4.1 — `el` was optional, so 18 of 21 strings fell back to English for
  // Greek users. It is now required.
  const t = (en: string, ro: string, el: string) =>
    language === 'ro' ? ro : language === 'el' ? el : en;

  const daysLeft = useMemo(() => {
    if (!user?.subscription?.periodEnd) return null;
    const diff = new Date(user.subscription.periodEnd).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [user?.subscription?.periodEnd]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h2 className="mt-6 font-heading text-2xl font-bold text-foreground">
          {t('Sign in to view your dashboard', 'Autentifică-te pentru a vedea panoul de control', 'Συνδεθείτε για να δείτε τον πίνακά σας')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {t('Track your progress, manage your subscription, and access premium content.', 'Urmărește-ți progresul, gestionează abonamentul și accesează conținut premium.', 'Παρακολουθήστε την πρόοδό σας, διαχειριστείτε τη συνδρομή σας και αποκτήστε πρόσβαση σε premium περιεχόμενο.')}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          {t('Sign in', 'Autentificare', 'Σύνδεση')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8">
      {/* ── Profile header ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6"
      >
        {/* Decorative dots */}
        <div className="absolute top-0 right-0 h-40 w-40 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        />

        <div className="relative flex items-center gap-5">
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-18 w-18 rounded-2xl object-cover ring-2 ring-primary/20 shadow-lg"
              />
            ) : (
              <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg">
                <User className="h-9 w-9" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground text-xs font-bold shadow-md">
              {level}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold text-foreground truncate">
              {user.displayName || user.email.split('@')[0]}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>

            <div className="mt-2 flex items-center gap-3 flex-wrap">
              {isOrgUser && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                  <Building2 className="h-3 w-3" />
                  {t('Organization', 'Organizație', 'Οργανισμός')}
                  {isAdmin && (
                    <span className="ml-0.5 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground">
                      Admin
                    </span>
                  )}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <TrendingUp className="h-3 w-3" />
                {stats.xp} XP
              </span>
            </div>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">
              {t('Level', 'Nivel', 'Επίπεδο')} {level}
            </span>
            <span className="text-muted-foreground">
              {xpProgress.current} / {xpProgress.needed} XP
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress.percentage}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          const statValue =
            card.key === 'level' ? level :
            card.key === 'streak' ? stats.streak :
            card.key === 'progress' ? `${completion}%` :
            stats.perfectQuizzes;
          const statLabel =
            card.key === 'level' ? t('Level', 'Nivel', 'Επίπεδο') :
            card.key === 'streak' ? t('Day Streak', 'Serie de zile', 'Σερί Ημερών') :
            card.key === 'progress' ? t('Completed', 'Completat', 'Ολοκληρωμένα') :
            t('Perfect Quizzes', 'Quiz-uri perfecte', 'Τέλεια Κουίζ');
          const statSub =
            card.key === 'level' ? `${stats.xp} XP` :
            card.key === 'streak' ? t('consecutive days', 'zile consecutive', 'συνεχόμενες ημέρες') :
            card.key === 'progress' ? `${stats.lecturesCompleted} / 49 ${t('lectures', 'lecții', 'μαθήματα')}` :
            t('flawless scores', 'scoruri perfecte', 'άψογες βαθμολογίες');

          return (
            <motion.div
              key={card.key}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300',
                card.borderGlow
              )}
            >
              {/* Gradient background */}
              <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300', card.gradient)} />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50', card.iconColor)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {card.key === 'level' && (
                    <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-secondary" />
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold tracking-tight text-foreground">
                    {statValue}
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-foreground/80">{statLabel}</div>
                  <div className="text-xs text-muted-foreground">{statSub}</div>
                </div>

                {card.key === 'level' && (
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-secondary to-amber-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                )}

                {card.key === 'progress' && (
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${completion}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Download threshold banner ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-amber-500/[0.03] to-transparent p-5"
      >
        <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <Download className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('Deployment Downloads', 'Descarcari de deployment', 'Λήψεις ανάπτυξης')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {completion >= 80
                ? t(
                    'You\'ve reached the 80% threshold! Check your downloads page.',
                    'Ai atins pragul de 80%! Verifica pagina de descarcari.',
                    'Φτάσατε το όριο 80%! Ελέγξτε τις λήψεις σας.'
                  )
                : t(
                    `Complete at least 80% of a course to unlock ZIP downloads. Your progress: ${completion}%.`,
                    `Finalizeaza cel putin 80% din curs pentru a debloca descarcarile ZIP. Progresul tau: ${completion}%.`,
                    `Ολοκληρώστε τουλάχιστον 80% για λήψεις ZIP. Πρόοδος: ${completion}%.`
                  )}
            </p>
            <Link
              href="/downloads"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-500/20 transition-colors dark:text-amber-400"
            >
              {t('Downloads page', 'Pagina descarcari', 'Σελίδα λήψεων')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Subscription section ───────────────────────────── */}
      {!isOrgUser && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card"
        >
          {/* Header */}
          <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-4">
            <h2 className="flex items-center gap-2.5 font-heading text-lg font-bold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              {t('Subscription', 'Abonament', 'Συνδρομή')}
            </h2>
          </div>

          <div className="p-6">
            {user.subscription ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-2 text-sm font-bold text-primary capitalize">
                    <Sparkles className="h-4 w-4" />
                    {effectiveTier.replace('_', ' ')}
                  </span>
                  {daysLeft !== null && (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {daysLeft} {t('days remaining', 'zile rămase', 'ημέρες απομένουν')}
                    </span>
                  )}
                </div>

                {/* Access grid */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {t('Unlocked access:', 'Acces deblocat:', 'Ξεκλειδωμένη πρόσβαση:')}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[2, 3, 4, 5, 6].map((stage) => (
                      <div
                        key={stage}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
                          canAccessStage(stage)
                            ? 'bg-green-500/8 text-green-700 dark:text-green-400 border border-green-500/10'
                            : 'bg-muted/50 text-muted-foreground border border-transparent'
                        )}
                      >
                        {canAccessStage(stage) ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 shrink-0" />
                        )}
                        Stage {stage}
                      </div>
                    ))}
                    {SAAS_PRODUCTS.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
                          canAccessProduct(p.id)
                            ? 'bg-green-500/8 text-green-700 dark:text-green-400 border border-green-500/10'
                            : 'bg-muted/50 text-muted-foreground border border-transparent'
                        )}
                      >
                        {canAccessProduct(p.id) ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 shrink-0" />
                        )}
                        {(() => { const I = getIcon(p.icon); return <I className="h-3.5 w-3.5 shrink-0" />; })()}
                        {p.name}
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {t('Change plan', 'Schimbă planul', 'Αλλαγή πλάνου')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('You have free access to Stages 0 & 1. Subscribe to unlock more content and deployment-ready downloads.', 'Ai acces gratuit la Etapele 0 și 1. Abonează-te pentru a debloca mai mult conținut și descărcări.', 'Έχετε δωρεάν πρόσβαση στα Στάδια 0 και 1. Εγγραφείτε για να ξεκλειδώσετε περισσότερο περιεχόμενο και έτοιμα προς ανάπτυξη αρχεία.')}
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-secondary/90 px-5 py-2.5 text-sm font-semibold text-secondary-foreground shadow-md shadow-secondary/20 hover:shadow-lg hover:shadow-secondary/30 transition-all"
                >
                  {t('View plans', 'Vezi planurile', 'Δείτε τα πλάνα')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Organization admin section ─────────────────────── */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-secondary/20 bg-gradient-to-br from-secondary/5 via-card to-card"
        >
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-secondary/5 blur-3xl" />

          <div className="relative p-6">
            <h2 className="flex items-center gap-2.5 font-heading text-lg font-bold text-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
                <Building2 className="h-5 w-5 text-secondary" />
              </div>
              {t('Organization Admin', 'Administrare organizație', 'Διαχειριστής Οργανισμού')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Manage organization members, invite codes, and settings.', 'Gestionează membrii organizației, coduri de invitare și setări.', 'Διαχειριστείτε μέλη, κωδικούς πρόσκλησης και ρυθμίσεις του οργανισμού.')}
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 shadow-md shadow-secondary/20 transition-all"
            >
              {t('Admin Panel', 'Panou de administrare', 'Πίνακας Διαχείρισης')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
