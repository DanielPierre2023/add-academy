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
    name: { en: 'Setup & Foundations', ro: 'Configurare & Fundamente', el: 'Εγκατάσταση & Θεμέλια' },
    icon: '🏗️',
    lectures: ['0', '1', '2', '3', '4', '5', '6'],
    color: '#3b82f6',
  },
  {
    number: 1,
    name: { en: 'Tokenization & Data', ro: 'Tokenizare & Date', el: 'Tokenization & Δεδομένα' },
    icon: '🔤',
    lectures: ['7', '8', '9', '10', '11', '12'],
    color: '#8b5cf6',
  },
  {
    number: 2,
    name: { en: 'Attention Mechanism', ro: 'Mecanismul de Atenție', el: 'Μηχανισμός Προσοχής' },
    icon: '🎯',
    lectures: ['13', '14', '15', '16', '17', '18'],
    color: '#ec4899',
  },
  {
    number: 3,
    name: { en: 'Transformer Architecture', ro: 'Arhitectura Transformer', el: 'Αρχιτεκτονική Transformer' },
    icon: '🧱',
    lectures: ['19', '20', '21', '22', '23', '24'],
    color: '#f59e0b',
  },
  {
    number: 4,
    name: { en: 'Pretraining', ro: 'Pre-antrenament', el: 'Προεκπαίδευση' },
    icon: '⚡',
    lectures: ['25', '26', '27', '28', '29', '30'],
    color: '#10b981',
  },
  {
    number: 5,
    name: { en: 'Fine-tuning & Deployment', ro: 'Ajustare Fină & Deployment', el: 'Μικρορύθμιση & Ανάπτυξη' },
    icon: '🎓',
    lectures: ['31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43'],
    color: '#ef4444',
  },
  {
    number: 6,
    name: { en: 'GenAI SaaS Products', ro: 'Produse GenAI SaaS', el: 'Προϊόντα GenAI SaaS' },
    icon: '⭐',
    lectures: ['genai-1', 'genai-2', 'genai-3', 'genai-4', 'genai-5'],
    color: '#6366f1',
  },
];
