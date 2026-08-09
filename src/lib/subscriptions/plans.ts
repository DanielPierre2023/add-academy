/**
 * ADD Academy subscription plans.
 *
 * Pricing model:
 * - Stage 0 & 1 are FREE for everyone
 * - Individual stages (2–7) can be purchased
 * - Individual GenAI SaaS products can be purchased
 * - Packages: full LLM course, all 5 SaaS, or full access
 * - Discounts apply for packages vs individual
 * - All subscriptions are 3-month billing cycles
 * - Organization users get full access at no cost
 */

export interface PricingPlan {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  type: 'stage' | 'saas' | 'package';
  /** Price in EUR per 3-month cycle */
  price: number;
  /** Original price before discount (for display) */
  originalPrice?: number;
  /** What this plan unlocks */
  includes: {
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

export const STAGE_PLANS: PricingPlan[] = [
  {
    id: 'stage-2',
    name: { en: 'Stage 2: Tokenization & Data', ro: 'Etapa 2: Tokenizare', el: 'Στάδιο 2: Tokenization' },
    description: { en: '8 lectures on tokenization, BPE, data pipelines', ro: '8 lecții despre tokenizare', el: '8 μαθήματα για tokenization' },
    type: 'stage',
    price: 19,
    includes: { stages: [2] },
  },
  {
    id: 'stage-3',
    name: { en: 'Stage 3: Attention Mechanism', ro: 'Etapa 3: Mecanismul Atenției', el: 'Στάδιο 3: Μηχανισμός Προσοχής' },
    description: { en: '6 lectures on self-attention, multi-head attention', ro: '6 lecții despre atenție', el: '6 μαθήματα για attention' },
    type: 'stage',
    price: 19,
    includes: { stages: [3] },
  },
  {
    id: 'stage-4',
    name: { en: 'Stage 4: LLM Architecture', ro: 'Etapa 4: Arhitectura LLM', el: 'Στάδιο 4: Αρχιτεκτονική LLM' },
    description: { en: '8 lectures on transformer architecture, GPT', ro: '8 lecții despre arhitectura GPT', el: '8 μαθήματα για αρχιτεκτονική' },
    type: 'stage',
    price: 24,
    includes: { stages: [4] },
  },
  {
    id: 'stage-5',
    name: { en: 'Stage 5: Pretraining', ro: 'Etapa 5: Pre-antrenare', el: 'Στάδιο 5: Προεκπαίδευση' },
    description: { en: '8 lectures on pretraining, distributed training', ro: '8 lecții despre pre-antrenare', el: '8 μαθήματα για προεκπαίδευση' },
    type: 'stage',
    price: 24,
    includes: { stages: [5] },
  },
  {
    id: 'stage-6',
    name: { en: 'Stage 6: Fine-tuning', ro: 'Etapa 6: Ajustare fină', el: 'Στάδιο 6: Μικρορύθμιση' },
    description: { en: '7 lectures on SFT, RLHF, LoRA, evaluation', ro: '7 lecții despre fine-tuning', el: '7 μαθήματα για μικρορύθμιση' },
    type: 'stage',
    price: 24,
    includes: { stages: [6] },
  },
];

export const SAAS_PLANS: PricingPlan[] = SAAS_PRODUCTS.map((product) => ({
  id: `saas-${product.id}`,
  name: { en: product.name, ro: product.name, el: product.name },
  description: { en: product.description, ro: product.description, el: product.description },
  type: 'saas' as const,
  price: 14,
  includes: { products: [product.id] },
}));

export const PACKAGE_PLANS: PricingPlan[] = [
  {
    id: 'llm-course',
    name: { en: 'Full LLM Course', ro: 'Curs LLM Complet', el: 'Πλήρες Μάθημα LLM' },
    description: {
      en: 'All 7 stages (44 lectures) — build an LLM from scratch',
      ro: 'Toate cele 7 etape (44 lecții)',
      el: 'Όλα τα 7 στάδια (44 μαθήματα)',
    },
    type: 'package',
    price: 79,
    originalPrice: 110,
    includes: { stages: [2, 3, 4, 5, 6] },
    badge: { en: 'Save 28%', ro: 'Economisești 28%', el: 'Εξοικονομήστε 28%' },
  },
  {
    id: 'saas-bundle',
    name: { en: 'GenAI SaaS Bundle', ro: 'Pachet GenAI SaaS', el: 'Πακέτο GenAI SaaS' },
    description: {
      en: 'All 5 GenAI SaaS products: PixelForge, ClipCraft, ProseAI, TruthLens, DocMind',
      ro: 'Toate cele 5 produse GenAI SaaS',
      el: 'Και τα 5 προϊόντα GenAI SaaS',
    },
    type: 'package',
    price: 49,
    originalPrice: 70,
    includes: { products: ['pixelforge', 'clipcraft', 'proseai', 'truthlens', 'docmind'] },
    badge: { en: 'Save 30%', ro: 'Economisești 30%', el: 'Εξοικονομήστε 30%' },
    popular: true,
  },
  {
    id: 'full-access',
    name: { en: 'Full Access', ro: 'Acces Complet', el: 'Πλήρης Πρόσβαση' },
    description: {
      en: 'Everything: LLM course + all GenAI SaaS + future courses (AgenticAI, etc.)',
      ro: 'Totul: Curs LLM + toate GenAI SaaS + cursuri viitoare',
      el: 'Τα πάντα: Μάθημα LLM + όλα τα GenAI SaaS + μελλοντικά',
    },
    type: 'package',
    price: 99,
    originalPrice: 180,
    includes: {
      stages: [2, 3, 4, 5, 6],
      products: ['pixelforge', 'clipcraft', 'proseai', 'truthlens', 'docmind'],
    },
    badge: { en: 'Best Value', ro: 'Cel Mai Avantajos', el: 'Καλύτερη Αξία' },
    popular: true,
  },
];

export const ALL_PLANS = [...PACKAGE_PLANS, ...STAGE_PLANS, ...SAAS_PLANS];

/** Billing cycle in months */
export const BILLING_CYCLE_MONTHS = 3;
