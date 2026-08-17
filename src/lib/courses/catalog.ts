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
      de: 'LLMs von Grund auf erstellen',
      fr: 'Créer des LLM à partir de zéro',
      it: 'Costruisci LLM da zero',
      ar: 'بناء نماذج اللغة الكبيرة من الصفر',
    },
    shortName: {
      en: 'LLM Course', ro: 'Curs LLM', el: 'Μάθημα LLM',
      de: 'LLM-Kurs', fr: 'Cours LLM', it: 'Corso LLM', ar: 'دورة النماذج اللغوية',
    },
    description: {
      en: 'An interactive course taking you from zero to building large language models from scratch. Learn transformers, attention, tokenization, training, and deployment.',
      ro: 'Un curs interactiv care te duce de la zero la construirea modelelor lingvistice mari de la zero.',
      el: 'Ένα διαδραστικό μάθημα που σας μαθαίνει LLM από το μηδέν.',
      de: 'Ein interaktiver Kurs, der dich von null zum Aufbau großer Sprachmodelle von Grund auf führt. Lerne Transformer, Attention, Tokenisierung, Training und Deployment.',
      fr: "Un cours interactif qui vous mène de zéro à la construction de grands modèles de langage à partir de zéro. Apprenez les transformers, l'attention, la tokenisation, l'entraînement et le déploiement.",
      it: "Un corso interattivo che ti porta da zero alla costruzione di modelli linguistici di grandi dimensioni da zero. Impara i transformer, l'attenzione, la tokenizzazione, l'addestramento e il deployment.",
      ar: 'دورة تفاعلية تأخذك من الصفر إلى بناء نماذج لغوية كبيرة من الصفر. تعلّم المحولات (Transformers) وآلية الانتباه والترميز والتدريب والنشر.',
    },
    icon: '🧠',
    category: 'llm',
    color: 'bg-blue-500',
    isActive: true,
    isComingSoon: false,
    stages: [
      { number: 0, name: { en: 'Getting Started', ro: 'Introducere', el: 'Εισαγωγή', de: 'Erste Schritte', fr: 'Pour commencer', it: 'Per iniziare', ar: 'البداية' }, lectureCount: 3, isFree: true },
      { number: 1, name: { en: 'LLM Fundamentals', ro: 'Fundamentele LLM', el: 'Θεμέλια LLM', de: 'LLM-Grundlagen', fr: 'Fondamentaux des LLM', it: 'Fondamenti degli LLM', ar: 'أساسيات النماذج اللغوية' }, lectureCount: 7, isFree: true },
      { number: 2, name: { en: 'Tokenization & Data', ro: 'Tokenizare', el: 'Tokenization', de: 'Tokenisierung & Daten', fr: 'Tokenisation et données', it: 'Tokenizzazione e dati', ar: 'الترميز والبيانات' }, lectureCount: 8, isFree: false },
      { number: 3, name: { en: 'Attention Mechanism', ro: 'Mecanismul Atenției', el: 'Μηχανισμός Προσοχής', de: 'Aufmerksamkeitsmechanismus', fr: "Mécanisme d'attention", it: 'Meccanismo di attenzione', ar: 'آلية الانتباه' }, lectureCount: 6, isFree: false },
      { number: 4, name: { en: 'LLM Architecture', ro: 'Arhitectura LLM', el: 'Αρχιτεκτονική LLM', de: 'LLM-Architektur', fr: 'Architecture LLM', it: 'Architettura LLM', ar: 'بنية النماذج اللغوية' }, lectureCount: 8, isFree: false },
      { number: 5, name: { en: 'Pretraining', ro: 'Pre-antrenare', el: 'Προεκπαίδευση', de: 'Vortraining', fr: 'Pré-entraînement', it: 'Pre-addestramento', ar: 'التدريب المسبق' }, lectureCount: 8, isFree: false },
      { number: 6, name: { en: 'Fine-tuning', ro: 'Ajustare Fină', el: 'Μικρορύθμιση', de: 'Feinabstimmung', fr: 'Ajustement fin', it: 'Fine-tuning', ar: 'الضبط الدقيق' }, lectureCount: 7, isFree: false },
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
      de: 'GenAI-SaaS-Produkte',
      fr: 'Produits GenAI SaaS',
      it: 'Prodotti GenAI SaaS',
      ar: 'منتجات GenAI SaaS',
    },
    shortName: {
      en: 'GenAI SaaS', ro: 'GenAI SaaS', el: 'GenAI SaaS',
      de: 'GenAI SaaS', fr: 'GenAI SaaS', it: 'GenAI SaaS', ar: 'GenAI SaaS',
    },
    description: {
      en: 'Build and deploy 5 production GenAI SaaS applications: image generation, video editing, writing, fact-checking, and document analysis.',
      ro: 'Construiește și lansează 5 aplicații GenAI SaaS de producție.',
      el: 'Κατασκευή και ανάπτυξη 5 εφαρμογών GenAI SaaS.',
      de: 'Baue und veröffentliche 5 produktionsreife GenAI-SaaS-Anwendungen: Bilderzeugung, Videobearbeitung, Schreiben, Faktenprüfung und Dokumentenanalyse.',
      fr: "Créez et déployez 5 applications GenAI SaaS de production : génération d'images, montage vidéo, rédaction, vérification des faits et analyse de documents.",
      it: 'Crea e distribuisci 5 applicazioni GenAI SaaS di produzione: generazione di immagini, editing video, scrittura, fact-checking e analisi documenti.',
      ar: 'ابنِ وأطلق 5 تطبيقات GenAI SaaS جاهزة للإنتاج: توليد الصور، تحرير الفيديو، الكتابة، التحقق من الحقائق، وتحليل المستندات.',
    },
    icon: '🚀',
    category: 'genai_saas',
    color: 'bg-amber-500',
    isActive: true,
    isComingSoon: false,
    stages: [
      { number: 7, name: { en: 'GenAI Applications', ro: 'Aplicații GenAI', el: 'Εφαρμογές GenAI', de: 'GenAI-Anwendungen', fr: 'Applications GenAI', it: 'Applicazioni GenAI', ar: 'تطبيقات GenAI' }, lectureCount: 5, isFree: false },
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
      de: 'AgenticAI — KI-Agenten erstellen',
      fr: 'AgenticAI — Créer des agents IA',
      it: 'AgenticAI — Crea agenti IA',
      ar: 'AgenticAI — بناء وكلاء الذكاء الاصطناعي',
    },
    shortName: {
      en: 'AgenticAI', ro: 'AgenticAI', el: 'AgenticAI',
      de: 'AgenticAI', fr: 'AgenticAI', it: 'AgenticAI', ar: 'AgenticAI',
    },
    description: {
      en: 'Learn how to create, orchestrate, and deploy autonomous AI agents. From simple tool-using agents to complex multi-agent systems.',
      ro: 'Învață cum să creezi, orchestrezi și să lansezi agenți AI autonomi.',
      el: 'Μάθετε πώς να δημιουργείτε, ενορχηστρώνετε και αναπτύσσετε αυτόνομους AI agents.',
      de: 'Lerne, wie du autonome KI-Agenten erstellst, orchestrierst und bereitstellst. Von einfachen werkzeugnutzenden Agenten bis zu komplexen Multi-Agent-Systemen.',
      fr: 'Apprenez à créer, orchestrer et déployer des agents IA autonomes. Des agents simples utilisant des outils aux systèmes multi-agents complexes.',
      it: 'Impara a creare, orchestrare e distribuire agenti IA autonomi. Dai semplici agenti che usano strumenti ai complessi sistemi multi-agente.',
      ar: 'تعلّم كيفية إنشاء وتنسيق ونشر وكلاء ذكاء اصطناعي مستقلين. من الوكلاء البسيطة التي تستخدم الأدوات إلى أنظمة متعددة الوكلاء المعقدة.',
    },
    icon: '🤖',
    category: 'agentic_ai',
    color: 'bg-purple-500',
    isActive: false,
    isComingSoon: true,
    stages: [
      { number: 0, name: { en: 'Agent Fundamentals', ro: 'Fundamentele Agenților', el: 'Θεμέλια Agents', de: 'Agenten-Grundlagen', fr: 'Fondamentaux des agents', it: 'Fondamenti degli agenti', ar: 'أساسيات الوكلاء' }, lectureCount: 0, isFree: true },
      { number: 1, name: { en: 'Tool Use & Function Calling', ro: 'Utilizarea Uneltelor', el: 'Χρήση Εργαλείων', de: 'Werkzeugnutzung & Function Calling', fr: "Utilisation d'outils et appel de fonctions", it: 'Uso di strumenti e chiamata di funzioni', ar: 'استخدام الأدوات واستدعاء الوظائف' }, lectureCount: 0, isFree: false },
      { number: 2, name: { en: 'Multi-Agent Systems', ro: 'Sisteme Multi-Agent', el: 'Πολυ-Agent Συστήματα', de: 'Multi-Agent-Systeme', fr: 'Systèmes multi-agents', it: 'Sistemi multi-agente', ar: 'أنظمة متعددة الوكلاء' }, lectureCount: 0, isFree: false },
      { number: 3, name: { en: 'Production Deployment', ro: 'Lansare în Producție', el: 'Ανάπτυξη Παραγωγής', de: 'Produktionsbereitstellung', fr: 'Déploiement en production', it: 'Distribuzione in produzione', ar: 'النشر في بيئة الإنتاج' }, lectureCount: 0, isFree: false },
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
      de: 'Fortgeschrittene KI-Modelle',
      fr: "Modèles d'IA avancés",
      it: 'Modelli IA avanzati',
      ar: 'نماذج الذكاء الاصطناعي المتقدمة',
    },
    shortName: {
      en: 'Advanced AI', ro: 'AI Avansat', el: 'Προηγμένο AI',
      de: 'Fortgeschrittene KI', fr: 'IA avancée', it: 'IA avanzata', ar: 'ذكاء اصطناعي متقدم',
    },
    description: {
      en: 'Deep dive into advanced techniques: RLHF, DPO, constitutional AI, mixture of experts, multimodal models, and more.',
      ro: 'Aprofundare în tehnici avansate: RLHF, DPO, AI constituțional, mixture of experts.',
      el: 'Εμβάθυνση σε προηγμένες τεχνικές: RLHF, DPO, constitutional AI.',
      de: 'Tauche tief in fortgeschrittene Techniken ein: RLHF, DPO, konstitutionelle KI, Mixture of Experts, multimodale Modelle und mehr.',
      fr: "Plongez dans les techniques avancées : RLHF, DPO, IA constitutionnelle, mixture of experts, modèles multimodaux et plus encore.",
      it: 'Approfondisci le tecniche avanzate: RLHF, DPO, IA costituzionale, mixture of experts, modelli multimodali e altro ancora.',
      ar: 'تعمّق في التقنيات المتقدمة: RLHF وDPO والذكاء الاصطناعي الدستوري ومزيج الخبراء والنماذج متعددة الوسائط والمزيد.',
    },
    icon: '⚡',
    category: 'advanced_models',
    color: 'bg-red-500',
    isActive: false,
    isComingSoon: true,
    stages: [
      { number: 0, name: { en: 'RLHF & DPO', ro: 'RLHF & DPO', el: 'RLHF & DPO', de: 'RLHF & DPO', fr: 'RLHF & DPO', it: 'RLHF & DPO', ar: 'RLHF وDPO' }, lectureCount: 0, isFree: false },
      { number: 1, name: { en: 'Multimodal Models', ro: 'Modele Multimodale', el: 'Πολυτροπικά Μοντέλα', de: 'Multimodale Modelle', fr: 'Modèles multimodaux', it: 'Modelli multimodali', ar: 'نماذج متعددة الوسائط' }, lectureCount: 0, isFree: false },
      { number: 2, name: { en: 'Mixture of Experts', ro: 'Mixture of Experts', el: 'Mixture of Experts', de: 'Mixture of Experts', fr: 'Mixture of Experts', it: 'Mixture of Experts', ar: 'Mixture of Experts' }, lectureCount: 0, isFree: false },
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
