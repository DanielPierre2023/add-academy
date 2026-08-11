import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Admin Supabase client (service role) to write subscription state
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id || session.client_reference_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (userId && customerId) {
          await supabase
            .from('academy_students')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);
        }

        if (userId && subscriptionId) {
          await supabase.from('academy_subscriptions').upsert(
            {
              student_id: userId,
              stripe_subscription_id: subscriptionId,
              tier: 'full_access',
              status: 'active',
              auto_renew: true,
            },
            { onConflict: 'stripe_subscription_id' }
          );
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
        await supabase
          .from('academy_subscriptions')
          .update({
            status,
            cancel_at_period_end: sub.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      default:
        // ignore other events
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
