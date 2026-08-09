// ═══════════════════════════════════════════
// ADD Academy — Core Type Definitions
// ═══════════════════════════════════════════

export type Language = 'en' | 'ro' | 'el';

export interface Lecture {
  id: string;
  number: number;
  stage: number;
  stageName: string;
  title: Record<Language, string>;
  content: Record<Language, string>;
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
    name: { en: 'First Steps', ro: 'Primii Pași', el: 'Πρώτα Βήματα' },
    description: { en: 'Complete your first lecture', ro: 'Finalizează prima lecție', el: 'Ολοκληρώστε το πρώτο μάθημα' },
    condition: (s) => s.lecturesCompleted >= 1,
  },
  {
    id: 'code-runner',
    icon: 'Terminal',
    name: { en: 'Code Runner', ro: 'Programator', el: 'Προγραμματιστής' },
    description: { en: 'Run 10 code blocks', ro: 'Rulează 10 blocuri de cod', el: 'Εκτελέστε 10 μπλοκ κώδικα' },
    condition: (s) => s.codeBlocksRun >= 10,
  },
  {
    id: 'quiz-ace',
    icon: 'Target',
    name: { en: 'Quiz Ace', ro: 'As la Quiz', el: 'Πρωταθλητής Quiz' },
    description: { en: 'Get a perfect quiz score', ro: 'Obține scor perfect la un quiz', el: 'Επιτύχετε τέλειο σκορ σε quiz' },
    condition: (s) => s.perfectQuizzes >= 1,
  },
  {
    id: 'stage-clear',
    icon: 'Trophy',
    name: { en: 'Stage Clear', ro: 'Etapă Completă', el: 'Ολοκλήρωση Σταδίου' },
    description: { en: 'Complete all lectures in a stage', ro: 'Finalizează toate lecțiile dintr-o etapă', el: 'Ολοκληρώστε όλα τα μαθήματα ενός σταδίου' },
    condition: (s) => s.stagesCompleted >= 1,
  },
  {
    id: 'streak-3',
    icon: 'Flame',
    name: { en: '3-Day Streak', ro: 'Serie de 3 Zile', el: 'Σερί 3 Ημερών' },
    description: { en: 'Study 3 days in a row', ro: 'Studiază 3 zile la rând', el: 'Μελετήστε 3 συνεχόμενες μέρες' },
    condition: (s) => s.streak >= 3,
  },
  {
    id: 'streak-7',
    icon: 'Flame',
    name: { en: 'Week Warrior', ro: 'Războinic al Săptămânii', el: 'Πολεμιστής Εβδομάδας' },
    description: { en: 'Study 7 days in a row', ro: 'Studiază 7 zile la rând', el: 'Μελετήστε 7 συνεχόμενες μέρες' },
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'halfway',
    icon: 'Library',
    name: { en: 'Halfway There', ro: 'La Jumătatea Drumului', el: 'Στα Μισά' },
    description: { en: 'Complete 25 lectures', ro: 'Finalizează 25 de lecții', el: 'Ολοκληρώστε 25 μαθήματα' },
    condition: (s) => s.lecturesCompleted >= 25,
  },
  {
    id: 'scholar',
    icon: 'GraduationCap',
    name: { en: 'LLM Scholar', ro: 'Savant LLM', el: 'Μελετητής LLM' },
    description: { en: 'Complete all 49 lectures', ro: 'Finalizează toate cele 49 de lecții', el: 'Ολοκληρώστε και τα 49 μαθήματα' },
    condition: (s) => s.lecturesCompleted >= 49,
  },
  {
    id: 'level-5',
    icon: 'Star',
    name: { en: 'Rising Star', ro: 'Stea în Ascensiune', el: 'Ανερχόμενο Αστέρι' },
    description: { en: 'Reach level 5', ro: 'Atinge nivelul 5', el: 'Φτάστε στο επίπεδο 5' },
    condition: (s) => s.level >= 5,
  },
  {
    id: 'level-10',
    icon: 'Crown',
    name: { en: 'LLM Master', ro: 'Maestru LLM', el: 'Κύριος LLM' },
    description: { en: 'Reach level 10', ro: 'Atinge nivelul 10', el: 'Φτάστε στο επίπεδο 10' },
    condition: (s) => s.level >= 10,
  },
  {
    id: 'code-50',
    icon: 'Wrench',
    name: { en: 'Code Wizard', ro: 'Vrăjitor al Codului', el: 'Μάγος Κώδικα' },
    description: { en: 'Run 50 code blocks', ro: 'Rulează 50 de blocuri de cod', el: 'Εκτελέστε 50 μπλοκ κώδικα' },
    condition: (s) => s.codeBlocksRun >= 50,
  },
  {
    id: 'quiz-10',
    icon: 'PenLine',
    name: { en: 'Quiz Master', ro: 'Maestru Quiz', el: 'Μάστερ Quiz' },
    description: { en: 'Attempt 10 quizzes', ro: 'Încearcă 10 quiz-uri', el: 'Δοκιμάστε 10 quiz' },
    condition: (s) => s.quizzesAttempted >= 10,
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
    name: { en: 'Getting Started', ro: 'Introducere', el: 'Εισαγωγή' },
    icon: 'Compass',
    lectures: ['0'],
    color: '#3b82f6',
  },
  {
    number: 1,
    name: { en: 'LLM Fundamentals', ro: 'Fundamentele LLM', el: 'Θεμέλια LLM' },
    icon: 'BookOpen',
    lectures: ['1', '2', '3', '4', '5', '6'],
    color: '#3b82f6',
  },
  {
    number: 2,
    name: { en: 'Tokenization & Data', ro: 'Date & Tokenizare', el: 'Tokenization & Δεδομένα' },
    icon: 'Binary',
    lectures: ['7', '8', '9', '10', '11', '12'],
    color: '#8b5cf6',
  },
  {
    number: 3,
    name: { en: 'Attention Mechanism', ro: 'Mecanismul Atenției', el: 'Μηχανισμός Προσοχής' },
    icon: 'ScanSearch',
    lectures: ['13', '14', '15', '16', '17', '18'],
    color: '#ec4899',
  },
  {
    number: 4,
    name: { en: 'LLM Architecture', ro: 'Arhitectura LLM', el: 'Αρχιτεκτονική LLM' },
    icon: 'Blocks',
    lectures: ['19', '20', '21', '22', '23', '24', '24b'],
    color: '#f59e0b',
  },
  {
    number: 5,
    name: { en: 'Pretraining', ro: 'Pre-antrenare', el: 'Προεκπαίδευση' },
    icon: 'BarChart3',
    lectures: ['25', '26', '27', '28', '29', '30', '31', '32', '32b'],
    color: '#10b981',
  },
  {
    number: 6,
    name: { en: 'Fine-tuning', ro: 'Ajustare Fină', el: 'Μικρορύθμιση' },
    icon: 'GraduationCap',
    lectures: ['33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43'],
    color: '#ef4444',
  },
  {
    number: 7,
    name: { en: 'GenAI SaaS Products', ro: 'Curs de IA Generativă', el: 'Προϊόντα GenAI SaaS' },
    icon: 'Package',
    lectures: ['genai-0', 'genai-1', 'genai-2', 'genai-3', 'genai-4', 'genai-5'],
    color: '#6366f1',
  },
  {
    number: 8,
    name: { en: 'NeuralForge Platform', ro: 'Platforma NeuralForge', el: 'Πλατφόρμα NeuralForge' },
    icon: 'Wrench',
    lectures: ['44', '45', '46', '47', '48', '49', '50', '51'],
    color: '#f97316',
  },
  {
    number: 9,
    name: { en: 'Advanced Topics', ro: 'Subiecte Avansate', el: 'Προχωρημένα Θέματα' },
    icon: 'Award',
    lectures: ['52', '53', '54', '55'],
    color: '#14b8a6',
  },
];
