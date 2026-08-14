import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://academy.add-individual-solutions.com';

/**
 * POST /api/billing/portal
 *
 * Opens the Stripe Billing Portal so a customer can view invoices, download
 * receipts, update their card, and cancel — without you building any of it.
 *
 * The return URL is a server-side constant, never the client Origin header.
 * (api/checkout previously derived success_url/cancel_url from Origin, which
 * let an attacker mint a real Checkout session for your product that redirected
 * the payer to their own site — a convincing "payment failed, re-enter your
 * card" phishing flow wearing your Stripe branding. Fixed there too.)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`billing-portal:${ip}`, 10, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Billing is not configured.' }, { status: 503 });
    }

    const { data: student } = await supabase
      .from('academy_students')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const customerId = student?.stripe_customer_id as string | null;
    if (!customerId) {
      return NextResponse.json(
        { error: 'No billing history for this account yet.' },
        { status: 404 }
      );
    }

    const stripe = new Stripe(stripeKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_URL}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json({ error: 'Could not open the billing portal' }, { status: 500 });
  }
}
