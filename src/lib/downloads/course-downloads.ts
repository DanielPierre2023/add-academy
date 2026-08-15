/**
 * Downloadable product definitions for ADD Academy.
 *
 * Two categories of downloads:
 *
 * 1. NeuralForge LLM — the LLM built during the course, ready to deploy.
 *    Unlocked when the student has paid for the full LLM course (all stages).
 *
 * 2. GenAI SaaS products — each is a SEPARATE download.
 *    Each product is individually gated: you can only download what you paid for.
 *    - Paid for DocMind only → download DocMind ZIP only
 *    - Paid for all 5 → download all 5 ZIPs
 *
 * Files live in a PRIVATE Supabase Storage bucket ("product-downloads").
 * They are NEVER served by a public URL — the browser hits the gated route
 * /api/downloads/[id], which re-verifies entitlement + course completion on the
 * server and returns a short-lived signed URL. `storagePath` is the object path
 * inside that bucket; `available` is flipped to true once the ZIP is uploaded.
 */

export interface ProductDownload {
  id: string;
  /** 'llm' for the NeuralForge LLM, 'saas' for individual SaaS products */
  type: 'llm' | 'saas';
  /** For SaaS products, matches the product ID in plans.ts */
  productId?: string;
  name: Record<string, string>;
  description: Record<string, string>;
  icon: string;
  fileName: string;
  /** Object path inside the private "product-downloads" bucket. */
  storagePath: string;
  /** true once the ZIP has been uploaded to the bucket (flip on after upload). */
  available: boolean;
  fileSize: string;
  /** What's inside the ZIP */
  contents: Record<string, string>;
}

/**
 * NeuralForge LLM — the complete LLM built during stages 0–6.
 * Requires: full LLM course subscription (llm_course or full_access tier,
 * or all stages 2–6 individually purchased).
 */
export const NEURALFORGE_DOWNLOAD: ProductDownload = {
  id: 'neuralforge-llm',
  type: 'llm',
  name: {
    en: 'NeuralForge LLM',
    ro: 'NeuralForge LLM',
    el: 'NeuralForge LLM',
  },
  description: {
    en: 'The complete NeuralForge large language model you built during the course — trained, fine-tuned, and ready to deploy.',
    ro: 'Modelul lingvistic NeuralForge complet pe care l-ai construit in timpul cursului — antrenat, ajustat fin si gata de deployment.',
    el: 'Το πλήρες γλωσσικό μοντέλο NeuralForge που κατασκευάσατε κατά τη διάρκεια του μαθήματος — εκπαιδευμένο, fine-tuned και έτοιμο για ανάπτυξη.',
  },
  icon: '🧠',
  fileName: 'NeuralForge-LLM-Deploy.zip',
  storagePath: 'neuralforge-llm/NeuralForge-LLM-Deploy.zip',
  available: false,
  fileSize: '~250 MB',
  contents: {
    en: 'Trained model weights, tokenizer, inference server (FastAPI), Docker configuration, deployment scripts, environment templates, README with setup instructions',
    ro: 'Ponderi model antrenat, tokenizer, server de inferenta (FastAPI), configuratie Docker, scripturi de deployment, template-uri de mediu, README cu instructiuni de instalare',
    el: 'Βάρη εκπαιδευμένου μοντέλου, tokenizer, server εξαγωγής (FastAPI), ρυθμίσεις Docker, scripts ανάπτυξης, πρότυπα περιβάλλοντος, README με οδηγίες εγκατάστασης',
  },
};

/**
 * Individual GenAI SaaS product downloads.
 * Each is independently gated by subscription — download only what you paid for.
 */
export const SAAS_DOWNLOADS: ProductDownload[] = [
  {
    id: 'pixelforge',
    type: 'saas',
    productId: 'pixelforge',
    name: { en: 'PixelForge', ro: 'PixelForge', el: 'PixelForge' },
    description: {
      en: 'AI image generation & editing SaaS — ready to deploy with Replicate / Stability AI integration.',
      ro: 'SaaS de generare si editare imagini AI — gata de deployment cu integrare Replicate / Stability AI.',
      el: 'AI SaaS δημιουργίας & επεξεργασίας εικόνων — έτοιμο για ανάπτυξη με ενσωμάτωση Replicate / Stability AI.',
    },
    icon: '🎨',
    fileName: 'PixelForge-SaaS-Deploy.zip',
    storagePath: 'saas/PixelForge-SaaS-Deploy.zip',
    available: false,
    fileSize: '~45 MB',
    contents: {
      en: 'Next.js app, Replicate/Stability AI integration, image editor UI, gallery system, Supabase schema, Stripe billing, Vercel deployment config',
      ro: 'Aplicatie Next.js, integrare Replicate/Stability AI, editor imagini, sistem galerie, schema Supabase, facturare Stripe, configuratie Vercel',
      el: 'Εφαρμογή Next.js, ενσωμάτωση Replicate/Stability AI, επεξεργαστής εικόνων, σύστημα gallery, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Vercel',
    },
  },
  {
    id: 'clipcraft',
    type: 'saas',
    productId: 'clipcraft',
    name: { en: 'ClipCraft', ro: 'ClipCraft', el: 'ClipCraft' },
    description: {
      en: 'AI video creation & editing SaaS — ready to deploy with RunwayML / Luma integration.',
      ro: 'SaaS de creare si editare video AI — gata de deployment cu integrare RunwayML / Luma.',
      el: 'AI SaaS δημιουργίας & επεξεργασίας βίντεο — έτοιμο για ανάπτυξη με ενσωμάτωση RunwayML / Luma.',
    },
    icon: '🎬',
    fileName: 'ClipCraft-SaaS-Deploy.zip',
    storagePath: 'saas/ClipCraft-SaaS-Deploy.zip',
    available: false,
    fileSize: '~40 MB',
    contents: {
      en: 'Next.js app, RunwayML/Luma video generation, timeline editor, export system, Supabase schema, Stripe billing, Docker config',
      ro: 'Aplicatie Next.js, generare video RunwayML/Luma, editor timeline, sistem export, schema Supabase, facturare Stripe, configuratie Docker',
      el: 'Εφαρμογή Next.js, δημιουργία βίντεο RunwayML/Luma, επεξεργαστής timeline, σύστημα εξαγωγής, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Docker',
    },
  },
  {
    id: 'proseai',
    type: 'saas',
    productId: 'proseai',
    name: { en: 'ProseAI', ro: 'ProseAI', el: 'ProseAI' },
    description: {
      en: 'AI writing & content generation SaaS — ready to deploy with OpenAI / Anthropic integration.',
      ro: 'SaaS de scriere si generare continut AI — gata de deployment cu integrare OpenAI / Anthropic.',
      el: 'AI SaaS συγγραφής & δημιουργίας περιεχομένου — έτοιμο για ανάπτυξη με ενσωμάτωση OpenAI / Anthropic.',
    },
    icon: '✍️',
    fileName: 'ProseAI-SaaS-Deploy.zip',
    storagePath: 'saas/ProseAI-SaaS-Deploy.zip',
    available: false,
    fileSize: '~35 MB',
    contents: {
      en: 'Next.js app, OpenAI/Anthropic streaming, rich text editor, templates system, SEO tools, Supabase schema, Stripe billing, Vercel config',
      ro: 'Aplicatie Next.js, streaming OpenAI/Anthropic, editor text formatat, sistem template-uri, instrumente SEO, schema Supabase, facturare Stripe, configuratie Vercel',
      el: 'Εφαρμογή Next.js, streaming OpenAI/Anthropic, επεξεργαστής κειμένου, σύστημα templates, εργαλεία SEO, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Vercel',
    },
  },
  {
    id: 'truthlens',
    type: 'saas',
    productId: 'truthlens',
    name: { en: 'TruthLens', ro: 'TruthLens', el: 'TruthLens' },
    description: {
      en: 'AI fact-checking & verification SaaS — ready to deploy with web search and RAG pipeline.',
      ro: 'SaaS de verificare facte AI — gata de deployment cu cautare web si pipeline RAG.',
      el: 'AI SaaS επαλήθευσης γεγονότων — έτοιμο για ανάπτυξη με αναζήτηση web και pipeline RAG.',
    },
    icon: '🔍',
    fileName: 'TruthLens-SaaS-Deploy.zip',
    storagePath: 'saas/TruthLens-SaaS-Deploy.zip',
    available: false,
    fileSize: '~38 MB',
    contents: {
      en: 'Next.js app, RAG pipeline with embeddings, web search integration, claim analysis engine, source scoring, Supabase schema + pgvector, Stripe billing, Docker config',
      ro: 'Aplicatie Next.js, pipeline RAG cu embeddings, integrare cautare web, motor analiza afirmatii, scor surse, schema Supabase + pgvector, facturare Stripe, configuratie Docker',
      el: 'Εφαρμογή Next.js, pipeline RAG με embeddings, ενσωμάτωση αναζήτησης web, μηχανή ανάλυσης ισχυρισμών, βαθμολόγηση πηγών, σχήμα Supabase + pgvector, τιμολόγηση Stripe, ρυθμίσεις Docker',
    },
  },
  {
    id: 'docmind',
    type: 'saas',
    productId: 'docmind',
    name: { en: 'DocMind', ro: 'DocMind', el: 'DocMind' },
    description: {
      en: 'AI document analysis & extraction SaaS — ready to deploy with OCR and structured data extraction.',
      ro: 'SaaS de analiza si extractie documente AI — gata de deployment cu OCR si extractie date structurate.',
      el: 'AI SaaS ανάλυσης & εξαγωγής εγγράφων — έτοιμο για ανάπτυξη με OCR και εξαγωγή δομημένων δεδομένων.',
    },
    icon: '📄',
    fileName: 'DocMind-SaaS-Deploy.zip',
    storagePath: 'saas/DocMind-SaaS-Deploy.zip',
    available: false,
    fileSize: '~42 MB',
    contents: {
      en: 'Next.js app, PDF/image OCR pipeline, structured data extraction, template matching, export to CSV/JSON, Supabase schema, Stripe billing, Vercel config',
      ro: 'Aplicatie Next.js, pipeline OCR PDF/imagini, extractie date structurate, potrivire template-uri, export CSV/JSON, schema Supabase, facturare Stripe, configuratie Vercel',
      el: 'Εφαρμογή Next.js, pipeline OCR PDF/εικόνων, εξαγωγή δομημένων δεδομένων, αντιστοίχιση templates, εξαγωγή CSV/JSON, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Vercel',
    },
  },
];

/** All downloads in one array for convenience */
export const ALL_DOWNLOADS: ProductDownload[] = [NEURALFORGE_DOWNLOAD, ...SAAS_DOWNLOADS];

export function getDownloadById(id: string): ProductDownload | undefined {
  return ALL_DOWNLOADS.find((d) => d.id === id);
}
