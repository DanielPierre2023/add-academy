'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, ArrowRight, Sparkles, Shield, GraduationCap, Building2, HeartHandshake } from 'lucide-react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { PageTransition } from '@/components/motion/page-transition';
import { useAuth } from '@/lib/auth/auth-context';
import { SUBSCRIPTION_PLANS, type PricingPlan } from '@/lib/subscriptions/plans';
import { cn } from '@/lib/utils';

const ORG_CONTACT_EMAIL = 'contact@add-individual-solutions.com';
const ORG_SEAT_CAP = 20;

const cardFade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
} as const;

/* Everything included in All-Access (shown on each plan card) */
const ALL_ACCESS_FEATURES: Record<string, string[]> = {
  en: [
    'Full LLM course — build a large language model from scratch',
    'All 5 GenAI SaaS tools (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Every future course, added automatically',
    'Deployable project downloads & certificates',
    'Cancel anytime',
  ],
  ro: [
    'Curs LLM complet — construiește un model lingvistic de la zero',
    'Toate cele 5 unelte GenAI SaaS (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Fiecare curs viitor, adăugat automat',
    'Descărcări de proiecte & certificate',
    'Anulează oricând',
  ],
  el: [
    'Πλήρες μάθημα LLM — φτιάξε ένα γλωσσικό μοντέλο από την αρχή',
    'Και τα 5 εργαλεία GenAI SaaS (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Κάθε μελλοντικό μάθημα, αυτόματα',
    'Λήψεις έργων & πιστοποιητικά',
    'Ακύρωση οποτεδήποτε',
  ],
};

function tt(language: string, en: string, ro: string, el: string): string {
  return language === 'ro' ? ro : language === 'el' ? el : en;
}

function PlanCard({
  plan,
  language,
  onSelect,
  isCurrentPlan,
  index,
  busy,
}: {
  plan: PricingPlan;
  language: string;
  onSelect: (plan: PricingPlan) => void;
  isCurrentPlan: boolean;
  index: number;
  busy: boolean;
}) {
  const name = plan.name[language] || plan.name.en;
  const desc = plan.description[language] || plan.description.en;
  const badge = plan.badge?.[language] || plan.badge?.en;
  const per = plan.interval === 'year'
    ? tt(language, '/ year', '/ an', '/ έτος')
    : tt(language, '/ month', '/ lună', '/ μήνα');
  const features = ALL_ACCESS_FEATURES[language] || ALL_ACCESS_FEATURES.en;

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
          {tt(language, 'Active', 'Activ', 'Ενεργό')}
        </span>
      )}

      <h3 className="relative font-heading text-lg font-bold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        {plan.originalPrice && (
          <span className="text-lg text-muted-foreground/60 line-through">&euro;{plan.originalPrice}</span>
        )}
        <span className="text-4xl font-bold tracking-tight text-foreground">&euro;{plan.price}</span>
        <span className="text-sm text-muted-foreground">{per}</span>
      </div>

      <div className="mt-5 h-px bg-border" />

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-green-500/10">
              <Check className="h-3 w-3 text-green-500" />
            </div>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || busy}
        className={cn(
          'mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300',
          plan.popular
            ? 'bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30'
            : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25',
          (isCurrentPlan || busy) && 'cursor-default opacity-50 shadow-none'
        )}
      >
        {isCurrentPlan
          ? tt(language, 'Current plan', 'Plan activ', 'Ενεργό πλάνο')
          : busy
            ? tt(language, 'Redirecting…', 'Se redirecționează…', 'Ανακατεύθυνση…')
            : tt(language, 'Subscribe', 'Abonează-te', 'Εγγραφή')}
      </button>
    </motion.div>
  );
}

/* Competitor comparison rows */
const COMPARISON: { label: Record<string, string>; add: string; others: Record<string, string> }[] = [
  {
    label: { en: 'Build a real LLM from scratch', ro: 'Construiește un LLM real de la zero', el: 'Φτιάξε ένα πραγματικό LLM από την αρχή' },
    add: 'yes',
    others: { en: 'Rarely', ro: 'Rar', el: 'Σπάνια' },
  },
  {
    label: { en: '5 GenAI SaaS tools included', ro: '5 unelte GenAI SaaS incluse', el: '5 εργαλεία GenAI SaaS' },
    add: 'yes',
    others: { en: 'No', ro: 'Nu', el: 'Όχι' },
  },
  {
    label: { en: 'All future courses included', ro: 'Toate cursurile viitoare incluse', el: 'Όλα τα μελλοντικά μαθήματα' },
    add: 'yes',
    others: { en: 'Pay per course', ro: 'Plată per curs', el: 'Πληρωμή ανά μάθημα' },
  },
  {
    label: { en: 'Free for schools & organisations', ro: 'Gratuit pentru școli & organizații', el: 'Δωρεάν για σχολεία & οργανισμούς' },
    add: 'yes',
    others: { en: 'No', ro: 'Nu', el: 'Όχι' },
  },
  {
    label: { en: 'Typical price', ro: 'Preț tipic', el: 'Τυπική τιμή' },
    add: 'from €12/mo',
    others: { en: '€40–200+', ro: '€40–200+', el: '€40–200+' },
  },
];

export default function PricingView() {
  const language = useAcademyStore((s) => s.language);
  const { user, isOrgUser, effectiveTier } = useAuth();
  const [interval, setInterval] = useState<'month' | 'year'>('year');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelect = async (plan: PricingPlan) => {
    if (!user) {
      window.location.href = `/login?redirect=/pricing`;
      return;
    }
    setSelectedPlan(plan.id);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.warn('Checkout API not configured:', data);
        setSelectedPlan(null);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setSelectedPlan(null);
    }
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
          {tt(language, 'Full Organization Access', 'Acces organizațional complet', 'Πλήρης πρόσβαση οργανισμού')}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          {tt(
            language,
            'Your organization account includes full access to all content — no subscription needed.',
            'Contul tău de organizație include acces complet la tot conținutul. Nu este necesar un abonament.',
            'Ο λογαριασμός οργανισμού σας περιλαμβάνει πλήρη πρόσβαση. Δεν χρειάζεται συνδρομή.'
          )}
        </p>
      </div>
    );
  }

  const visiblePlans = SUBSCRIPTION_PLANS.filter((p) => p.interval === interval);

  return (
    <PageTransition>
      <div className="py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
            {tt(language, 'Bootcamp depth. Streaming-service price.', 'Profunzime de bootcamp. Preț de streaming.', 'Βάθος bootcamp. Τιμή streaming.')}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
            {tt(
              language,
              'One subscription unlocks everything. Stages 0 & 1 are free forever — no account needed.',
              'Un singur abonament deblochează totul. Etapele 0 și 1 sunt gratuite pentru totdeauna — fără cont.',
              'Μία συνδρομή ξεκλειδώνει τα πάντα. Τα Στάδια 0 & 1 είναι δωρεάν για πάντα — χωρίς λογαριασμό.'
            )}
          </p>

          {/* Billing interval toggle */}
          <div className="mt-6 inline-flex items-center rounded-xl border border-border bg-muted p-1">
            <button
              onClick={() => setInterval('month')}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-semibold transition-all',
                interval === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {tt(language, 'Monthly', 'Lunar', 'Μηνιαία')}
            </button>
            <button
              onClick={() => setInterval('year')}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-semibold transition-all',
                interval === 'year' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {tt(language, 'Annual', 'Anual', 'Ετήσια')}
              <span className="ml-1.5 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-bold text-secondary">
                {tt(language, '2 months free', '2 luni gratis', '2 μήνες δωρεάν')}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plan cards */}
        <div className="mx-auto grid max-w-md gap-6">
          {visiblePlans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              language={language}
              onSelect={handleSelect}
              index={i}
              busy={selectedPlan === plan.id}
              isCurrentPlan={effectiveTier === 'full_access'}
            />
          ))}
        </div>

        {/* Student discount note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              {tt(language, 'Students save 50%', 'Studenții economisesc 50%', 'Οι φοιτητές γλιτώνουν 50%')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tt(
                language,
                `Subscribe to All-Access, then send proof of enrolment to ${ORG_CONTACT_EMAIL} and we apply a 50% discount to your subscription.`,
                `Abonează-te la All-Access, apoi trimite dovada înscrierii la ${ORG_CONTACT_EMAIL} și aplicăm o reducere de 50%.`,
                `Εγγραφείτε στο All-Access και στείλτε αποδεικτικό φοίτησης στο ${ORG_CONTACT_EMAIL} για έκπτωση 50%.`
              )}
            </p>
          </div>
        </motion.div>

        {/* Free for organisations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 relative overflow-hidden rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/5 via-card to-card p-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/15">
              <Building2 className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                {tt(language, 'Free for schools & organisations', 'Gratuit pentru școli & organizații', 'Δωρεάν για σχολεία & οργανισμούς')}
              </h3>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                {tt(
                  language,
                  `Schools and organisations get full access at no cost. Sign up as an Organisation — the registrant becomes the Org Admin, members log in with a valid organisation email, and the Org Admin receives an invitation code. Each organisation includes up to ${ORG_SEAT_CAP} learners.`,
                  `Școlile și organizațiile primesc acces complet gratuit. Înscrie-te ca Organizație — cel care se înregistrează devine Admin, membrii se conectează cu un email valid al organizației, iar Adminul primește un cod de invitație. Fiecare organizație include până la ${ORG_SEAT_CAP} cursanți.`,
                  `Σχολεία και οργανισμοί έχουν πλήρη πρόσβαση δωρεάν. Εγγραφείτε ως Οργανισμός — ο εγγράφων γίνεται Διαχειριστής, τα μέλη συνδέονται με έγκυρο email οργανισμού και ο Διαχειριστής λαμβάνει κωδικό πρόσκλησης. Κάθε οργανισμός περιλαμβάνει έως ${ORG_SEAT_CAP} μαθητές.`
                )}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {tt(
                  language,
                  `Need more than ${ORG_SEAT_CAP} seats? Request an extension at `,
                  `Ai nevoie de mai mult de ${ORG_SEAT_CAP} locuri? Cere o extindere la `,
                  `Χρειάζεστε πάνω από ${ORG_SEAT_CAP} θέσεις; Ζητήστε επέκταση στο `
                )}
                <a href={`mailto:${ORG_CONTACT_EMAIL}`} className="font-semibold text-secondary hover:underline">
                  {ORG_CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Mission / fund */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-card p-8"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <HeartHandshake className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              {tt(language, 'Your subscription builds the next free course', 'Abonamentul tău construiește următorul curs gratuit', 'Η συνδρομή σας χτίζει το επόμενο δωρεάν μάθημα')}
            </h3>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {tt(
                language,
                'Subscription earnings go into a fund that develops new AI courses and keeps access free for schools and organisations. When you subscribe, you help make world-class AI education accessible to everyone.',
                'Veniturile din abonamente merg într-un fond care dezvoltă noi cursuri AI și menține accesul gratuit pentru școli și organizații. Abonându-te, ajuți educația AI de top să fie accesibilă tuturor.',
                'Τα έσοδα από συνδρομές πηγαίνουν σε ταμείο που αναπτύσσει νέα μαθήματα AI και κρατά την πρόσβαση δωρεάν για σχολεία και οργανισμούς. Με τη συνδρομή σας, κάνετε την εκπαίδευση AI προσβάσιμη σε όλους.'
              )}
            </p>
          </div>
        </motion.div>

        {/* Competitor comparison */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8 overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="border-b border-border p-6">
            <h3 className="font-heading text-xl font-bold text-foreground">
              {tt(language, 'How we compare', 'Cum ne comparăm', 'Πώς συγκρινόμαστε')}
            </h3>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 gap-2 px-6 py-3 text-sm font-semibold text-muted-foreground">
              <span />
              <span className="text-center text-primary">ADD Academy</span>
              <span className="text-center">{tt(language, 'Others', 'Alții', 'Άλλοι')}</span>
            </div>
            {COMPARISON.map((row) => (
              <div key={row.label.en} className="grid grid-cols-3 items-center gap-2 px-6 py-3 text-sm">
                <span className="text-foreground">{row.label[language] || row.label.en}</span>
                <span className="text-center font-medium text-foreground">
                  {row.add === 'yes' ? (
                    <Check className="mx-auto h-4 w-4 text-green-500" />
                  ) : (
                    row.add
                  )}
                </span>
                <span className="text-center text-muted-foreground">{row.others[language] || row.others.en}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Free forever tier */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8 text-center"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-64 bg-primary/5 blur-3xl rounded-full" />
          <div className="relative">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              {tt(language, 'Free forever', 'Gratuit pentru totdeauna', 'Δωρεάν για πάντα')}
            </h3>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              {tt(
                language,
                'Stage 0 (Getting Started) and Stage 1 (LLM Fundamentals) — free, no account required.',
                'Etapa 0 (Introducere) și Etapa 1 (Fundamentele LLM) — gratuite, fără cont necesar.',
                'Στάδιο 0 (Εισαγωγή) και Στάδιο 1 (Θεμέλια LLM) — δωρεάν, χωρίς λογαριασμό.'
              )}
            </p>
            <a
              href="/course"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg"
            >
              {tt(language, 'Start free', 'Începe gratuit', 'Ξεκίνα δωρεάν')}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
