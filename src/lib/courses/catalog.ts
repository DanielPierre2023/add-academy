/**
 * ADD Academy Course Catalog — extensible multi-course architecture.
 *
 * Each course is a self-contained module that can be:
 * - Sold individually or as part of packages
 * - Extended with new stages/lectures
 * - Gated behind subscription tiers
 *
 * Current courses:
 * 1. Build LLMs from Scratch (the original academy)
 * 2. GenAI SaaS Products (PixelForge, ClipCraft, etc.)
 *
 * Planned courses:
 * 3. AgenticAI — How to create & run AI agents
 * 4. Advanced AI Models — Fine-tuning, RLHF, DPO
 * 5. MLOps & Deployment — Production ML systems
 */

export interface CourseDefinition {
  id: string;
  slug: string;
  name: Record<string, string>;
  shortName: Record<string, string>;
  description: Record<string, string>;
  icon: string;
  category: 'llm' | 'genai_saas' | 'agentic_ai' | 'advanced_models' | 'mlops';
  color: string; // Tailwind color class
  isActive: boolean;
  isComingSoon: boolean;
  stages: CourseStage[];
  /** Sort order in the catalog */
  order: number;
}

export interface CourseStage {
  number: number;
  name: Record<string, string>;
  lectureCount: number;
  isFree: boolean;
}

export const COURSE_CATALOG: CourseDefinition[] = [
  {
    id: 'llm-from-scratch',
    slug: 'llm',
    name: {
      en: 'Build LLMs from Scratch',
      ro: 'Construiește LLM-uri de la Zero',
      el: 'Κατασκευή LLM από το Μηδέν',
    },
    shortName: { en: 'LLM Course', ro: 'Curs LLM', el: 'Μάθημα LLM' },
    description: {
      en: 'An interactive course taking you from zero to building large language models from scratch. Learn transformers, attention, tokenization, training, and deployment.',
      ro: 'Un curs interactiv care te duce de la zero la construirea modelelor lingvistice mari de la zero.',
      el: 'Ένα διαδραστικό μάθημα που σας μαθαίνει LLM από το μηδέν.',
    },
    icon: '🧠',
    category: 'llm',
    color: 'bg-blue-500',
    isActive: true,
    isComingSoon: false,
    stages: [
      { number: 0, name: { en: 'Getting Started', ro: 'Introducere', el: 'Εισαγωγή' }, lectureCount: 3, isFree: true },
      { number: 1, name: { en: 'LLM Fundamentals', ro: 'Fundamentele LLM', el: 'Θεμέλια LLM' }, lectureCount: 7, isFree: true },
      { number: 2, name: { en: 'Tokenization & Data', ro: 'Tokenizare', el: 'Tokenization' }, lectureCount: 8, isFree: false },
      { number: 3, name: { en: 'Attention Mechanism', ro: 'Mecanismul Atenției', el: 'Μηχανισμός Προσοχής' }, lectureCount: 6, isFree: false },
      { number: 4, name: { en: 'LLM Architecture', ro: 'Arhitectura LLM', el: 'Αρχιτεκτονική LLM' }, lectureCount: 8, isFree: false },
      { number: 5, name: { en: 'Pretraining', ro: 'Pre-antrenare', el: 'Προεκπαίδευση' }, lectureCount: 8, isFree: false },
      { number: 6, name: { en: 'Fine-tuning', ro: 'Ajustare Fină', el: 'Μικρορύθμιση' }, lectureCount: 7, isFree: false },
    ],
    order: 1,
  },
  {
    id: 'genai-saas',
    slug: 'genai',
    name: {
      en: 'GenAI SaaS Products',
      ro: 'Produse GenAI SaaS',
      el: 'Προϊόντα GenAI SaaS',
    },
    shortName: { en: 'GenAI SaaS', ro: 'GenAI SaaS', el: 'GenAI SaaS' },
    description: {
      en: 'Build and deploy 5 production GenAI SaaS applications: image generation, video editing, writing, fact-checking, and document analysis.',
      ro: 'Construiește și lansează 5 aplicații GenAI SaaS de producție.',
      el: 'Κατασκευή και ανάπτυξη 5 εφαρμογών GenAI SaaS.',
    },
    icon: '🚀',
    category: 'genai_saas',
    color: 'bg-amber-500',
    isActive: true,
    isComingSoon: false,
    stages: [
      { number: 7, name: { en: 'GenAI Applications', ro: 'Aplicații GenAI', el: 'Εφαρμογές GenAI' }, lectureCount: 5, isFree: false },
    ],
    order: 2,
  },
  {
    id: 'agentic-ai',
    slug: 'agents',
    name: {
      en: 'AgenticAI — Build AI Agents',
      ro: 'AgenticAI — Construiește Agenți AI',
      el: 'AgenticAI — Κατασκευή AI Agents',
    },
    shortName: { en: 'AgenticAI', ro: 'AgenticAI', el: 'AgenticAI' },
    description: {
      en: 'Learn how to create, orchestrate, and deploy autonomous AI agents. From simple tool-using agents to complex multi-agent systems.',
      ro: 'Învață cum să creezi, orchestrezi și să lansezi agenți AI autonomi.',
      el: 'Μάθετε πώς να δημιουργείτε, ενορχηστρώνετε και αναπτύσσετε αυτόνομους AI agents.',
    },
    icon: '🤖',
    category: 'agentic_ai',
    color: 'bg-purple-500',
    isActive: false,
    isComingSoon: true,
    stages: [
      { number: 0, name: { en: 'Agent Fundamentals', ro: 'Fundamentele Agenților', el: 'Θεμέλια Agents' }, lectureCount: 0, isFree: true },
      { number: 1, name: { en: 'Tool Use & Function Calling', ro: 'Utilizarea Uneltelor', el: 'Χρήση Εργαλείων' }, lectureCount: 0, isFree: false },
      { number: 2, name: { en: 'Multi-Agent Systems', ro: 'Sisteme Multi-Agent', el: 'Πολυ-Agent Συστήματα' }, lectureCount: 0, isFree: false },
      { number: 3, name: { en: 'Production Deployment', ro: 'Lansare în Producție', el: 'Ανάπτυξη Παραγωγής' }, lectureCount: 0, isFree: false },
    ],
    order: 3,
  },
  {
    id: 'advanced-models',
    slug: 'advanced',
    name: {
      en: 'Advanced AI Models',
      ro: 'Modele AI Avansate',
      el: 'Προηγμένα Μοντέλα AI',
    },
    shortName: { en: 'Advanced AI', ro: 'AI Avansat', el: 'Προηγμένο AI' },
    description: {
      en: 'Deep dive into advanced techniques: RLHF, DPO, constitutional AI, mixture of experts, multimodal models, and more.',
      ro: 'Aprofundare în tehnici avansate: RLHF, DPO, AI constituțional, mixture of experts.',
      el: 'Εμβάθυνση σε προηγμένες τεχνικές: RLHF, DPO, constitutional AI.',
    },
    icon: '⚡',
    category: 'advanced_models',
    color: 'bg-red-500',
    isActive: false,
    isComingSoon: true,
    stages: [
      { number: 0, name: { en: 'RLHF & DPO', ro: 'RLHF & DPO', el: 'RLHF & DPO' }, lectureCount: 0, isFree: false },
      { number: 1, name: { en: 'Multimodal Models', ro: 'Modele Multimodale', el: 'Πολυτροπικά Μοντέλα' }, lectureCount: 0, isFree: false },
      { number: 2, name: { en: 'Mixture of Experts', ro: 'Mixture of Experts', el: 'Mixture of Experts' }, lectureCount: 0, isFree: false },
    ],
    order: 4,
  },
];

export function getActiveCourses(): CourseDefinition[] {
  return COURSE_CATALOG.filter((c) => c.isActive).sort((a, b) => a.order - b.order);
}

export function getComingSoonCourses(): CourseDefinition[] {
  return COURSE_CATALOG.filter((c) => c.isComingSoon).sort((a, b) => a.order - b.order);
}

export function getCourseBySlug(slug: string): CourseDefinition | undefined {
  return COURSE_CATALOG.find((c) => c.slug === slug);
}
