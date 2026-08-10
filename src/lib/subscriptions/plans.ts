/**
 * ADD Academy subscription plans.
 *
 * Pricing model (subscription):
 *  - Stage 0 & 1 are FREE for everyone (no account required)
 *  - Single recurring subscription: All-Access (monthly EUR 12 or annual EUR 99)
 *  - All-Access unlocks EVERYTHING: full LLM course, all GenAI SaaS, future courses
 *  - Students get 50% off, applied by an admin discount after verification
 *  - Organisations (schools) get full access for free (up to 20 seats)
 */

export type PlanType = 'subscription' | 'stage' | 'saas' | 'package';

export interface PricingPlan {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  type: PlanType;
  price: number;
  /** Billing interval (only meaningful for recurring subscriptions) */
  interval?: 'month' | 'year';
  /** Original price before discount (for optional strikethrough display) */
  originalPrice?: number;
  includes: {
    everything?: boolean;
    stages?: number[];
    products?: string[];
  };
  popular?: boolean;
  badge?: Record<string, string>;
}

export const SAAS_PRODUCTS = [
  { id: 'pixelforge', name: 'PixelForge', icon: 'Palette', description: 'AI image generation & editing' },
  { id: 'clipcraft', name: 'ClipCraft', icon: 'Film', description: 'AI video creation & editing' },
  { id: 'proseai', name: 'ProseAI', icon: 'PenLine', description: 'AI writing & content generation' },
  { id: 'truthlens', name: 'TruthLens', icon: 'ScanSearch', description: 'AI fact-checking & verification' },
  { id: 'docmind', name: 'DocMind', icon: 'FileText', description: 'AI document analysis & extraction' },
] as const;

/* ─── ALL-ACCESS SUBSCRIPTION (the active, marketed offering) ─────────── */

export const SUBSCRIPTION_PLANS: PricingPlan[] = [
  {
    id: 'all-access-monthly',
    name: { en: 'All-Access Monthly', ro: 'Acces Complet Lunar', el: 'Πλήρης Πρόσβαση Μηνιαία' },
    description: {
      en: 'Everything: the full LLM course, all GenAI SaaS tools, and every future course. Cancel anytime.',
      ro: 'Totul: cursul LLM complet, toate uneltele GenAI SaaS și fiecare curs viitor. Anulează oricând.',
      el: 'Τα πάντα: το πλήρες μάθημα LLM, όλα τα εργαλεία GenAI SaaS και κάθε μελλοντικό μάθημα. Ακύρωση οποτεδήποτε.',
    },
    type: 'subscription',
    price: 12,
    interval: 'month',
    includes: { everything: true },
    badge: { en: 'Most Flexible', ro: 'Cel Mai Flexibil', el: 'Πιο Ευέλικτο' },
  },
  {
    id: 'all-access-annual',
    name: { en: 'All-Access Annual', ro: 'Acces Complet Anual', el: 'Πλήρης Πρόσβαση Ετήσια' },
    description: {
      en: 'Everything, billed yearly — get 2 months free versus paying monthly. Cancel anytime.',
      ro: 'Totul, facturat anual — primești 2 luni gratis față de plata lunară. Anulează oricând.',
      el: 'Τα πάντα, ετήσια χρέωση — 2 μήνες δωρεάν σε σχέση με τη μηνιαία. Ακύρωση οποτεδήποτε.',
    },
    type: 'subscription',
    price: 99,
    interval: 'year',
    originalPrice: 144,
    includes: { everything: true },
    popular: true,
    badge: { en: 'Best Value · 2 Months Free', ro: 'Cea Mai Bună Valoare · 2 Luni Gratis', el: 'Καλύτερη Αξία · 2 Μήνες Δωρεάν' },
  },
];

/* ─── Legacy exports (kept so existing imports keep compiling) ────────── */

export const STAGE_PLANS: PricingPlan[] = [];

export const SAAS_PLANS: PricingPlan[] = SAAS_PRODUCTS.map((product) => ({
  id: `saas-${product.id}`,
  name: { en: product.name, ro: product.name, el: product.name },
  description: { en: product.description, ro: product.description, el: product.description },
  type: 'saas' as const,
  price: 14,
  includes: { products: [product.id] },
}));

export const PACKAGE_PLANS: PricingPlan[] = [...SUBSCRIPTION_PLANS];

export const ALL_PLANS: PricingPlan[] = [...SUBSCRIPTION_PLANS];

/**
 * @deprecated Subscriptions are no longer billed in fixed 3-month cycles.
 * Billing is monthly or annual per each plan's `interval`. Kept only so
 * existing imports keep compiling; treat 1 = one month. The accurate,
 * interval-aware revenue math lives in src/lib/admin/metrics.ts.
 */
export const BILLING_CYCLE_MONTHS = 1;
