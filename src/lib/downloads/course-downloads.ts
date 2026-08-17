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
    de: 'NeuralForge LLM',
    fr: 'NeuralForge LLM',
    it: 'NeuralForge LLM',
    ar: 'NeuralForge LLM',
  },
  description: {
    en: 'The complete NeuralForge large language model you built during the course — trained, fine-tuned, and ready to deploy.',
    ro: 'Modelul lingvistic NeuralForge complet pe care l-ai construit in timpul cursului — antrenat, ajustat fin si gata de deployment.',
    el: 'Το πλήρες γλωσσικό μοντέλο NeuralForge που κατασκευάσατε κατά τη διάρκεια του μαθήματος — εκπαιδευμένο, fine-tuned και έτοιμο για ανάπτυξη.',
    de: 'Das vollständige NeuralForge-Sprachmodell, das du während des Kurses gebaut hast — trainiert, feinabgestimmt und bereit für den Einsatz.',
    fr: 'Le modèle de langage NeuralForge complet que vous avez construit pendant le cours — entraîné, affiné et prêt à être déployé.',
    it: 'Il modello linguistico NeuralForge completo che hai costruito durante il corso — addestrato, ottimizzato e pronto per il deployment.',
    ar: 'نموذج NeuralForge اللغوي الكامل الذي بنيته أثناء الدورة — مدرَّب ومضبوط بدقة وجاهز للنشر.',
  },
  icon: '🧠',
  fileName: 'NeuralForge-LLM-Deploy.zip',
  storagePath: 'neuralforge-llm/NeuralForgeLLMDeploy.zip',
  available: true,
  fileSize: '~1 MB source · GPT-2 weights (~500 MB) fetched at setup',
  contents: {
    en: 'GPT-2 model (NumPy + PyTorch) + training script, official GPT-2 weights loader (fetched at setup), BPE tokenizer, FastAPI inference server with streaming, Docker + Vercel deploy config, environment templates, README with setup instructions',
    ro: 'Model GPT-2 (NumPy + PyTorch) + script de antrenare, loader pentru ponderile oficiale GPT-2 (descărcate la instalare), tokenizer BPE, server de inferență FastAPI cu streaming, configurație Docker + Vercel, template-uri de mediu, README cu instrucțiuni de instalare',
    el: 'Μοντέλο GPT-2 (NumPy + PyTorch) + script εκπαίδευσης, loader για τα επίσημα βάρη GPT-2 (λήψη κατά την εγκατάσταση), BPE tokenizer, διακομιστής inference FastAPI με streaming, ρυθμίσεις Docker + Vercel, πρότυπα περιβάλλοντος, README με οδηγίες εγκατάστασης',
    de: 'GPT-2-Modell (NumPy + PyTorch) + Trainingsskript, offizieller GPT-2-Gewichts-Loader (wird beim Setup geladen), BPE-Tokenizer, FastAPI-Inferenzserver mit Streaming, Docker- + Vercel-Deploy-Konfiguration, Umgebungsvorlagen, README mit Einrichtungsanleitung',
    fr: "Modèle GPT-2 (NumPy + PyTorch) + script d'entraînement, chargeur des poids GPT-2 officiels (récupéré à la configuration), tokenizer BPE, serveur d'inférence FastAPI avec streaming, configuration de déploiement Docker + Vercel, modèles d'environnement, README avec instructions d'installation",
    it: 'Modello GPT-2 (NumPy + PyTorch) + script di addestramento, loader dei pesi ufficiali GPT-2 (scaricati durante il setup), tokenizer BPE, server di inferenza FastAPI con streaming, configurazione di deploy Docker + Vercel, template di ambiente, README con istruzioni di installazione',
    ar: 'نموذج GPT-2 (NumPy + PyTorch) + سكربت التدريب، محمّل أوزان GPT-2 الرسمية (يُجلب أثناء الإعداد)، مُرمِّز BPE، خادم استدلال FastAPI مع البث المباشر، إعدادات نشر Docker وVercel، قوالب بيئة، وملف README بتعليمات الإعداد',
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
    name: { en: 'PixelForge', ro: 'PixelForge', el: 'PixelForge', de: 'PixelForge', fr: 'PixelForge', it: 'PixelForge', ar: 'PixelForge' },
    description: {
      en: 'AI image generation & editing SaaS — ready to deploy with Replicate / Stability AI integration.',
      ro: 'SaaS de generare si editare imagini AI — gata de deployment cu integrare Replicate / Stability AI.',
      el: 'AI SaaS δημιουργίας & επεξεργασίας εικόνων — έτοιμο για ανάπτυξη με ενσωμάτωση Replicate / Stability AI.',
      de: 'KI-SaaS zur Bilderzeugung & -bearbeitung — einsatzbereit mit Replicate-/Stability-AI-Integration.',
      fr: "SaaS de génération et d'édition d'images IA — prêt à déployer avec intégration Replicate / Stability AI.",
      it: 'SaaS per la generazione e modifica di immagini IA — pronto per il deploy con integrazione Replicate / Stability AI.',
      ar: 'خدمة SaaS لتوليد وتحرير الصور بالذكاء الاصطناعي — جاهزة للنشر مع تكامل Replicate / Stability AI.',
    },
    icon: '🎨',
    fileName: 'PixelForge-SaaS-Deploy.zip',
    storagePath: 'saas/PixelForgeSaaSDeploy.zip',
    available: true,
    fileSize: '~0.4 MB source',
    contents: {
      en: 'FastAPI app, Replicate/Stability AI integration, image editor UI, gallery system, Supabase schema, Stripe billing, Vercel deployment config',
      ro: 'Aplicație FastAPI, integrare Replicate/Stability AI, editor imagini, sistem galerie, schema Supabase, facturare Stripe, configuratie Vercel',
      el: 'Εφαρμογή FastAPI, ενσωμάτωση Replicate/Stability AI, επεξεργαστής εικόνων, σύστημα gallery, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Vercel',
      de: 'FastAPI-App, Replicate/Stability-AI-Integration, Bildeditor-UI, Galeriesystem, Supabase-Schema, Stripe-Abrechnung, Vercel-Deployment-Konfiguration',
      fr: "Application FastAPI, intégration Replicate/Stability AI, interface d'édition d'images, système de galerie, schéma Supabase, facturation Stripe, configuration de déploiement Vercel",
      it: 'App FastAPI, integrazione Replicate/Stability AI, editor immagini UI, sistema galleria, schema Supabase, fatturazione Stripe, configurazione di deploy Vercel',
      ar: 'تطبيق FastAPI، تكامل Replicate/Stability AI، واجهة محرر صور، نظام معرض، مخطط Supabase، فوترة Stripe، إعدادات نشر Vercel',
    },
  },
  {
    id: 'clipcraft',
    type: 'saas',
    productId: 'clipcraft',
    name: { en: 'ClipCraft', ro: 'ClipCraft', el: 'ClipCraft', de: 'ClipCraft', fr: 'ClipCraft', it: 'ClipCraft', ar: 'ClipCraft' },
    description: {
      en: 'AI video creation & editing SaaS — ready to deploy with RunwayML / Luma integration.',
      ro: 'SaaS de creare si editare video AI — gata de deployment cu integrare RunwayML / Luma.',
      el: 'AI SaaS δημιουργίας & επεξεργασίας βίντεο — έτοιμο για ανάπτυξη με ενσωμάτωση RunwayML / Luma.',
      de: 'KI-SaaS zur Videoerstellung & -bearbeitung — einsatzbereit mit RunwayML-/Luma-Integration.',
      fr: "SaaS de création et de montage vidéo IA — prêt à déployer avec intégration RunwayML / Luma.",
      it: 'SaaS per la creazione e modifica di video IA — pronto per il deploy con integrazione RunwayML / Luma.',
      ar: 'خدمة SaaS لإنشاء وتحرير الفيديو بالذكاء الاصطناعي — جاهزة للنشر مع تكامل RunwayML / Luma.',
    },
    icon: '🎬',
    fileName: 'ClipCraft-SaaS-Deploy.zip',
    storagePath: 'saas/ClipCraftSaaSDeploy.zip',
    available: true,
    fileSize: '~0.4 MB source',
    contents: {
      en: 'FastAPI app, RunwayML/Luma video generation, timeline editor, export system, Supabase schema, Stripe billing, Docker config',
      ro: 'Aplicație FastAPI, generare video RunwayML/Luma, editor timeline, sistem export, schema Supabase, facturare Stripe, configuratie Docker',
      el: 'Εφαρμογή FastAPI, δημιουργία βίντεο RunwayML/Luma, επεξεργαστής timeline, σύστημα εξαγωγής, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Docker',
      de: 'FastAPI-App, RunwayML/Luma-Videogenerierung, Timeline-Editor, Exportsystem, Supabase-Schema, Stripe-Abrechnung, Docker-Konfiguration',
      fr: "Application FastAPI, génération vidéo RunwayML/Luma, éditeur de chronologie, système d'export, schéma Supabase, facturation Stripe, configuration Docker",
      it: 'App FastAPI, generazione video RunwayML/Luma, editor timeline, sistema di esportazione, schema Supabase, fatturazione Stripe, configurazione Docker',
      ar: 'تطبيق FastAPI، توليد فيديو RunwayML/Luma، محرر الجدول الزمني، نظام تصدير، مخطط Supabase، فوترة Stripe، إعدادات Docker',
    },
  },
  {
    id: 'proseai',
    type: 'saas',
    productId: 'proseai',
    name: { en: 'ProseAI', ro: 'ProseAI', el: 'ProseAI', de: 'ProseAI', fr: 'ProseAI', it: 'ProseAI', ar: 'ProseAI' },
    description: {
      en: 'AI writing & content generation SaaS — ready to deploy with OpenAI / Anthropic integration.',
      ro: 'SaaS de scriere si generare continut AI — gata de deployment cu integrare OpenAI / Anthropic.',
      el: 'AI SaaS συγγραφής & δημιουργίας περιεχομένου — έτοιμο για ανάπτυξη με ενσωμάτωση OpenAI / Anthropic.',
      de: 'KI-SaaS zum Schreiben & Erstellen von Inhalten — einsatzbereit mit OpenAI-/Anthropic-Integration.',
      fr: "SaaS de rédaction et de génération de contenu IA — prêt à déployer avec intégration OpenAI / Anthropic.",
      it: 'SaaS per la scrittura e generazione di contenuti IA — pronto per il deploy con integrazione OpenAI / Anthropic.',
      ar: 'خدمة SaaS للكتابة وتوليد المحتوى بالذكاء الاصطناعي — جاهزة للنشر مع تكامل OpenAI / Anthropic.',
    },
    icon: '✍️',
    fileName: 'ProseAI-SaaS-Deploy.zip',
    storagePath: 'saas/ProseAISaaSDeploy.zip',
    available: true,
    fileSize: '~0.4 MB source',
    contents: {
      en: 'FastAPI app, OpenAI/Anthropic streaming, rich text editor, templates system, SEO tools, Supabase schema, Stripe billing, Vercel config',
      ro: 'Aplicație FastAPI, streaming OpenAI/Anthropic, editor text formatat, sistem template-uri, instrumente SEO, schema Supabase, facturare Stripe, configuratie Vercel',
      el: 'Εφαρμογή FastAPI, streaming OpenAI/Anthropic, επεξεργαστής κειμένου, σύστημα templates, εργαλεία SEO, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Vercel',
      de: 'FastAPI-App, OpenAI/Anthropic-Streaming, Rich-Text-Editor, Vorlagensystem, SEO-Tools, Supabase-Schema, Stripe-Abrechnung, Vercel-Konfiguration',
      fr: "Application FastAPI, streaming OpenAI/Anthropic, éditeur de texte enrichi, système de modèles, outils SEO, schéma Supabase, facturation Stripe, configuration Vercel",
      it: 'App FastAPI, streaming OpenAI/Anthropic, editor di testo avanzato, sistema di template, strumenti SEO, schema Supabase, fatturazione Stripe, configurazione Vercel',
      ar: 'تطبيق FastAPI، بث OpenAI/Anthropic، محرر نصوص غني، نظام قوالب، أدوات SEO، مخطط Supabase، فوترة Stripe، إعدادات Vercel',
    },
  },
  {
    id: 'truthlens',
    type: 'saas',
    productId: 'truthlens',
    name: { en: 'TruthLens', ro: 'TruthLens', el: 'TruthLens', de: 'TruthLens', fr: 'TruthLens', it: 'TruthLens', ar: 'TruthLens' },
    description: {
      en: 'AI fact-checking & verification SaaS — ready to deploy with web search and RAG pipeline.',
      ro: 'SaaS de verificare facte AI — gata de deployment cu cautare web si pipeline RAG.',
      el: 'AI SaaS επαλήθευσης γεγονότων — έτοιμο για ανάπτυξη με αναζήτηση web και pipeline RAG.',
      de: 'KI-SaaS zur Faktenprüfung & Verifizierung — einsatzbereit mit Websuche und RAG-Pipeline.',
      fr: "SaaS de vérification des faits IA — prêt à déployer avec recherche web et pipeline RAG.",
      it: 'SaaS per il fact-checking e la verifica IA — pronto per il deploy con ricerca web e pipeline RAG.',
      ar: 'خدمة SaaS للتحقق من الحقائق بالذكاء الاصطناعي — جاهزة للنشر مع بحث ويب وخط أنابيب RAG.',
    },
    icon: '🔍',
    fileName: 'TruthLens-SaaS-Deploy.zip',
    storagePath: 'saas/TruthLensSaaSDeploy.zip',
    available: true,
    fileSize: '~0.5 MB source',
    contents: {
      en: 'FastAPI app, RAG pipeline with embeddings, web search integration, claim analysis engine, source scoring, Supabase schema + pgvector, Stripe billing, Docker config',
      ro: 'Aplicație FastAPI, pipeline RAG cu embeddings, integrare cautare web, motor analiza afirmatii, scor surse, schema Supabase + pgvector, facturare Stripe, configuratie Docker',
      el: 'Εφαρμογή FastAPI, pipeline RAG με embeddings, ενσωμάτωση αναζήτησης web, μηχανή ανάλυσης ισχυρισμών, βαθμολόγηση πηγών, σχήμα Supabase + pgvector, τιμολόγηση Stripe, ρυθμίσεις Docker',
      de: 'FastAPI-App, RAG-Pipeline mit Embeddings, Websuche-Integration, Behauptungsanalyse-Engine, Quellenbewertung, Supabase-Schema + pgvector, Stripe-Abrechnung, Docker-Konfiguration',
      fr: "Application FastAPI, pipeline RAG avec embeddings, intégration de recherche web, moteur d'analyse d'affirmations, notation des sources, schéma Supabase + pgvector, facturation Stripe, configuration Docker",
      it: 'App FastAPI, pipeline RAG con embeddings, integrazione ricerca web, motore di analisi delle affermazioni, valutazione delle fonti, schema Supabase + pgvector, fatturazione Stripe, configurazione Docker',
      ar: 'تطبيق FastAPI، خط أنابيب RAG مع التضمينات، تكامل بحث الويب، محرك تحليل الادعاءات، تقييم المصادر، مخطط Supabase + pgvector، فوترة Stripe، إعدادات Docker',
    },
  },
  {
    id: 'docmind',
    type: 'saas',
    productId: 'docmind',
    name: { en: 'DocMind', ro: 'DocMind', el: 'DocMind', de: 'DocMind', fr: 'DocMind', it: 'DocMind', ar: 'DocMind' },
    description: {
      en: 'AI document analysis & extraction SaaS — ready to deploy with OCR and structured data extraction.',
      ro: 'SaaS de analiza si extractie documente AI — gata de deployment cu OCR si extractie date structurate.',
      el: 'AI SaaS ανάλυσης & εξαγωγής εγγράφων — έτοιμο για ανάπτυξη με OCR και εξαγωγή δομημένων δεδομένων.',
      de: 'KI-SaaS zur Dokumentenanalyse & -extraktion — einsatzbereit mit OCR und strukturierter Datenextraktion.',
      fr: "SaaS d'analyse et d'extraction de documents IA — prêt à déployer avec OCR et extraction de données structurées.",
      it: 'SaaS per l\'analisi e l\'estrazione di documenti IA — pronto per il deploy con OCR ed estrazione di dati strutturati.',
      ar: 'خدمة SaaS لتحليل واستخراج المستندات بالذكاء الاصطناعي — جاهزة للنشر مع التعرف الضوئي على الحروف (OCR) واستخراج البيانات المنظمة.',
    },
    icon: '📄',
    fileName: 'DocMind-SaaS-Deploy.zip',
    storagePath: 'saas/DocMindSaaSDeploy.zip',
    available: true,
    fileSize: '~0.5 MB source',
    contents: {
      en: 'FastAPI app, PDF/image OCR pipeline, structured data extraction, template matching, export to CSV/JSON, Supabase schema, Stripe billing, Vercel config',
      ro: 'Aplicație FastAPI, pipeline OCR PDF/imagini, extractie date structurate, potrivire template-uri, export CSV/JSON, schema Supabase, facturare Stripe, configuratie Vercel',
      el: 'Εφαρμογή FastAPI, pipeline OCR PDF/εικόνων, εξαγωγή δομημένων δεδομένων, αντιστοίχιση templates, εξαγωγή CSV/JSON, σχήμα Supabase, τιμολόγηση Stripe, ρυθμίσεις Vercel',
      de: 'FastAPI-App, PDF-/Bild-OCR-Pipeline, strukturierte Datenextraktion, Vorlagenabgleich, Export nach CSV/JSON, Supabase-Schema, Stripe-Abrechnung, Vercel-Konfiguration',
      fr: "Application FastAPI, pipeline OCR PDF/image, extraction de données structurées, correspondance de modèles, export vers CSV/JSON, schéma Supabase, facturation Stripe, configuration Vercel",
      it: 'App FastAPI, pipeline OCR PDF/immagini, estrazione dati strutturati, corrispondenza template, esportazione in CSV/JSON, schema Supabase, fatturazione Stripe, configurazione Vercel',
      ar: 'تطبيق FastAPI، خط أنابيب OCR للملفات PDF/الصور، استخراج بيانات منظمة، مطابقة القوالب، تصدير إلى CSV/JSON، مخطط Supabase، فوترة Stripe، إعدادات Vercel',
    },
  },
];

/** All downloads in one array for convenience */
export const ALL_DOWNLOADS: ProductDownload[] = [NEURALFORGE_DOWNLOAD, ...SAAS_DOWNLOADS];

export function getDownloadById(id: string): ProductDownload | undefined {
  return ALL_DOWNLOADS.find((d) => d.id === id);
}
