'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useAcademyStore } from '@/lib/store/academy-store';
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
  LogOut,
  Package,
  ShoppingCart,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════
   Pricing — pure recurring subscription (All-Access).
   All prices in EUR. Subscriptions renew; cancel anytime.
   ═══════════════════════════════════════════════════════════ */

const MONTHLY_PRICE = 12;
const ANNUAL_PRICE = 99;
const ANNUAL_MONTHLY_EQUIV = (ANNUAL_PRICE / 12).toFixed(2); // ≈ 8.25
const STUDENT_MONTHLY = MONTHLY_PRICE / 2; // €6
const STUDENT_ANNUAL = Math.round(ANNUAL_PRICE / 2); // €50 (advertised ~€49)
const ORG_SEATS = 20;
const CONTACT_EMAIL = 'contact@add-individual-solutions.com';

const ALL_ACCESS_FEATURES = [
  'Full LLM course — all stages, ~67 lectures',
  'All 5 GenAI SaaS product courses',
  'Live in-browser Python — no setup',
  'Deployable NeuralForge LLM + product downloads',
  'AI Tutor access',
  'Completion certificate',
  'All future courses included',
];

const COMPARISON_ROWS: { feature: string; add: string; udemy: string; coursera: string; bootcamp: string }[] = [
  { feature: 'Build an LLM from scratch', add: 'Yes', udemy: 'Rarely', coursera: 'Partial', bootcamp: 'Sometimes' },
  { feature: 'Live in-browser Python (no setup)', add: 'Yes', udemy: 'No', coursera: 'No', bootcamp: 'No' },
  { feature: 'Deployable SaaS products you keep', add: '6 products', udemy: 'No', coursera: 'No', bootcamp: 'No' },
  { feature: 'Certificate', add: 'Yes', udemy: 'Yes', coursera: 'Yes', bootcamp: 'Yes' },
  { feature: 'Free for schools', add: 'Yes', udemy: 'No', coursera: 'No', bootcamp: 'No' },
  { feature: 'All future courses included', add: 'Yes', udemy: 'No', coursera: 'No', bootcamp: 'No' },
  { feature: 'Price', add: '€12/mo', udemy: '~€15–130/course', coursera: '~$49/mo', bootcamp: '$500–2,000' },
];

/* Mock invoices — will come from Supabase/Stripe */
const MOCK_INVOICES: any[] = [];

/* ═══════════════════════════════════════════════════════════ */

export default function AccountView() {
  const { user, signOut, loading } = useAuth();
  const { language, getCompletionPercentage, progress, quizScores, xp, streak, totalCodeBlocksRun } = useAcademyStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'invoices'>('overview');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

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

  return (
    <div className="space-y-8 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          My Account
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile, subscription, and learning progress.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: User },
          { id: 'courses' as const, label: 'Subscription', icon: ShoppingCart },
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

      {/* ═══════════════ TAB: Overview ═══════════════ */}
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
                  <h2 className="text-xl font-semibold">{user.displayName || 'Academica Student'}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <BookOpen className="mr-1 h-3 w-3" />
                      Free Tier
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: 'Lectures', value: `${completedLectures}/68`, color: 'text-blue-500' },
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

          {/* Subscription status */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              My Subscription
            </h3>
            <div className="space-y-2">
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

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                    <Crown className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">All-Access</p>
                    <p className="text-xs text-muted-foreground">Everything unlocked — €12/mo or €99/yr</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Not subscribed</span>
              </div>
            </div>

            <Button
              className="mt-4 w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold"
              onClick={() => setActiveTab('courses')}
            >
              <ArrowUpRight className="mr-2 h-4 w-4" />
              View subscription plans
            </Button>
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
                  <p className="text-sm font-medium">Subscription & Pricing</p>
                  <p className="text-xs text-muted-foreground">One plan unlocks everything</p>
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
     {/* ═══════════════ TAB: Subscription & Pricing ═══════════════ */}
      {activeTab === 'courses' && (
        <div className="space-y-10">

          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Learn AI. Build real products. Fund free education.
            </h2>
            <p className="mt-3 text-muted-foreground">
              One subscription unlocks everything — and every euro helps keep AI education free for students and schools.
            </p>
            <p className="mt-2 text-sm font-medium">€12/month · €99/year · Cancel anytime</p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Annual <span className="text-green-500 font-semibold">· 2 months free</span>
            </button>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 max-w-3xl mx-auto">
            {/* All-Access */}
            <div className="relative rounded-xl border-2 border-[hsl(38_80%_55%)] bg-card p-6 shadow-lg shadow-[hsl(38_80%_55%/0.08)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] font-bold text-xs px-3 shadow-md">
                  <Star className="mr-1 h-3 w-3" /> ALL-ACCESS
                </Badge>
              </div>
              <div className="pt-2">
                <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>All-Access</h4>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">Everything, plus every future course</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold tabular-nums">€{billing === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE}</span>
                  <span className="text-sm text-muted-foreground">/ {billing === 'annual' ? 'year' : 'month'}</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-4">
                  {billing === 'annual' ? `Just €${ANNUAL_MONTHLY_EQUIV}/mo billed yearly — 2 months free` : 'Switch to annual and get 2 months free'}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {ALL_ACCESS_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold shadow-md"
                  onClick={() => {/* Stripe checkout — wired in Stripe step */}}
                >
                  Subscribe <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">Renews automatically · cancel anytime</p>
              </div>
            </div>

            {/* Students */}
            <div className="rounded-xl border-2 border-border bg-card p-6 hover:border-primary/30 transition-colors">
              <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>Students — 50% off</h4>
              <p className="text-xs text-muted-foreground mt-0.5 mb-4">Same All-Access, half the price</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold tabular-nums">€{billing === 'annual' ? STUDENT_ANNUAL : STUDENT_MONTHLY}</span>
                <span className="text-sm text-muted-foreground">/ {billing === 'annual' ? 'year' : 'month'}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Subscribe, then verify your student status (student email, ID, or enrolment letter) and we&apos;ll apply your discount.
              </p>
              <ul className="space-y-1.5 mb-5">
                {['Everything in All-Access', '50% student discount', 'Verified manually by our team'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full font-semibold"
                onClick={() => {/* Stripe checkout — wired in Stripe step */}}
              >
                Get student rate <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Free tier */}
          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>Free forever — Getting Started + Stage 1</h3>
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

          {/* Mission / Fund */}
          <div className="rounded-xl border bg-gradient-to-br from-[hsl(240_95%_10%)] to-[hsl(240_60%_18%)] p-6 text-white max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-5 w-5 text-[hsl(38_80%_55%)]" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>Your subscription builds the next free course</h3>
            </div>
            <p className="text-sm text-white/80">
              Revenue from subscriptions goes into a dedicated Education Fund that pays for building new courses — many released free to students and schools. When you subscribe, you help the next learner build their first LLM for free.
            </p>
          </div>

          {/* Competitor comparison */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-1 text-center" style={{ fontFamily: 'var(--font-heading)' }}>How we compare</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">Bootcamp depth. Streaming-service price.</p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium"></th>
                    <th className="p-3 font-semibold text-primary">ADD Academica</th>
                    <th className="p-3 font-medium text-muted-foreground">Udemy</th>
                    <th className="p-3 font-medium text-muted-foreground">Coursera</th>
                    <th className="p-3 font-medium text-muted-foreground">Bootcamps</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map(row => (
                    <tr key={row.feature} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.feature}</td>
                      <td className="p-3 font-semibold text-green-600 dark:text-green-400">{row.add}</td>
                      <td className="p-3 text-muted-foreground">{row.udemy}</td>
                      <td className="p-3 text-muted-foreground">{row.coursera}</td>
                      <td className="p-3 text-muted-foreground">{row.bootcamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">Competitor figures are indicative market ranges and may vary.</p>
          </div>

          {/* Free for schools & organisations */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>Free for every classroom</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Every student deserves real AI education — not just those who can pay. ADD Academica is 100% free for accredited schools, universities and educational organisations: the full library, deployable products and certificates, at no cost.
            </p>
            <ol className="space-y-2 mb-4 text-sm">
              {[
                'Sign up as an Organisation. The person who registers becomes the Organisation Admin (or nominates a colleague as Org Admin).',
                'Members join and log in using their valid organisation email.',
                'The Org Admin receives an invitation code to add members.',
                `Each organisation includes up to ${ORG_SEATS} registered students at no cost.`,
                `Need more than ${ORG_SEATS} seats? Contact ${CONTACT_EMAIL} and our team will extend your organisation's capacity.`,
              ].map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a href={`mailto:${CONTACT_EMAIL}?subject=Organisation%20access%20request`}>
              <Button className="font-semibold">
                Apply as an organisation <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </a>
          </div>

          {/* Trust strip */}
          <div className="text-center space-y-2 py-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Free for schools</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Cancel anytime</span>
              <span className="flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> New courses added regularly</span>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Secure payment via Stripe</span>
            </div>
            <p className="text-xs text-muted-foreground">Every subscription funds free education.</p>
          </div>

          {/* How it works */}
          <div className="rounded-xl border bg-card p-6 max-w-3xl mx-auto">
            <h4 className="font-semibold mb-3">How it works</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-0.5">One subscription, everything unlocked</p>
                <p className="text-xs text-muted-foreground">All-Access includes the full LLM course, all GenAI products, and every future course.</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">Cancel anytime</p>
                <p className="text-xs text-muted-foreground">No lock-in. Manage or cancel your subscription whenever you like.</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">Keep your progress</p>
                <p className="text-xs text-muted-foreground">Your XP, badges, quiz scores, and completion certificate stay with your account.</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">Students & schools</p>
                <p className="text-xs text-muted-foreground">Students get 50% off after verification; accredited organisations get full access free.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Invoices ═══════════════ */}
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
                  Invoices will appear here once you start a subscription.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab('courses')}
                >
                  View subscription plans
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
          <p className="text-xs text-muted-foreground">Sign out of your ADD Academica account</p>
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
