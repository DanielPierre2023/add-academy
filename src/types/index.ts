// ═══════════════════════════════════════════
// ADD Academy — Core Type Definitions
// ═══════════════════════════════════════════

export type Language = 'en' | 'ro' | 'el' | 'de' | 'fr' | 'it' | 'ar';

export interface Lecture {
  id: string;
  number: number;
  stage: number;
  stageName: string;
  title: Partial<Record<Language, string>>;
  content: Partial<Record<Language, string>>;
  codeBlocks: CodeBlock[];
  quiz: Quiz | null;
  prev: string | null;
  next: string | null;
  isGenAI: boolean;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  title?: string;
  runnable: boolean;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  index: number;
  text: string;
  options: string[];
  correct: number[];
  explanation: string;
  isMulti: boolean;
}

export interface LectureProgress {
  lectureId: string;
  completed: boolean;
  scrolledToBottom: boolean;
  timeSpent: number;
  quizScore: number | null;
  quizAttempted: boolean;
  codeBlocksRun: string[];
  completedAt: string | null;
}

export interface StudentProfile {
  id: string;
  email: string;
  name: string;
  language: Language;
  theme: 'light' | 'dark';
  enrolledAt: string;
  progress: Record<string, LectureProgress>;
  certificateEarned: boolean;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  lectureContext?: string;
}

// ═══════════════════════════════════════════
// Gamification
// ═══════════════════════════════════════════

export interface Achievement {
  id: string;
  icon: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  condition: (stats: GamificationStats) => boolean;
}

export interface GamificationStats {
  xp: number;
  level: number;
  streak: number;
  lecturesCompleted: number;
  quizzesAttempted: number;
  perfectQuizzes: number;
  codeBlocksRun: number;
  totalTimeSeconds: number;
  stagesCompleted: number;
}

export const XP_VALUES = {
  LECTURE_COMPLETE: 50,
  CODE_BLOCK_RUN: 10,
  QUIZ_BASE: 25,         // base XP for attempting a quiz
  QUIZ_PERFECT_BONUS: 50, // bonus for 100% score
  QUIZ_SCORE_MULTIPLIER: 0.75, // multiplied by score percentage
  DAILY_LOGIN: 15,
  TUTOR_FIRST_QUESTION: 20, // XP for asking first AI tutor question per lecture
} as const;

export function xpForLevel(level: number): number {
  // XP needed to reach a given level: 100, 250, 450, 700, 1000, ...
  return Math.round(100 * level + 50 * (level - 1) * level / 2);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-lecture',
    icon: 'BookOpen',
    name: { en: 'First Steps', ro: 'Primii Pași', el: 'Πρώτα Βήματα', de: 'Erste Schritte', fr: 'Premiers Pas', it: 'Primi Passi', ar: 'الخطوات الأولى' },
    description: { en: 'Complete your first lecture', ro: 'Finalizează prima lecție', el: 'Ολοκληρώστε το πρώτο μάθημα', de: 'Schließe deine erste Lektion ab', fr: 'Terminez votre première leçon', it: 'Completa la tua prima lezione', ar: 'أكمل محاضرتك الأولى' },
    condition: (s) => s.lecturesCompleted >= 1,
  },
  {
    id: 'code-runner',
    icon: 'Terminal',
    name: { en: 'Code Runner', ro: 'Programator', el: 'Προγραμματιστής', de: 'Code-Läufer', fr: 'Exécuteur de Code', it: 'Esecutore di Codice', ar: 'منفّذ الشيفرة' },
    description: { en: 'Run 10 code blocks', ro: 'Rulează 10 blocuri de cod', el: 'Εκτελέστε 10 μπλοκ κώδικα', de: 'Führe 10 Code-Blöcke aus', fr: 'Exécutez 10 blocs de code', it: 'Esegui 10 blocchi di codice', ar: 'شغّل 10 كتل برمجية' },
    condition: (s) => s.codeBlocksRun >= 10,
  },
  {
    id: 'quiz-ace',
    icon: 'Target',
    name: { en: 'Quiz Ace', ro: 'As la Quiz', el: 'Πρωταθλητής Quiz', de: 'Quiz-Ass', fr: 'As du Quiz', it: 'Asso del Quiz', ar: 'بطل الاختبار' },
    description: { en: 'Get a perfect quiz score', ro: 'Obține scor perfect la un quiz', el: 'Επιτύχετε τέλειο σκορ σε quiz', de: 'Erziele eine perfekte Quiz-Punktzahl', fr: 'Obtenez un score parfait à un quiz', it: 'Ottieni un punteggio perfetto in un quiz', ar: 'احصل على درجة كاملة في اختبار' },
    condition: (s) => s.perfectQuizzes >= 1,
  },
  {
    id: 'stage-clear',
    icon: 'Trophy',
    name: { en: 'Stage Clear', ro: 'Etapă Completă', el: 'Ολοκλήρωση Σταδίου', de: 'Etappe Geschafft', fr: 'Étape Terminée', it: 'Fase Completata', ar: 'اجتياز المرحلة' },
    description: { en: 'Complete all lectures in a stage', ro: 'Finalizează toate lecțiile dintr-o etapă', el: 'Ολοκληρώστε όλα τα μαθήματα ενός σταδίου', de: 'Schließe alle Lektionen einer Etappe ab', fr: 'Terminez toutes les leçons d\'une étape', it: 'Completa tutte le lezioni di una fase', ar: 'أكمل جميع محاضرات مرحلة واحدة' },
    condition: (s) => s.stagesCompleted >= 1,
  },
  {
    id: 'streak-3',
    icon: 'Flame',
    name: { en: '3-Day Streak', ro: 'Serie de 3 Zile', el: 'Σερί 3 Ημερών', de: '3-Tage-Serie', fr: 'Série de 3 Jours', it: 'Serie di 3 Giorni', ar: 'سلسلة 3 أيام' },
    description: { en: 'Study 3 days in a row', ro: 'Studiază 3 zile la rând', el: 'Μελετήστε 3 συνεχόμενες μέρες', de: 'Lerne 3 Tage in Folge', fr: 'Étudiez 3 jours de suite', it: 'Studia per 3 giorni consecutivi', ar: 'ادرس 3 أيام متتالية' },
    condition: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    icon: 'Flame',
    name: { en: 'Week Warrior', ro: 'Războinic al Săptămânii', el: 'Πολεμιστής Εβδομάδας', de: 'Wochen-Krieger', fr: 'Guerrier de la Semaine', it: 'Guerriero della Settimana', ar: 'محارب الأسبوع' },
    description: { en: 'Study 7 days in a row', ro: 'Studiază 7 zile la rând', el: 'Μελετήστε 7 συνεχόμενες μέρες', de: 'Lerne 7 Tage in Folge', fr: 'Étudiez 7 jours de suite', it: 'Studia per 7 giorni consecutivi', ar: 'ادرس 7 أيام متتالية' },
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'halfway',
    icon: 'Library',
    name: { en: 'Halfway There', ro: 'La Jumătatea Drumului', el: 'Στα Μισά', de: 'Auf Halbem Weg', fr: 'À Mi-Chemin', it: 'A Metà Strada', ar: 'في منتصف الطريق' },
    description: { en: 'Complete 25 lectures', ro: 'Finalizează 25 de lecții', el: 'Ολοκληρώστε 25 μαθήματα', de: 'Schließe 25 Lektionen ab', fr: 'Terminez 25 leçons', it: 'Completa 25 lezioni', ar: 'أكمل 25 محاضرة' },
    condition: (s) => s.lecturesCompleted >= 25,
  },
  {
    id: 'scholar',
    icon: 'GraduationCap',
    name: { en: 'LLM Scholar', ro: 'Savant LLM', el: 'Μελετητής LLM', de: 'LLM-Gelehrter', fr: 'Érudit LLM', it: 'Studioso LLM', ar: 'باحث النماذج اللغوية' },
    description: { en: 'Complete all lectures', ro: 'Finalizează toate lecțiile', el: 'Ολοκληρώστε όλα τα μαθήματα', de: 'Schließe alle Lektionen ab', fr: 'Terminez toutes les leçons', it: 'Completa tutte le lezioni', ar: 'أكمل جميع المحاضرات' },
    condition: (s) => s.lecturesCompleted >= STAGES.reduce((sum, st) => sum + st.lectures.length, 0),
  },
  {
    id: 'level-5',
    icon: 'Star',
    name: { en: 'Rising Star', ro: 'Stea în Ascensiune', el: 'Ανερχόμενο Αστέρι', de: 'Aufsteigender Stern', fr: 'Étoile Montante', it: 'Stella Nascente', ar: 'نجم صاعد' },
    description: { en: 'Reach level 5', ro: 'Atinge nivelul 5', el: 'Φτάστε στο επίπεδο 5', de: 'Erreiche Level 5', fr: 'Atteignez le niveau 5', it: 'Raggiungi il livello 5', ar: 'الوصول إلى المستوى 5' },
    condition: (s) => s.level >= 5,
  },
  {
    id: 'level-10',
    icon: 'Crown',
    name: { en: 'LLM Master', ro: 'Maestru LLM', el: 'Κύριος LLM', de: 'LLM-Meister', fr: 'Maître LLM', it: 'Maestro LLM', ar: 'خبير النماذج اللغوية' },
    description: { en: 'Reach level 10', ro: 'Atinge nivelul 10', el: 'Φτάστε στο επίπεδο 10', de: 'Erreiche Level 10', fr: 'Atteignez le niveau 10', it: 'Raggiungi il livello 10', ar: 'الوصول إلى المستوى 10' },
    condition: (s) => s.level >= 10,
  },
  {
    id: 'code-50',
    icon: 'Wrench',
    name: { en: 'Code Wizard', ro: 'Vrăjitor al Codului', el: 'Μάγος Κώδικα', de: 'Code-Zauberer', fr: 'Sorcier du Code', it: 'Mago del Codice', ar: 'ساحر الشيفرة' },
    description: { en: 'Run 50 code blocks', ro: 'Rulează 50 de blocuri de cod', el: 'Εκτελέστε 50 μπλοκ κώδικα', de: 'Führe 50 Code-Blöcke aus', fr: 'Exécutez 50 blocs de code', it: 'Esegui 50 blocchi di codice', ar: 'شغّل 50 كتلة برمجية' },
    condition: (s) => s.codeBlocksRun >= 50,
  },
  {
    id: 'quiz-10',
    icon: 'PenLine',
    name: { en: 'Quiz Master', ro: 'Maestru Quiz', el: 'Μάστερ Quiz', de: 'Quiz-Meister', fr: 'Maître du Quiz', it: 'Maestro del Quiz', ar: 'خبير الاختبارات' },
    description: { en: 'Attempt 10 quizzes', ro: 'Încearcă 10 quiz-uri', el: 'Δοκιμάστε 10 quiz', de: 'Versuche dich an 10 Quiz', fr: 'Tentez 10 quiz', it: 'Prova 10 quiz', ar: 'خض 10 اختبارات' },
    condition: (s) => s.quizzesAttempted >= 10,
  },
  {
    id: 'perfectionist',
    icon: 'Trophy',
    name: { en: 'Perfectionist', ro: 'Perfecționist', el: 'Τελειομανής', de: 'Perfektionist', fr: 'Perfectionniste', it: 'Perfezionista', ar: 'الكمالي' },
    description: { en: 'Get 5 perfect quiz scores', ro: 'Obține 5 scoruri perfecte', el: 'Επιτύχετε 5 τέλεια σκορ', de: 'Erziele 5 perfekte Quiz-Ergebnisse', fr: 'Obtenez 5 scores parfaits aux quiz', it: 'Ottieni 5 punteggi perfetti nei quiz', ar: 'احصل على 5 درجات كاملة في الاختبارات' },
    condition: (s) => s.perfectQuizzes >= 5,
  },
  {
    id: 'code-100',
    icon: 'Cpu',
    name: { en: 'Code Machine', ro: 'Mașină de Cod', el: 'Μηχανή Κώδικα', de: 'Code-Maschine', fr: 'Machine à Code', it: 'Macchina del Codice', ar: 'آلة الشيفرة' },
    description: { en: 'Run 100 code blocks', ro: 'Rulează 100 de blocuri de cod', el: 'Εκτελέστε 100 μπλοκ κώδικα', de: 'Führe 100 Code-Blöcke aus', fr: 'Exécutez 100 blocs de code', it: 'Esegui 100 blocchi di codice', ar: 'شغّل 100 كتلة برمجية' },
    condition: (s) => s.codeBlocksRun >= 100,
  },
  {
    id: 'streak-14',
    icon: 'Flame',
    name: { en: 'Two-Week Champion', ro: 'Campion de Două Săptămâni', el: 'Πρωταθλητής Δύο Εβδομάδων', de: 'Zwei-Wochen-Champion', fr: 'Champion de Deux Semaines', it: 'Campione di Due Settimane', ar: 'بطل الأسبوعين' },
    description: { en: 'Study 14 days in a row', ro: 'Studiază 14 zile la rând', el: 'Μελετήστε 14 συνεχόμενες μέρες', de: 'Lerne 14 Tage in Folge', fr: 'Étudiez 14 jours de suite', it: 'Studia per 14 giorni consecutivi', ar: 'ادرس 14 يومًا متتاليًا' },
    condition: (s) => s.streak >= 14,
  },
  {
    id: 'deep-study',
    icon: 'Clock',
    name: { en: 'Deep Study', ro: 'Studiu Aprofundat', el: 'Βαθιά Μελέτη', de: 'Tiefes Lernen', fr: 'Étude Approfondie', it: 'Studio Approfondito', ar: 'دراسة معمّقة' },
    description: { en: 'Spend 10+ hours studying', ro: 'Petrece 10+ ore studiind', el: 'Αφιερώστε 10+ ώρες μελέτης', de: 'Verbringe 10+ Stunden mit Lernen', fr: 'Passez 10+ heures à étudier', it: 'Trascorri 10+ ore a studiare', ar: 'اقضِ أكثر من 10 ساعات في الدراسة' },
    condition: (s) => s.totalTimeSeconds >= 36000,
  },
  {
    id: 'stage-3-clear',
    icon: 'Shield',
    name: { en: 'Attention Master', ro: 'Maestrul Atenției', el: 'Κύριος Προσοχής', de: 'Meister der Aufmerksamkeit', fr: 'Maître de l\'Attention', it: 'Maestro dell\'Attenzione', ar: 'خبير الانتباه' },
    description: { en: 'Complete the Attention stage', ro: 'Completează etapa Atenției', el: 'Ολοκληρώστε το στάδιο Προσοχής', de: 'Schließe die Attention-Etappe ab', fr: 'Terminez l\'étape Attention', it: 'Completa la fase Attention', ar: 'أكمل مرحلة آلية الانتباه' },
    condition: (s) => s.stagesCompleted >= 3,
  },
];

export interface Stage {
  number: number;
  name: Record<Language, string>;
  icon: string;
  lectures: string[];
  color: string;
}

export const STAGES: Stage[] = [
  {
    number: 0,
    name: { en: 'Getting Started', ro: 'Introducere', el: 'Εισαγωγή', de: 'Erste Schritte', fr: 'Pour Commencer', it: 'Per Iniziare', ar: 'البداية' },
    icon: 'Compass',
    lectures: ['0'],
    color: '#3b82f6',
  },
  {
    number: 1,
    name: { en: 'LLM Fundamentals', ro: 'Fundamentele LLM', el: 'Θεμέλια LLM', de: 'LLM-Grundlagen', fr: 'Fondamentaux des LLM', it: 'Fondamenti degli LLM', ar: 'أساسيات النماذج اللغوية' },
    icon: 'BookOpen',
    lectures: ['1', '2', '3', '4', '5', '6'],
    color: '#3b82f6',
  },
  {
    number: 2,
    name: { en: 'Tokenization & Data', ro: 'Date & Tokenizare', el: 'Tokenization & Δεδομένα', de: 'Tokenisierung & Daten', fr: 'Tokenisation & Données', it: 'Tokenizzazione e Dati', ar: 'التجزئة والبيانات' },
    icon: 'Binary',
    lectures: ['7', '8', '9', '10', '11', '12'],
    color: '#8b5cf6',
  },
  {
    number: 3,
    name: { en: 'Attention Mechanism', ro: 'Mecanismul Atenției', el: 'Μηχανισμός Προσοχής', de: 'Aufmerksamkeitsmechanismus', fr: 'Mécanisme d\'Attention', it: 'Meccanismo di Attenzione', ar: 'آلية الانتباه' },
    icon: 'ScanSearch',
    lectures: ['13', '14', '15', '16', '17', '18'],
    color: '#ec4899',
  },
  {
    number: 4,
    name: { en: 'LLM Architecture', ro: 'Arhitectura LLM', el: 'Αρχιτεκτονική LLM', de: 'LLM-Architektur', fr: 'Architecture LLM', it: 'Architettura LLM', ar: 'بنية النماذج اللغوية' },
    icon: 'Blocks',
    lectures: ['19', '20', '21', '22', '23', '24', '24b'],
    color: '#f59e0b',
  },
  {
    number: 5,
    name: { en: 'Pretraining', ro: 'Pre-antrenare', el: 'Προεκπαίδευση', de: 'Vortraining', fr: 'Pré-entraînement', it: 'Pre-addestramento', ar: 'التدريب المسبق' },
    icon: 'BarChart3',
    lectures: ['25', '26', '27', '28', '29', '30', '31', '32', '32b'],
    color: '#10b981',
  },
  {
    number: 6,
    name: { en: 'Fine-tuning', ro: 'Ajustare Fină', el: 'Μικρορύθμιση', de: 'Feinabstimmung', fr: 'Ajustement Fin', it: 'Ottimizzazione Fine', ar: 'الضبط الدقيق' },
    icon: 'GraduationCap',
    lectures: ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43'],
    color: '#ef4444',
  },
  {
    number: 7,
    name: { en: 'GenAI SaaS Products', ro: 'Curs de IA Generativă', el: 'Προϊόντα GenAI SaaS', de: 'GenAI-SaaS-Produkte', fr: 'Produits GenAI SaaS', it: 'Prodotti GenAI SaaS', ar: 'منتجات GenAI SaaS' },
    icon: 'Package',
    lectures: ['genai-0', 'genai-1', 'genai-2', 'genai-3', 'genai-4', 'genai-5'],
    color: '#6366f1',
  },
  {
    number: 8,
    name: { en: 'NeuralForge Platform', ro: 'Platforma NeuralForge', el: 'Πλατφόρμα NeuralForge', de: 'NeuralForge-Plattform', fr: 'Plateforme NeuralForge', it: 'Piattaforma NeuralForge', ar: 'منصة NeuralForge' },
    icon: 'Wrench',
    lectures: ['44', '45', '46', '47', '48', '49', '50', '51'],
    color: '#f97316',
  },
  {
    number: 9,
    name: { en: 'Advanced Topics', ro: 'Subiecte Avansate', el: 'Προχωρημένα Θέματα', de: 'Fortgeschrittene Themen', fr: 'Sujets Avancés', it: 'Argomenti Avanzati', ar: 'مواضيع متقدمة' },
    icon: 'Award',
    lectures: ['52', '53', '54', '55'],
    color: '#14b8a6',
  },
];
