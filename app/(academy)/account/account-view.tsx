'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useAcademyStore } from '@/lib/store/academy-store';
import type { Language } from '@/types';
import { STAGES } from '@/types';
import { getIcon } from '@/lib/icons';
import {
  User,
  Mail,
  Shield,
  Crown,
  Unlock,
  BookOpen,
  Code2,
  ClipboardCheck,
  Trophy,
  Flame,
  ChevronRight,
  Check,
  Star,
  ArrowUpRight,
  Clock,
  ArrowRight,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Lock,
  Package,
  ShoppingCart,
  Gift,
  Tag,
  ImageIcon,
  Video,
  FileEdit,
  ScanSearch,
  FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════
   Pricing data — mock until Stripe integration
   All prices in EUR. 3-month access window.
   ═══════════════════════════════════════════════════════════ */

interface StageProduct {
  id: string;
  stageNumber: number;
  name: Record<string, string>;
  lectures: number;
  price: number; // EUR
  features: string[];
  icon: string;
  color: string;
}

interface GenAIProduct {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  price: number;
  icon: React.ElementType;
  comingSoon: boolean;
}

const STAGE_PRODUCTS: StageProduct[] = [
  {
    id: 'stage-2',
    stageNumber: 2,
    name: { en: 'Tokenization & Data', ro: 'Date & Tokenizare', el: 'Tokenization & Δεδομένα' },
    lectures: 6,
    price: 19,
    features: ['6 interactive lectures', 'BPE Tokenizer from scratch', 'DataLoader & Embeddings', 'Code sandbox access'],
    icon: 'Binary',
    color: '#8b5cf6',
  },
  {
    id: 'stage-3',
    stageNumber: 3,
    name: { en: 'Attention Mechanism', ro: 'Mecanismul Atenției', el: 'Μηχανισμός Προσοχής' },
    lectures: 6,
    price: 29,
    features: ['6 interactive lectures', 'Self-Attention from scratch', 'Multi-Head Attention', 'Capstone project'],
    icon: 'ScanSearch',
    color: '#ec4899',
  },
  {
    id: 'stage-4',
    stageNumber: 4,
    name: { en: 'LLM Architecture', ro: 'Arhitectura LLM', el: 'Αρχιτεκτονική LLM' },
    lectures: 6,
    price: 29,
    features: ['6 interactive lectures', 'GELU, LayerNorm, Residuals', 'Transformer Block assembly', 'Code GPT-2 (124M)'],
    icon: 'Blocks',
    color: '#f59e0b',
  },
  {
    id: 'stage-5',
    stageNumber: 5,
    name: { en: 'Pretraining', ro: 'Pre-antrenare', el: 'Προεκπαίδευση' },
    lectures: 8,
    price: 39,
    features: ['8 interactive lectures', 'Training loop & optimization', 'Temperature & Top-k sampling', 'Load GPT-2 weights'],
    icon: 'BarChart3',
    color: '#10b981',
  },
  {
    id: 'stage-6',
    stageNumber: 6,
    name: { en: 'Fine-tuning', ro: 'Ajustare Fină', el: 'Μικρορύθμιση' },
    lectures: 11,
    price: 39,
    features: ['11 interactive lectures', 'LoRA, RLHF, DPO', 'RAG & Chatbot building', 'Domain-specific LLMs'],
    icon: 'GraduationCap',
    color: '#ef4444',
  },
];

const GENAI_PRODUCTS: GenAIProduct[] = [
  {
    id: 'genai-1',
    name: { en: 'Image Generation SaaS', ro: 'SaaS Generare Imagini', el: 'SaaS Δημιουργίας Εικόνων' },
    description: { en: 'Build a production image generation app', ro: 'Construiește o aplicație de generare de imagini', el: 'Κατασκευή εφαρμογής δημιουργίας εικόνων' },
    price: 19,
    icon: ImageIcon,
    comingSoon: true,
  },
  {
    id: 'genai-2',
    name: { en: 'Video Generation SaaS', ro: 'SaaS Generare Video', el: 'SaaS Δημιουργίας Βίντεο' },
    description: { en: 'Build a video generation pipeline', ro: 'Construiește un pipeline de generare video', el: 'Κατασκευή pipeline δημιουργίας βίντεο' },
    price: 19,
    icon: Video,
    comingSoon: true,
  },
  {
    id: 'genai-3',
    name: { en: 'Text Composition & Rewriting', ro: 'Compunere & Rescriere Text', el: 'Σύνθεση & Αναδιατύπωση Κειμένου' },
    description: { en: 'Build an AI writing assistant SaaS', ro: 'Construiește un SaaS de asistență la scriere', el: 'Κατασκευή SaaS βοηθού γραφής' },
    price: 19,
    icon: FileEdit,
    comingSoon: true,
  },
  {
    id: 'genai-4',
    name: { en: 'Plagiarism & AI Detection', ro: 'Detecție Plagiat & IA', el: 'Ανίχνευση Λογοκλοπής & AI' },
    description: { en: 'Build a plagiarism & AI text detector', ro: 'Construiește un detector de plagiat', el: 'Κατασκευή ανιχνευτή λογοκλοπής' },
    price: 19,
    icon: ScanSearch,
    comingSoon: true,
  },
  {
    id: 'genai-5',
    name: { en: 'OCR & Document Intelligence', ro: 'OCR & Inteligență Documente', el: 'OCR & Νοημοσύνη Εγγράφων' },
    description: { en: 'Build an OCR & document analysis SaaS', ro: 'Construiește un SaaS de analiză documente', el: 'Κατασκευή SaaS ανάλυσης εγγράφων' },
    price: 19,
    icon: FileSearch,
    comingSoon: true,
  },
];

const INDIVIDUAL_STAGES_TOTAL = STAGE_PRODUCTS.reduce((s, p) => s + p.price, 0); // €155
const COURSE_BUNDLE_PRICE = 89;
const COURSE_BUNDLE_SAVING = Math.round((1 - COURSE_BUNDLE_PRICE / INDIVIDUAL_STAGES_TOTAL) * 100);

const INDIVIDUAL_GENAI_TOTAL = GENAI_PRODUCTS.reduce((s, p) => s + p.price, 0); // €95
const GENAI_BUNDLE_PRICE = 49;
const GENAI_BUNDLE_SAVING = Math.round((1 - GENAI_BUNDLE_PRICE / INDIVIDUAL_GENAI_TOTAL) * 100);

const EVERYTHING_INDIVIDUAL_TOTAL = INDIVIDUAL_STAGES_TOTAL + INDIVIDUAL_GENAI_TOTAL; // €250
const EVERYTHING_BUNDLE_PRICE = 119;
const EVERYTHING_BUNDLE_SAVING = Math.round((1 - EVERYTHING_BUNDLE_PRICE / EVERYTHING_INDIVIDUAL_TOTAL) * 100);

/* Mock purchased stages — will come from Supabase/Stripe */
const MOCK_PURCHASED: string[] = []; // e.g. ['stage-2', 'genai-1']
const MOCK_INVOICES: any[] = [];

/* ═══════════════════════════════════════════════════════════ */

export default function AccountView() {
  const { user, signOut, loading } = useAuth();
  const { language, getCompletionPercentage, progress, quizScores, xp, streak, totalCodeBlocksRun } = useAcademyStore();
  const router = useRouter();
  const lang = language as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'invoices'>('overview');
  const [cart, setCart] = useState<string[]>([]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Please log in to view your account</p>
        <Link href="/login?redirect=/account">
          <Button>Log in</Button>
        </Link>
      </div>
    );
  }

  const completion = getCompletionPercentage();
  const completedLectures = Object.values(progress).filter(p => p.completed).length;
  const quizzesTaken = Object.keys(quizScores).length;
  const totalTime = Object.values(progress).reduce((sum, p) => sum + (p.timeSpent || 0), 0);
  const hoursSpent = Math.floor(totalTime / 3600);
  const minutesSpent = Math.floor((totalTime % 3600) / 60);

  const isPurchased = (id: string) => MOCK_PURCHASED.includes(id);
  const isInCart = (id: string) => cart.includes(id);
  const toggleCart = (id: string) => {
    setCart(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const cartTotal = cart.reduce((sum, id) => {
    const stage = STAGE_PRODUCTS.find(s => s.id === id);
    if (stage) return sum + stage.price;
    const genai = GENAI_PRODUCTS.find(g => g.id === id);
    if (genai) return sum + genai.price;
    if (id === 'bundle-course') return sum + COURSE_BUNDLE_PRICE;
    if (id === 'bundle-genai') return sum + GENAI_BUNDLE_PRICE;
    if (id === 'bundle-everything') return sum + EVERYTHING_BUNDLE_PRICE;
    return sum;
  }, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          My Account
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile, courses, and learning progress.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: User },
          { id: 'courses' as const, label: 'Courses & Pricing', icon: ShoppingCart },
          { id: 'invoices' as const, label: 'Invoices', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          TAB: Overview
          ═══════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Profile card */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{user.displayName || 'Academy Student'}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {MOCK_PURCHASED.length === 0 ? 'Free Tier' : `${MOCK_PURCHASED.length} course${MOCK_PURCHASED.length > 1 ? 's' : ''} active`}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: 'Lectures', value: `${completedLectures}/49`, color: 'text-blue-500' },
              { icon: ClipboardCheck, label: 'Quizzes', value: String(quizzesTaken), color: 'text-purple-500' },
              { icon: Code2, label: 'Code Runs', value: String(totalCodeBlocksRun), color: 'text-green-500' },
              { icon: Flame, label: 'Streak', value: `${streak} days`, color: 'text-orange-500' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  {stat.label}
                </div>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* XP & Progress */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[hsl(38_80%_55%)]" />
                Learning Progress
              </h3>
              <span className="text-sm font-medium tabular-nums">{xp} XP</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Course Completion</span>
                  <span>{Math.round(completion)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Time Invested</span>
                  <span>{hoursSpent}h {minutesSpent}m</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-[hsl(38_80%_55%)] transition-all" style={{ width: `${Math.min(100, (totalTime / (50 * 3600)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Purchased stages overview */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              My Courses
            </h3>
            <div className="space-y-2">
              {/* Free stages always shown */}
              <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
                    {(() => { const I = getIcon('Compass'); return <I className="h-4 w-4 text-blue-500" />; })()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">Getting Started + LLM Fundamentals</p>
                    <p className="text-xs text-muted-foreground">7 lectures — Free forever</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                  <Check className="mr-1 h-3 w-3" /> Active
                </Badge>
              </div>

              {/* Paid stages */}
              {STAGE_PRODUCTS.map(stage => {
                const purchased = isPurchased(stage.id);
                return (
                  <div key={stage.id} className={cn(
                    'flex items-center justify-between rounded-lg p-3',
                    purchased ? 'bg-green-500/10' : 'bg-muted/50'
                  )}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${stage.color}15` }}>
                        {(() => { const I = getIcon(stage.icon); return <I className="h-4 w-4" style={{ color: stage.color }} />; })()}
                      </span>
                      <div>
                        <p className="text-sm font-medium">Stage {stage.stageNumber}: {stage.name[lang] || stage.name.en}</p>
                        <p className="text-xs text-muted-foreground">{stage.lectures} lectures</p>
                      </div>
                    </div>
                    {purchased ? (
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                        <Check className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">€{stage.price}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {MOCK_PURCHASED.length === 0 && (
              <Button
                className="mt-4 w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold"
                onClick={() => setActiveTab('courses')}
              >
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Browse Courses & Pricing
              </Button>
            )}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => setActiveTab('courses')}
              className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Courses & Pricing</p>
                  <p className="text-xs text-muted-foreground">Buy individual stages or bundles</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Billing & Invoices</p>
                  <p className="text-xs text-muted-foreground">Download past invoices</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TAB: Courses & Pricing
          ═══════════════════════════════════════════════ */}
      {activeTab === 'courses' && (
        <div className="space-y-8">

          {/* ── Free tier info ── */}
          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-5">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                Free — Getting Started + Stage 1
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              7 lectures covering LLM fundamentals, Transformers, GPT architecture overview, and your Python sandbox setup. Free forever, no credit card needed.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Setup & Tools', 'LLM Basics', 'Transformers', 'GPT-3 Deep Dive', 'Progress Tracking', 'Quizzes & XP'].map(f => (
                <span key={f} className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <Check className="h-3 w-3" /> {f}
                </span>
              ))}
            </div>
          </div>

          {/* ── BUNDLES — the anchoring section ── */}
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Bundles — Best Value
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              3-month access from purchase date. One-time payment, no subscription.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Course Bundle */}
              <div className="relative rounded-xl border-2 border-[hsl(38_80%_55%)] bg-card p-6 shadow-lg shadow-[hsl(38_80%_55%/0.08)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] font-bold text-xs px-3 shadow-md">
                    <Star className="mr-1 h-3 w-3" /> MOST POPULAR
                  </Badge>
                </div>
                <div className="pt-2">
                  <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                    Full Course Bundle
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                    Stages 2–6: Tokenization through Fine-tuning
                  </p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm text-muted-foreground line-through">€{INDIVIDUAL_STAGES_TOTAL}</span>
                    <span className="text-4xl font-bold tabular-nums">€{COURSE_BUNDLE_PRICE}</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-4">
                    Save {COURSE_BUNDLE_SAVING}% — you save €{INDIVIDUAL_STAGES_TOTAL - COURSE_BUNDLE_PRICE}
                  </p>
                  <ul className="space-y-1.5 mb-5">
                    {['37 interactive lectures', 'All code sandboxes', 'All quizzes & capstones', 'AI Tutor access', 'Completion certificate', '3-month access'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold shadow-md"
                    onClick={() => {/* Stripe checkout */}}
                  >
                    Get Full Course <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* GenAI Bundle */}
              <div className="rounded-xl border-2 border-border bg-card p-6 hover:border-primary/30 transition-colors">
                <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                  GenAI Bundle
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                  All 5 GenAI SaaS product courses
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm text-muted-foreground line-through">€{INDIVIDUAL_GENAI_TOTAL}</span>
                  <span className="text-4xl font-bold tabular-nums">€{GENAI_BUNDLE_PRICE}</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-4">
                  Save {GENAI_BUNDLE_SAVING}% — you save €{INDIVIDUAL_GENAI_TOTAL - GENAI_BUNDLE_PRICE}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {['5 SaaS product courses', 'Image, Video, Text, OCR, AI Detection', 'Production-ready code', '3-month access'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full font-semibold"
                  onClick={() => {/* Stripe checkout */}}
                >
                  Get GenAI Bundle <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>

              {/* Everything Bundle */}
              <div className="relative rounded-xl border-2 border-primary/40 bg-gradient-to-br from-[hsl(240_95%_10%)] to-[hsl(240_60%_18%)] p-6 text-white">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-bold text-xs px-3 shadow-md">
                    <Crown className="mr-1 h-3 w-3" /> BEST VALUE
                  </Badge>
                </div>
                <div className="pt-2">
                  <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                    Everything Bundle
                  </h4>
                  <p className="text-xs text-white/60 mt-0.5 mb-4">
                    Full Course + All GenAI Products
                  </p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm text-white/40 line-through">€{EVERYTHING_INDIVIDUAL_TOTAL}</span>
                    <span className="text-4xl font-bold tabular-nums">€{EVERYTHING_BUNDLE_PRICE}</span>
                  </div>
                  <p className="text-xs text-green-400 font-semibold mb-4">
                    Save {EVERYTHING_BUNDLE_SAVING}% — you save €{EVERYTHING_INDIVIDUAL_TOTAL - EVERYTHING_BUNDLE_PRICE}
                  </p>
                  <ul className="space-y-1.5 mb-5">
                    {['Everything in Course Bundle', 'All 5 GenAI SaaS products', 'AI Tutor + Certificate', 'Only €30 more than Course alone', '3-month access'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                        <Check className="h-3.5 w-3.5 shrink-0 text-[hsl(38_80%_55%)]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold shadow-lg"
                    onClick={() => {/* Stripe checkout */}}
                  >
                    Get Everything <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Individual Stages ── */}
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Individual Stages
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Buy only what you need. Each stage includes 3-month access.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STAGE_PRODUCTS.map(stage => {
                const purchased = isPurchased(stage.id);
                return (
                  <div
                    key={stage.id}
                    className={cn(
                      'rounded-xl border bg-card p-5 transition-all',
                      purchased && 'border-green-500/30 bg-green-500/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${stage.color}15` }}>
                          {(() => { const I = getIcon(stage.icon); return <I className="h-5 w-5" style={{ color: stage.color }} />; })()}
                        </span>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Stage {stage.stageNumber}</p>
                          <h4 className="font-semibold text-sm">{stage.name[lang] || stage.name.en}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold tabular-nums">€{stage.price}</span>
                      </div>
                    </div>

                    <ul className="space-y-1 mb-4">
                      {stage.features.map(f => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 shrink-0 text-green-500" /> {f}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" /> 3-month access
                    </div>

                    {purchased ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Purchased
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full font-medium"
                        onClick={() => {/* Stripe checkout */}}
                      >
                        Buy Stage {stage.stageNumber} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Savings hint */}
            <div className="mt-3 rounded-lg bg-[hsl(38_80%_55%/0.08)] border border-[hsl(38_80%_55%/0.2)] p-3 flex items-center gap-3">
              <Tag className="h-5 w-5 text-[hsl(38_80%_55%)] shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">Save {COURSE_BUNDLE_SAVING}%</span> — buy all 5 stages as the{' '}
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-primary underline underline-offset-2 font-medium">
                  Full Course Bundle for €{COURSE_BUNDLE_PRICE}
                </button>{' '}
                instead of €{INDIVIDUAL_STAGES_TOTAL} individually.
              </p>
            </div>
          </div>

          {/* ── GenAI Products ── */}
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              GenAI SaaS Products
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Build production-ready AI SaaS applications. Each product is a standalone course.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GENAI_PRODUCTS.map(product => {
                const purchased = isPurchased(product.id);
                const ProductIcon = product.icon;
                return (
                  <div
                    key={product.id}
                    className={cn(
                      'rounded-xl border bg-card p-5 transition-all',
                      purchased && 'border-green-500/30 bg-green-500/5'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ProductIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{product.name[lang] || product.name.en}</h4>
                        <p className="text-xs text-muted-foreground">{product.description[lang] || product.description.en}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xl font-bold tabular-nums">€{product.price}</span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> 3-month access
                      </div>
                    </div>

                    {product.comingSoon ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        Coming Soon
                      </Button>
                    ) : purchased ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Purchased
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full font-medium"
                        onClick={() => {/* Stripe checkout */}}
                      >
                        Buy Course <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* GenAI savings hint */}
            <div className="mt-3 rounded-lg bg-[hsl(38_80%_55%/0.08)] border border-[hsl(38_80%_55%/0.2)] p-3 flex items-center gap-3">
              <Tag className="h-5 w-5 text-[hsl(38_80%_55%)] shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">Save {GENAI_BUNDLE_SAVING}%</span> — get all 5 GenAI products as a{' '}
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-primary underline underline-offset-2 font-medium">
                  bundle for €{GENAI_BUNDLE_PRICE}
                </button>{' '}
                instead of €{INDIVIDUAL_GENAI_TOTAL} individually.
              </p>
            </div>
          </div>

          {/* ── Trust signals ── */}
          <div className="text-center space-y-2 py-4">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Secure payment via Stripe</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 3-month access</span>
              <span className="flex items-center gap-1"><Unlock className="h-3.5 w-3.5" /> Instant access</span>
            </div>
            <p className="text-xs text-muted-foreground">
              One-time payment. No recurring charges. No auto-renewal.
            </p>
          </div>

          {/* ── FAQ-style clarification ── */}
          <div className="rounded-xl border bg-card p-6">
            <h4 className="font-semibold mb-3">How it works</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-0.5">One-time payment</p>
                <p className="text-xs text-muted-foreground">No subscriptions, no auto-renewal. Pay once, learn at your pace within 3 months.</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">3-month access window</p>
                <p className="text-xs text-muted-foreground">Your access starts the moment you purchase. Complete the content within 3 months.</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">Keep your progress forever</p>
                <p className="text-xs text-muted-foreground">Your XP, badges, quiz scores, and completion certificate never expire.</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">Future courses separate</p>
                <p className="text-xs text-muted-foreground">New courses we release are priced independently. You only pay for what you want.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TAB: Invoices
          ═══════════════════════════════════════════════ */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Billing History
            </h3>

            {MOCK_INVOICES.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No invoices yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Invoices will appear here once you purchase a course or bundle.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab('courses')}
                >
                  Browse Courses
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Date</th>
                    <th className="pb-2 text-left font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 text-right font-medium">Status</th>
                    <th className="pb-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_INVOICES.map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3">{inv.date}</td>
                      <td className="py-3">{inv.description}</td>
                      <td className="py-3 text-right tabular-nums">€{inv.amount}</td>
                      <td className="py-3 text-right">
                        <Badge variant="secondary" className="text-xs">{inv.status}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">PDF</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Payment method */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method
            </h3>
            <p className="text-sm text-muted-foreground">
              Payments are processed securely via Stripe. No payment details are stored on our servers.
            </p>
          </div>
        </div>
      )}

      {/* ── Sign out ── */}
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Sign out</p>
          <p className="text-xs text-muted-foreground">Sign out of your ADD Academy account</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            await signOut();
            router.push('/');
            router.refresh();
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
