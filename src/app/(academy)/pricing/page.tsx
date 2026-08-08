'use client';

import { useState } from 'react';
import { Check, Sparkles, Zap, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { useAcademyStore } from '@/lib/store/academy-store';
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
import { cn } from '@/lib/utils';

function PlanCard({
  plan,
  language,
  onSelect,
  isCurrentPlan,
}: {
  plan: PricingPlan;
  language: string;
  onSelect: (plan: PricingPlan) => void;
  isCurrentPlan: boolean;
}) {
  const name = plan.name[language] || plan.name.en;
  const desc = plan.description[language] || plan.description.en;
  const badge = plan.badge?.[language] || plan.badge?.en;

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 transition-all hover:shadow-lg',
        plan.popular
          ? 'border-secondary bg-secondary/5 shadow-md ring-2 ring-secondary/30'
          : 'border-border bg-card',
        isCurrentPlan && 'ring-2 ring-green-500/50'
      )}
    >
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-secondary px-3 py-0.5 text-xs font-bold text-secondary-foreground">
          {badge}
        </span>
      )}
      {isCurrentPlan && (
        <span className="absolute -top-3 right-6 rounded-full bg-green-500 px-3 py-0.5 text-xs font-bold text-white">
          {language === 'ro' ? 'Activ' : language === 'el' ? 'Ενεργό' : 'Active'}
        </span>
      )}

      <h3 className="font-heading text-lg font-bold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>

      <div className="mt-4 flex items-baseline gap-1">
        {plan.originalPrice && (
          <span className="text-lg text-muted-foreground line-through">&euro;{plan.originalPrice}</span>
        )}
        <span className="text-3xl font-bold text-foreground">&euro;{plan.price}</span>
        <span className="text-sm text-muted-foreground">
          / {BILLING_CYCLE_MONTHS} {language === 'ro' ? 'luni' : language === 'el' ? 'μήνες' : 'months'}
        </span>
      </div>

      <ul className="mt-4 flex-1 space-y-2">
        {plan.includes.stages?.map((s) => (
          <li key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 shrink-0 text-green-500" />
            Stage {s}
          </li>
        ))}
        {plan.includes.products?.map((p) => {
          const product = SAAS_PRODUCTS.find((sp) => sp.id === p);
          return (
            <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-green-500" />
              {product?.icon} {product?.name}
            </li>
          );
        })}
        {plan.id === 'full-access' && (
          <li className="flex items-center gap-2 text-sm text-secondary font-medium">
            <Sparkles className="h-4 w-4 shrink-0" />
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
          'mt-6 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors',
          plan.popular
            ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
          isCurrentPlan && 'cursor-default opacity-50'
        )}
      >
        {isCurrentPlan
          ? language === 'ro' ? 'Plan activ' : language === 'el' ? 'Ενεργό πλάνο' : 'Current plan'
          : language === 'ro' ? 'Selectează' : language === 'el' ? 'Επιλογή' : 'Select plan'}
      </button>
    </div>
  );
}

export default function PricingPage() {
  const language = useAcademyStore((s) => s.language);
  const { user, isOrgUser, effectiveTier } = useAuth();
  const [showStages, setShowStages] = useState(false);
  const [showSaas, setShowSaas] = useState(false);

  const handleSelect = (plan: PricingPlan) => {
    // In production: redirect to Stripe checkout
    // For now: show alert
    alert(`Redirecting to checkout for ${plan.name.en}...`);
  };

  if (isOrgUser) {
    return (
      <div className="py-12 text-center">
        <Crown className="mx-auto h-12 w-12 text-secondary" />
        <h1 className="mt-4 font-heading text-2xl font-bold text-foreground">
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
    <div className="py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          {language === 'ro' ? 'Alege planul tău' : language === 'el' ? 'Επιλέξτε πλάνο' : 'Choose your plan'}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
          {language === 'ro'
            ? 'Etapele 0 și 1 sunt gratuite. Alege un pachet sau cumpără individual.'
            : language === 'el'
              ? 'Τα Στάδια 0 και 1 είναι δωρεάν. Επιλέξτε πακέτο ή αγοράστε μεμονωμένα.'
              : 'Stages 0 & 1 are free forever. Choose a package or buy individual access.'}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-secondary" />
          {language === 'ro'
            ? 'Facturare la fiecare 3 luni'
            : language === 'el'
              ? 'Χρέωση κάθε 3 μήνες'
              : 'Billed every 3 months'}
        </div>
      </div>

      {/* Package plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {PACKAGE_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            language={language}
            onSelect={handleSelect}
            isCurrentPlan={
              effectiveTier === 'full_access' && plan.id === 'full-access' ||
              effectiveTier === 'llm_course' && plan.id === 'llm-course' ||
              effectiveTier === 'saas_bundle' && plan.id === 'saas-bundle'
            }
          />
        ))}
      </div>

      {/* Individual stages */}
      <div className="mt-12">
        <button
          onClick={() => setShowStages(!showStages)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {showStages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {language === 'ro'
            ? 'Cumpără etape individuale'
            : language === 'el'
              ? 'Αγοράστε μεμονωμένα στάδια'
              : 'Buy individual stages'}
        </button>
        {showStages && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STAGE_PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                language={language}
                onSelect={handleSelect}
                isCurrentPlan={
                  user?.subscription?.unlockedStages?.includes(plan.includes.stages?.[0] ?? -1) ?? false
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Individual SaaS */}
      <div className="mt-8">
        <button
          onClick={() => setShowSaas(!showSaas)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {showSaas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {language === 'ro'
            ? 'Cumpără produse GenAI individual'
            : language === 'el'
              ? 'Αγοράστε μεμονωμένα προϊόντα GenAI'
              : 'Buy individual GenAI SaaS products'}
        </button>
        {showSaas && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SAAS_PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                language={language}
                onSelect={handleSelect}
                isCurrentPlan={
                  user?.subscription?.unlockedProducts?.includes(plan.includes.products?.[0] ?? '') ?? false
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Free tier info */}
      <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
        <h3 className="font-heading text-xl font-bold text-foreground">
          {language === 'ro' ? 'Gratuit pentru totdeauna' : language === 'el' ? 'Δωρεάν για πάντα' : 'Free forever'}
        </h3>
        <p className="mt-2 text-muted-foreground">
          {language === 'ro'
            ? 'Etapa 0 (Introducere) și Etapa 1 (Fundamentele LLM) — gratuite, fără cont necesar.'
            : language === 'el'
              ? 'Στάδιο 0 (Εισαγωγή) και Στάδιο 1 (Θεμέλια LLM) — δωρεάν, χωρίς λογαριασμό.'
              : 'Stage 0 (Getting Started) and Stage 1 (LLM Fundamentals) — free, no account required.'}
        </p>
      </div>
    </div>
  );
}
