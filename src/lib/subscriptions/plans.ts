/**
 * ADD Academy subscription plans.
 *
 * Pricing model:
 * - Stage 0 & 1 are FREE for everyone (no account required)
 * - Single recurring subscription: All-Access (monthly or annual)
 * - All-Access unlocks EVERYTHING: full LLM course, all GenAI SaaS
 *   products, all future courses, certificates and deployable downloads
 * - Students get 50% off (applied as a -50% discount after verification)
 * - Organizations (schools/universities) get full access at no cost,
 *   up to 20 seats per organization (extensions via contact@add-individual-solutions.com)
 * - Subscriptions renew automatically; cancel anytime
 */

export interface PricingPlan {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  /** All current plans are recurring subscriptions */
  type: 'subscription';
  /** Recurring price in EUR */
  price: number;
  /** Billing interval */
  interval: 'month' | 'year';
  /** What this plan unlocks */
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

/** Default free seats per organization (schools/universities). */
export const ORG_DEFAULT_SEATS = 20;

/** Student discount percentage (applied by admin after verification). */
export const STUDENT_DISCOUNT_PERCENT = 50;

/**
 * The two All-Access subscription plans. This is the source of truth
 * for pricing shown across the site.
 */
export const SUBSCRIPTION_PLANS: PricingPlan[] = [
  {
    id: 'all-access-monthly',
    name: {
      en: 'All-Access (Monthly)',
      ro: 'Acces Complet (Lunar)',
      el: 'Πλήρης Πρόσβαση (Μηνιαία)',
    },
    description: {
      en: 'Everything: full LLM course, all GenAI SaaS products, all future courses, certificates and deployable downloads.',
      ro: 'Totul: curs LLM complet, toate produsele GenAI SaaS, toate cursurile viitoare, certificate și descărcări.',
      el: 'Τα πάντα: πλήρες μάθημα LLM, όλα τα προϊόντα GenAI SaaS, όλα τα μελλοντικά μαθήματα, πιστοποιητικά και λήψεις.',
    },
    type: 'subscription',
    price: 12,
    interval: 'month',
    includes: { everything: true },
  },
  {
    id: 'all-access-annual',
    name: {
      en: 'All-Access (Annual)',
      ro: 'Acces Complet (Anual)',
      el: 'Πλήρης Πρόσβαση (Ετήσια)',
    },
    description: {
      en: 'Everything, billed yearly — 2 months free vs monthly.',
      ro: 'Totul, facturat anual — 2 luni gratuite față de plata lunară.',
      el: 'Τα πάντα, ετήσια χρέωση — 2 μήνες δωρεάν σε σχέση με τη μηνιαία.',
    },
    type: 'subscription',
    price: 99,
    interval: 'year',
    includes: { everything: true },
    popular: true,
    badge: { en: 'Best Value', ro: 'Cel Mai Avantajos', el: 'Καλύτερη Αξία' },
  },
];

export const MONTHLY_PLAN = SUBSCRIPTION_PLANS[0];
export const ANNUAL_PLAN = SUBSCRIPTION_PLANS[1];

/**
 * Canonical list of all purchasable plans.
 */
export const ALL_PLANS: PricingPlan[] = [...SUBSCRIPTION_PLANS];

/* ------------------------------------------------------------------ *
 * Backwards-compatibility exports.
 * The platform no longer sells individual stages, individual SaaS
 * products, or one-time packages. These exports are kept ONLY so that
 * any code still importing them continues to type-check and not crash.
 * They should be treated as deprecated and removed once all references
 * are migrated to SUBSCRIPTION_PLANS / ALL_PLANS.
 * ------------------------------------------------------------------ */

/** @deprecated Individual stage purchases are discontinued. */
export const STAGE_PLANS: PricingPlan[] = [];

/** @deprecated Individual SaaS purchases are discontinued. */
export const SAAS_PLANS: PricingPlan[] = [];

/** @deprecated One-time packages are replaced by All-Access subscription. */
export const PACKAGE_PLANS: PricingPlan[] = [...SUBSCRIPTION_PLANS];

/**
 * @deprecated Subscriptions are no longer billed in fixed 3-month cycles.
 * Kept to avoid breaking imports; monthly = 1, annual = 12.
 */
export const BILLING_CYCLE_MONTHS = 1;
