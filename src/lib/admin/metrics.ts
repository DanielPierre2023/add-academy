// src/lib/admin/metrics.ts
import { ALL_PLANS, BILLING_CYCLE_MONTHS } from '@/lib/subscriptions/plans';

/** Accounts we never count as "customers" for conversion / discount / revenue. */
const INTERNAL_EMAIL_DOMAINS = ['add-individual-solutions.com'];

export interface SubscriptionLike {
  tier: string;
  status: string;
  discount_percent: number;
  student_id: string;
}

export interface StudentLike {
  id: string;
  email: string;
  tier: string;
  school_id: string | null;
  created_at: string;
  last_active_at?: string | null;
  preferred_language?: string | null;
}

export function isInternalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return INTERNAL_EMAIL_DOMAINS.includes(domain);
}

/** A comped subscription contributes no revenue and shouldn't skew customer stats. */
export function isComped(sub: SubscriptionLike, studentEmail?: string): boolean {
  if (sub.discount_percent >= 100) return true;
  if (studentEmail && isInternalEmail(studentEmail)) return true;
  return false;
}

/** Resolve a subscription tier to a catalog plan, tolerating `_` vs `-` slugs. */
export function planForTier(tier: string) {
  const normalized = tier.replace(/_/g, '-');
  return (
    ALL_PLANS.find((p) => p.id === tier) ??
    ALL_PLANS.find((p) => p.id === normalized) ??
    null
  );
}

/** Net monthly value of a single active subscription, in EUR. Returns 0 if unknown/comped. */
export function monthlySubscriptionValue(sub: SubscriptionLike): number {
  const plan = planForTier(sub.tier);
  if (!plan) return 0;
  const cyclePrice = plan.price * (100 - clampPct(sub.discount_percent)) / 100;
  return cyclePrice / BILLING_CYCLE_MONTHS;
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export interface RevenueBreakdown {
  /** Net recurring revenue per month (MRR) from real, non-comped active subs. */
  mrr: number;
  /** Net revenue per 3-month billing cycle. */
  perCycle: number;
  /** Active subs that resolved to a known plan and generate revenue. */
  payingCount: number;
  /** Active subs that are comped / internal (excluded from revenue). */
  compedCount: number;
  /** Active subs whose tier didn't match any catalog plan. */
  unknownTierCount: number;
}

export function computeRevenue(
  subscriptions: SubscriptionLike[],
  emailByStudentId: Map<string, string> = new Map(),
): RevenueBreakdown {
  let mrr = 0;
  let payingCount = 0;
  let compedCount = 0;
  let unknownTierCount = 0;

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;
    const email = emailByStudentId.get(sub.student_id);
    if (isComped(sub, email)) {
      compedCount++;
      continue;
    }
    const plan = planForTier(sub.tier);
    if (!plan) {
      unknownTierCount++;
      continue;
    }
    const value = monthlySubscriptionValue(sub);
    if (value > 0) {
      mrr += value;
      payingCount++;
    } else {
      compedCount++;
    }
  }

  return {
    mrr,
    perCycle: mrr * BILLING_CYCLE_MONTHS,
    payingCount,
    compedCount,
    unknownTierCount,
  };
}

export interface CustomerStats {
  /** Students who could plausibly convert (external, not internal staff). */
  addressable: number;
  /** Addressable students on a paid tier. */
  paying: number;
  /** Conversion %, or null when there is no addressable audience yet. */
  conversionPct: number | null;
  /** Average discount across real (non-comped) active subs, or null if none. */
  avgDiscountPct: number | null;
}

export function computeCustomerStats(
  students: StudentLike[],
  subscriptions: SubscriptionLike[],
): CustomerStats {
  const addressableStudents = students.filter((s) => !isInternalEmail(s.email));
  const addressable = addressableStudents.length;
  const paying = addressableStudents.filter((s) => s.tier && s.tier !== 'free').length;

  const emailById = new Map(students.map((s) => [s.id, s.email]));
  const realActive = subscriptions.filter(
    (s) => s.status === 'active' && !isComped(s, emailById.get(s.student_id)),
  );
  const avgDiscountPct =
    realActive.length === 0
      ? null
      : Math.round(
          realActive.reduce((sum, s) => sum + clampPct(s.discount_percent), 0) /
            realActive.length,
        );

  return {
    addressable,
    paying,
    conversionPct: addressable === 0 ? null : Math.round((paying / addressable) * 100),
    avgDiscountPct,
  };
}
