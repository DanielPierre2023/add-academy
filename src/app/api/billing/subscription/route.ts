import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export interface SubscriptionSummary {
  subscribed: boolean;
  tier: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  isStripe: boolean; // has a Stripe subscription id → portal/cancel available
}

/**
 * GET /api/billing/subscription
 *
 * The signed-in user's current subscription summary, so the account page can
 * render real state and a working cancel/resume control.
 *
 * Previously the "My Subscription" card was hardcoded ("Not subscribed") and
 * the account view never loaded the user's subscription at all — leaving
 * paying subscribers with no way to see or cancel their plan.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: subs } = await supabase
      .from('academy_subscriptions')
      .select('tier, status, cancel_at_period_end, current_period_end, stripe_subscription_id, created_at')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Prefer a real Stripe subscription (cancellable) over a manually granted one.
    const sub = subs?.find((s) => s.stripe_subscription_id) ?? subs?.[0];

    if (!sub) {
      return NextResponse.json({
        subscribed: false,
        tier: null,
        status: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        isStripe: false,
      } satisfies SubscriptionSummary);
    }

    return NextResponse.json({
      subscribed: true,
      tier: sub.tier ?? null,
      status: sub.status ?? null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      currentPeriodEnd: sub.current_period_end ?? null,
      isStripe: Boolean(sub.stripe_subscription_id),
    } satisfies SubscriptionSummary);
  } catch (error) {
    console.error('Subscription summary error:', error);
    return NextResponse.json({ error: 'Could not load subscription' }, { status: 500 });
  }
}
