'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import type { Language } from '@/types';
import {
  User,
  Mail,
  Shield,
  Crown,
  Zap,
  BookOpen,
  Code2,
  Brain,
  Trophy,
  Flame,
  ChevronRight,
  Check,
  Star,
  Sparkles,
  GraduationCap,
  Clock,
  ArrowRight,
  CreditCard,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

/* ─────────────────────────────────────────────
   Mock pricing data — will be replaced by Stripe
   ───────────────────────────────────────────── */
const PLANS = [
  {
    id: 'free',
    name: 'Explorer',
    price: 0,
    period: '',
    description: 'Get started with the fundamentals',
    badge: null,
    features: [
      'First 7 lectures (Getting Started)',
      'Basic Python sandbox',
      'Community quizzes',
      'Progress tracking & XP',
    ],
    limitations: [
      'No AI Tutor access',
      'No advanced stages',
      'No certificate',
    ],
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
    highlighted: false,
    ribbon: null,
  },
  {
    id: 'pro',
    name: 'Pro Learner',
    price: 19,
    period: '/mo',
    annualPrice: 14,
    annualSaving: 60,
    description: 'Full access to master LLMs end-to-end',
    badge: 'MOST POPULAR',
    features: [
      'All 49 interactive lectures',
      'Full Python sandbox with NumPy, SciPy',
      'AI Tutor — unlimited questions',
      'All quizzes & capstone projects',
      'Completion certificate',
      'Priority email support',
    ],
    limitations: [],
    cta: 'Upgrade to Pro',
    ctaVariant: 'default' as const,
    highlighted: true,
    ribbon: 'Best Value',
  },
  {
    id: 'team',
    name: 'Team',
    price: 49,
    period: '/mo',
    annualPrice: 39,
    annualSaving: 120,
    description: 'For teams & organizations learning together',
    badge: null,
    features: [
      'Everything in Pro',
      'Up to 10 team seats',
      'Team progress dashboard',
      'Admin controls & analytics',
      'Bulk certificate generation',
      'Dedicated support channel',
      'Custom onboarding session',
    ],
    limitations: [],
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
    highlighted: false,
    ribbon: null,
  },
];

/* Mock invoices */
const MOCK_INVOICES: any[] = [];

function tierLabel(tier: string) {
  switch (tier) {
    case 'pro': return 'Pro Learner';
    case 'team': return 'Team';
    case 'enterprise': return 'Enterprise';
    case 'school': return 'School';
    default: return 'Explorer (Free)';
  }
}

function tierColor(tier: string) {
  switch (tier) {
    case 'pro': return 'bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)]';
    case 'team': return 'bg-primary text-primary-foreground';
    case 'school': return 'bg-green-600 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function AccountView() {
  const { user, signOut, loading } = useAuth();
  const { language, getCompletionPercentage, progress, quizScores, xp, streak, totalCodeBlocksRun } = useAcademyStore();
  const router = useRouter();
  const lang = language as Language;

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'invoices'>('overview');

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
  const currentTier = user.tier || 'free';

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          My Account
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile, subscription, and learning progress.
        </p>
      </div>

      {/* ── Tab navigation ── */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: User },
          { id: 'subscription' as const, label: 'Subscription', icon: CreditCard },
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
                  <h2 className="text-xl font-semibold">{user.name || 'Academy Student'}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                  <div className="mt-2">
                    <Badge className={tierColor(currentTier)}>
                      {currentTier === 'pro' && <Crown className="mr-1 h-3 w-3" />}
                      {tierLabel(currentTier)}
                    </Badge>
                  </div>
                </div>
              </div>
              <Link href="/account/settings">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: 'Lectures', value: `${completedLectures}/49`, color: 'text-blue-500' },
              { icon: Brain, label: 'Quizzes', value: String(quizzesTaken), color: 'text-purple-500' },
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
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Time Invested</span>
                  <span>{hoursSpent}h {minutesSpent}m</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(38_80%_55%)] transition-all"
                    style={{ width: `${Math.min(100, (totalTime / (50 * 3600)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade CTA for free users */}
          {currentTier === 'free' && (
            <div className="relative overflow-hidden rounded-xl border-2 border-[hsl(38_80%_55%)] bg-gradient-to-br from-[hsl(240_95%_10%)] to-[hsl(240_60%_18%)] p-6 text-white">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[hsl(38_80%_55%/0.1)] blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-[hsl(38_80%_55%)]" />
                  <span className="text-sm font-semibold text-[hsl(38_80%_55%)]">UNLOCK FULL ACCESS</span>
                </div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                  You&apos;re on the free Explorer plan
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  Upgrade to Pro to access all 49 lectures, the AI Tutor, capstone projects, and earn your certificate. Join 2,400+ learners building LLMs from scratch.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setActiveTab('subscription')}
                    className="bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold shadow-lg"
                  >
                    View Plans <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                  <span className="text-xs text-white/50">Starting at $14/mo billed annually</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => setActiveTab('subscription')}
              className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Manage Subscription</p>
                  <p className="text-xs text-muted-foreground">View plans, upgrade, or cancel</p>
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
          TAB: Subscription / Pricing
          ═══════════════════════════════════════════════ */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Current plan summary */}
          <div className="rounded-xl border bg-card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Plan</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{tierLabel(currentTier)}</span>
                <Badge className={tierColor(currentTier)}>Active</Badge>
              </div>
            </div>
            {currentTier !== 'free' && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Next billing date</p>
                <p className="text-sm font-medium">—</p>
              </div>
            )}
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
              className={`relative h-7 w-14 rounded-full transition-colors ${
                billingCycle === 'annual' ? 'bg-[hsl(38_80%_55%)]' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
            <span className={`text-sm ${billingCycle === 'annual' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            {billingCycle === 'annual' && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                Save up to 26%
              </Badge>
            )}
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PLANS.map(plan => {
              const isCurrentPlan = plan.id === currentTier;
              const displayPrice = billingCycle === 'annual' && plan.annualPrice
                ? plan.annualPrice
                : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border-2 p-6 transition-all ${
                    plan.highlighted
                      ? 'border-[hsl(38_80%_55%)] shadow-lg shadow-[hsl(38_80%_55%/0.1)] scale-[1.02]'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {/* Popular badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] font-bold text-xs px-3 shadow-md">
                        <Star className="mr-1 h-3 w-3" />
                        {plan.badge}
                      </Badge>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      {plan.price > 0 && billingCycle === 'annual' && plan.annualPrice && (
                        <span className="text-sm text-muted-foreground line-through mr-1">
                          ${plan.price}
                        </span>
                      )}
                      <span className="text-4xl font-bold tabular-nums">
                        {displayPrice === 0 ? 'Free' : `$${displayPrice}`}
                      </span>
                      {plan.period && (
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                    {billingCycle === 'annual' && plan.annualSaving && (
                      <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                        Save ${plan.annualSaving}/year
                      </p>
                    )}
                  </div>

                  {/* CTA button */}
                  <Button
                    className={`w-full mb-5 ${
                      plan.highlighted && !isCurrentPlan
                        ? 'bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold shadow-md'
                        : ''
                    }`}
                    variant={isCurrentPlan ? 'outline' : plan.ctaVariant}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Current Plan
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        {plan.cta} <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                        {feature}
                      </li>
                    ))}
                    {plan.limitations.map(limitation => (
                      <li key={limitation} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-xs">✕</span>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Social proof / trust */}
          <div className="text-center space-y-2 py-4">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Cancel anytime</span>
              <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Secure payment</span>
              <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Instant access</span>
            </div>
            <p className="text-xs text-muted-foreground">
              30-day money-back guarantee. No questions asked.
            </p>
          </div>

          {/* Comparison highlight for free users */}
          {currentTier === 'free' && (
            <div className="rounded-xl bg-gradient-to-r from-primary/5 to-[hsl(38_80%_55%/0.05)] border p-5">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(38_80%_55%)]" />
                Why learners upgrade to Pro
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-0.5">42 more lectures</p>
                  <p className="text-xs text-muted-foreground">Go from fundamentals through full GPT-2 training & deployment</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5">AI Tutor access</p>
                  <p className="text-xs text-muted-foreground">Get instant, personalized help when you&apos;re stuck on any concept</p>
                </div>
                <div>
                  <p className="font-medium mb-0.5">Completion certificate</p>
                  <p className="text-xs text-muted-foreground">Shareable credential proving your LLM engineering skills</p>
                </div>
              </div>
            </div>
          )}

          {/* Cancel / downgrade for paid users */}
          {currentTier !== 'free' && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive mb-1">Cancel Subscription</p>
              <p className="text-muted-foreground mb-3">
                You&apos;ll keep access until the end of your current billing period. Your progress and XP are saved permanently.
              </p>
              <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                Cancel Subscription
              </Button>
            </div>
          )}
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
                  {currentTier === 'free'
                    ? 'Invoices will appear here once you upgrade to a paid plan.'
                    : 'Your first invoice will appear after your next billing date.'
                  }
                </p>
                {currentTier === 'free' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab('subscription')}
                  >
                    View Plans
                  </Button>
                )}
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
                      <td className="py-3 text-right tabular-nums">${inv.amount}</td>
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
            {currentTier === 'free' ? (
              <p className="text-sm text-muted-foreground">
                No payment method on file. Add one when you upgrade to a paid plan.
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-16 rounded border bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground">
                    VISA
                  </div>
                  <div>
                    <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                    <p className="text-xs text-muted-foreground">Expires 12/2027</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Danger zone ── */}
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
