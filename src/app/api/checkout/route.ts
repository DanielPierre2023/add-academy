import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for the given plan.
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env vars.
 *
 * TODO: Wire up Stripe SDK when keys are configured.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { planId } = await request.json();
    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Contact the administrator.' },
        { status: 503 }
      );
    }

    // TODO: Create Stripe Checkout Session
    // const stripe = new Stripe(stripeKey);
    // const session = await stripe.checkout.sessions.create({ ... });
    // return NextResponse.json({ url: session.url });

    return NextResponse.json(
      { error: 'Checkout not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
