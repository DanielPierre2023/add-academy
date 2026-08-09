import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const VALID_PLAN_IDS = ['individual_monthly', 'individual_annual', 'school_monthly', 'school_annual'] as const;

const CheckoutSchema = z.object({
  planId: z.enum(VALID_PLAN_IDS, {
    error: `planId must be one of: ${VALID_PLAN_IDS.join(', ')}`,
  }),
  schoolId: z.string().uuid().optional(),
});

/**
 * POST /api/checkout
 *
 * Creates a Stripe Checkout session for the given plan.
 * Requires STRIPE_SECRET_KEY env var.
 *
 * TODO: Wire up Stripe SDK when keys are configured.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
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

    // TODO: Create Stripe Checkout Session
    // const stripe = new Stripe(stripeKey);
    // const session = await stripe.checkout.sessions.create({
    //   customer_email: user.email,
    //   mode: 'subscription',
    //   line_items: [{ price: PRICE_MAP[planId], quantity: 1 }],
    //   success_url: `${request.headers.get('origin')}/account?checkout=success`,
    //   cancel_url: `${request.headers.get('origin')}/pricing?checkout=cancelled`,
    // });
    // return NextResponse.json({ url: session.url });

    return NextResponse.json(
      { error: 'Checkout not yet implemented', planId },
      { status: 501 }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
