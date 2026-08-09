'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Gift, Clock, Crown, ChevronDown, ChevronUp, Download, ArrowRight, Sparkles, Shield } from 'lucide-react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { PageTransition } from '@/components/motion/page-transition';
import { useAuth } from '@/lib/auth/auth-context';
import {
  PACKAGE_PLANS,
  STAGE_PLANS,
  SAAS_PLANS,
  SAAS_PRODUCTS,
  BILLING_CYCLE_MONTHS,
  type PricingPlan,
} from '@/lib/subscriptions/plans';
import { t } from '@/lib/i18n';
import { getIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

const cardFade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
} as const;

function PlanCard({
  plan,
  language,
  onSelect,
  isCurrentPlan,
  index,
}: {
  plan: PricingPlan;
  language: string;
  onSelect: (plan: PricingPlan) => void;
  isCurrentPlan: boolean;
  index: number;
}) {
  const name = plan.name[language] || plan.name.en;
  const desc = plan.description[language] || plan.description.en;
  const badge = plan.badge?.[language] || plan.badge?.en;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardFade}
      className={cn(
        'group relative flex flex-col rounded-2xl border p-6 transition-all duration-300',
        plan.popular
          ? 'border-secondary/40 bg-gradient-to-b from-secondary/5 via-card to-card shadow-xl shadow-secondary/10 ring-1 ring-secondary/20 hover:shadow-2xl hover:shadow-secondary/15'
          : 'border-border bg-card hover:shadow-lg hover:border-primary/20',
        isCurrentPlan && 'ring-2 ring-green-500/40'
      )}
    >
      {/* Decorative gradient glow for popular */}
      {plan.popular && (
        <div className="absolute -top-px -left-px -right-px h-20 rounded-t-2xl bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none" />
      )}

      {badge && (
        <span className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-secondary to-secondary/90 px-3.5 py-1 text-xs font-bold text-secondary-foreground shadow-lg shadow-secondary/25">
          <Sparkles className="h-3 w-3" />
          {badge}
        </span>
      )}
      {isCurrentPlan && (
        <span className="absolute -top-3 right-6 z-10 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-md">
          {language === 'ro' ? 'Activ' : language === 'el' ? 'Ενεργό' : 'Active'}
        </span>
      )}

      <h3 className="relative font-heading text-lg font-bold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        {plan.originalPrice && (
          <span className="text-lg text-muted-foreground/60 line-through">&euro;{plan.originalPrice}</span>
        )}
        <span className="text-4xl font-bold tracking-tight text-foreground">&euro;{plan.price}</span>
        <span className="text-sm text-muted-foreground">
          / {BILLING_CYCLE_MONTHS} {language === 'ro' ? 'luni' : language === 'el' ? 'μήνες' : 'months'}
        </span>
      </div>

      <div className="mt-5 h-px bg-border" />

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.includes.stages?.map((s) => (
          <li key={s} className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-green-500/10">
              <Check className="h-3 w-3 text-green-500" />
            </div>
            Stage {s}
          </li>
        ))}
        {plan.includes.products?.map((p) => {
          const product = SAAS_PRODUCTS.find((sp) => sp.id === p);
          return (
            <li key={p} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-green-500/10">
                <Check className="h-3 w-3 text-green-500" />
              </div>
              {(() => { if (!product) return null; const I = getIcon(product.icon); return <I className="h-3.5 w-3.5 shrink-0" />; })()}
              {product?.name}
            </li>
          );
        })}
        {plan.id === 'full-access' && (
          <li className="flex items-center gap-2.5 text-sm text-secondary font-medium">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary/10">
              <Gift className="h-3 w-3 text-secondary" />
            </div>
            {language === 'ro'
              ? 'Cursuri viitoare incluse'
              : language === 'el'
                ? 'Μελλοντικά μαθήματα'
                : 'Future courses included'}
          </li>
        )}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={cn(
          'mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300',
          plan.popular
            ? 'bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30'
            : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25',
          isCurrentPlan && 'cursor-default opacity-50 shadow-none'
        )}
      >
        {isCurrentPlan
          ? language === 'ro' ? 'Plan activ' : language === 'el' ? 'Ενεργό πλάνο' : 'Current plan'
          : language === 'ro' ? 'Selectează' : language === 'el' ? 'Επιλογή' : 'Select plan'}
      </button>
    </motion.div>
  );
}

export default function PricingPage() {
  const language = useAcademyStore((s) => s.language);
  const { user, isOrgUser, effectiveTier } = useAuth();
  const [showStages, setShowStages] = useState(false);
  const [showSaas, setShowSaas] = useState(false);

  const handleSelect = (plan: PricingPlan) => {
    alert(`Redirecting to checkout for ${plan.name.en}...`);
  };

  if (isOrgUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-secondary/20 blur-3xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 text-secondary-foreground shadow-xl">
            <Crown className="h-10 w-10" />
          </div>
        </div>
        <h1 className="mt-6 font-heading text-2xl font-bold text-foreground">
          {language === 'ro'
            ? 'Acces organizațional complet'
            : language === 'el'
              ? 'Πλήρης πρόσβαση οργανισμού'
              : 'Full Organization Access'}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          {language === 'ro'
            ? 'Contul tău de organizație include acces complet la tot conținutul. Nu este necesar un abonament.'
            : language === 'el'
              ? 'Ο λογαριασμός οργανισμού σας περιλαμβάνει πλήρη πρόσβαση.'
              : 'Your organization account includes full access to all content. No subscription needed.'}
        </p>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="py-8">
      {/* ── Header ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
          {language === 'ro' ? 'Alege planul tău' : language === 'el' ? 'Επιλέξτε πλάνο' : 'Choose your plan'}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-lg mx-auto">
          {language === 'ro'
            ? 'Etapele 0 și 1 sunt gratuite. Alege un pachet sau cumpără individual.'
            : language === 'el'
              ? 'Τα Στάδια 0 και 1 είναι δωρεάν. Επιλέξτε πακέτο ή αγοράστε μεμονωμένα.'
              : 'Stages 0 & 1 are free forever. Choose a package or buy individual access.'}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-secondary" />
            {language === 'ro'
              ? 'Facturare la fiecare 3 luni'
              : language === 'el'
                ? 'Χρέωση κάθε 3 μήνες'
                : 'Billed every 3 months'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500/8 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <Download className="h-4 w-4" />
            {language === 'ro'
              ? 'Finalizeaza 80% pentru descarcari'
              : language === 'el'
                ? 'Ολοκληρώστε 80% για λήψεις'
                : 'Complete 80% to unlock downloads'}
          </span>
        </div>
      </motion.div>

      {/* ── Package plans ───────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        {PACKAGE_PLANS.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            language={language}
            onSelect={handleSelect}
            index={i}
            isCurrentPlan={
              effectiveTier === 'full_access' && plan.id === 'full-access' ||
              effectiveTier === 'llm_course' && plan.id === 'llm-course' ||
              effectiveTier === 'saas_bundle' && plan.id === 'saas-bundle'
            }
          />
        ))}
      </div>

      {/* ── Individual stages ───────────────────────────── */}
      <div className="mt-14">
        <button
          onClick={() => setShowStages(!showStages)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {showStages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {language === 'ro'
            ? 'Cumpără etape individuale'
            : language === 'el'
              ? 'Αγοράστε μεμονωμένα στάδια'
              : 'Buy individual stages'}
        </button>
        {showStages && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {STAGE_PLANS.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                language={language}
                onSelect={handleSelect}
                index={i}
                isCurrentPlan={
                  user?.subscription?.unlockedStages?.includes(plan.includes.stages?.[0] ?? -1) ?? false
                }
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Individual SaaS ─────────────────────────────── */}
      <div className="mt-8">
        <button
          onClick={() => setShowSaas(!showSaas)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {showSaas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {language === 'ro'
            ? 'Cumpără produse GenAI individual'
            : language === 'el'
              ? 'Αγοράστε μεμονωμένα προϊόντα GenAI'
              : 'Buy individual GenAI SaaS products'}
        </button>
        {showSaas && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {SAAS_PLANS.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                language={language}
                onSelect={handleSelect}
                index={i}
                isCurrentPlan={
                  user?.subscription?.unlockedProducts?.includes(plan.includes.products?.[0] ?? '') ?? false
                }
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Free tier info ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-14 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8 text-center"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-64 bg-primary/5 blur-3xl rounded-full" />

        <div className="relative">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground">
            {language === 'ro' ? 'Gratuit pentru totdeauna' : language === 'el' ? 'Δωρεάν για πάντα' : 'Free forever'}
          </h3>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            {language === 'ro'
              ? 'Etapa 0 (Introducere) și Etapa 1 (Fundamentele LLM) — gratuite, fără cont necesar.'
              : language === 'el'
                ? 'Στάδιο 0 (Εισαγωγή) και Στάδιο 1 (Θεμέλια LLM) — δωρεάν, χωρίς λογαριασμό.'
                : 'Stage 0 (Getting Started) and Stage 1 (LLM Fundamentals) — free, no account required.'}
          </p>
        </div>
      </motion.div>
    </div>
    </PageTransition>
  );
}
