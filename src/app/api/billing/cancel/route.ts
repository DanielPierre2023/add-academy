import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

export const runtime = 'nodejs';

const bodySchema = z.object({ resume: z.boolean().optional() });

/**
 * POST /api/billing/cancel   body: { resume?: boolean }
 *
 * Native in-app cancel / resume for the signed-in user's own subscription.
 * Cancels at period end (the humane default — the user keeps access until the
 * end of the period they already paid for), or resumes a scheduled cancel.
 *
 * This does NOT depend on the Stripe Customer Portal being configured. The
 * Stripe webhook (customer.subscription.updated) remains the source of truth
 * and syncs cancel_at_period_end/status back to academy_subscriptions; we
 * return the fresh flag so the UI updates immediately.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`billing-cancel:${ip}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let resume = false;
    try {
      const parsed = bodySchema.safeParse(await request.json());
      if (parsed.success) resume = Boolean(parsed.data.resume);
    } catch {
      // Empty/invalid body → treat as a cancel request.
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
    }

    // The user's own active Stripe-backed subscription (RLS-scoped to them).
    const { data: subs } = await supabase
      .from('academy_subscriptions')
      .select('stripe_subscription_id, created_at')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false });

    const subId = subs?.[0]?.stripe_subscription_id as string | undefined;
    if (!subId) {
      return NextResponse.json(
        { error: 'No cancellable subscription found for this account.' },
        { status: 404 }
      );
    }

    const stripe = new Stripe(stripeKey);
    const updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: !resume,
    });

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
    });
  } catch (error) {
    console.error('Billing cancel error:', error);
    return NextResponse.json({ error: 'Could not update the subscription' }, { status: 500 });
  }
}
