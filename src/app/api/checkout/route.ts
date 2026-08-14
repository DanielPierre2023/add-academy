import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const PRICE_MAP: Record<string, string | undefined> = {
  'all-access-monthly': process.env.STRIPE_PRICE_MONTHLY,
  'all-access-annual': process.env.STRIPE_PRICE_ANNUAL,
};

const CheckoutSchema = z.object({
  planId: z.enum(['all-access-monthly', 'all-access-annual']),
});

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session for the given plan.
 */
export async function POST(request: NextRequest) {
  // Unbounded Checkout session creation was possible per account.
  const rl = rateLimit(`checkout:${getClientIp(request)}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 422 }
      );
    }

    const { planId } = parsed.data;

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Contact the administrator.' },
        { status: 503 }
      );
    }

    const priceId = PRICE_MAP[planId];
    if (!priceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for plan "${planId}".` },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeKey);
    // SECURITY: never derive redirect URLs from the client Origin header.
    // An attacker could POST with Origin: https://evil.example and mint a real
    // Checkout session for this product that returns the payer to their own
    // site — a convincing "payment failed, re-enter your card" phishing flow
    // wearing your Stripe branding.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://academy.add-individual-solutions.com';

    // Reuse an existing Stripe customer if we have one on the student record
    const { data: student } = await supabase
      .from('academy_students')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: (student?.stripe_customer_id as string | undefined) || undefined,
      customer_email: student?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan_id: planId },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan_id: planId },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
