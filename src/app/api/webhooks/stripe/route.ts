import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Stripe webhook handler.
 *
 * W1.3 — rewritten after a live incident on 14 Aug 2026: a refunded test
 * subscription (sub_1U4It4G0WrhMtD2EHw91qUEt) kept status='active' and went on
 * granting paid access. The previous handler had four defects, all of which
 * this file fixes:
 *
 *   1. NO REFUND HANDLING. charge.refunded, charge.dispute.created and
 *      invoice.payment_failed all fell through to `default:` and returned 200,
 *      so Stripe recorded successful delivery and never retried. A user could
 *      pay, download the gated ZIPs, charge back, and keep access.
 *
 *   2. UNCHECKED WRITES. supabase-js RESOLVES with { error } instead of
 *      throwing, so the old try/catch never fired: a failed write returned 200
 *      and Stripe never retried. Every write here is checked, and any failure
 *      returns a non-2xx so Stripe redelivers.
 *
 *   3. PERIOD FIELDS NEVER WRITTEN. current_period_start/end stayed NULL while
 *      the entitlement gate read current_period_end. Both are written now.
 *
 *   4. NO IDEMPOTENCY. Stripe delivers at-least-once. The stripe_events table
 *      (005_billing_hardening.sql) makes replays no-ops.
 */

/** Stripe status -> our academy_subscriptions_status_check domain. */
function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'unpaid':
      return s;
    case 'incomplete':
    case 'incomplete_expired':
      return 'unpaid';
    case 'paused':
      return 'canceled';
    default:
      return 'canceled';
  }
}

const iso = (unix: number | null | undefined): string | null =>
  typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null;

/** Revocation copy, trilingual — the platform is EN/RO/EL. */
const REVOKE_COPY: Record<string, { t: [string, string, string]; b: [string, string, string] }> = {
  refund: {
    t: ['Your payment has been refunded',
        'Plata ta a fost rambursată',
        'Η πληρωμή σας επιστράφηκε'],
    b: ['Your subscription payment has been refunded in full. Access to paid course content has ended and you are back on the free plan. Stages 0 and 1 remain available.',
        'Plata pentru abonamentul tău a fost rambursată integral. Accesul la conținutul plătit s-a încheiat și ai revenit la planul gratuit. Etapele 0 și 1 rămân disponibile.',
        'Η πληρωμή της συνδρομής σας επιστράφηκε πλήρως. Η πρόσβαση στο πληρωμένο περιεχόμενο τερματίστηκε και επιστρέψατε στο δωρεάν πλάνο. Τα Στάδια 0 και 1 παραμένουν διαθέσιμα.'],
  },
  dispute: {
    t: ['Your payment is under dispute',
        'Plata ta este în litigiu',
        'Η πληρωμή σας βρίσκεται σε αμφισβήτηση'],
    b: ['A chargeback was opened against your payment, so paid access is paused while it is resolved. If this was a mistake, contact us and we will restore your access.',
        'A fost deschis un litigiu pentru plata ta, așa că accesul plătit este suspendat până la rezolvare. Dacă este o eroare, contactează-ne și îți restaurăm accesul.',
        'Ανοίχθηκε αμφισβήτηση για την πληρωμή σας, οπότε η πληρωμένη πρόσβαση έχει παύσει μέχρι να επιλυθεί. Αν πρόκειται για λάθος, επικοινωνήστε μαζί μας.'],
  },
  payment_failed: {
    t: ['We could not renew your subscription',
        'Nu am putut reînnoi abonamentul tău',
        'Δεν μπορέσαμε να ανανεώσουμε τη συνδρομή σας'],
    b: ['Your renewal payment failed after several attempts, so paid access has paused. Update your card and your access resumes immediately.',
        'Plata de reînnoire a eșuat după mai multe încercări, așa că accesul plătit este suspendat. Actualizează cardul și accesul revine imediat.',
        'Η πληρωμή ανανέωσης απέτυχε μετά από αρκετές προσπάθειες, οπότε η πληρωμένη πρόσβαση έχει παύσει. Ενημερώστε την κάρτα σας και η πρόσβαση επανέρχεται αμέσως.'],
  },
};

/** Resolve a Stripe subscription id from a charge (refunds and disputes carry a charge). */
async function subscriptionIdFromCharge(
  stripe: Stripe,
  charge: Stripe.Charge
): Promise<string | null> {
  const invoiceRef = charge.invoice;
  if (!invoiceRef) return null;
  const invoice =
    typeof invoiceRef === 'string' ? await stripe.invoices.retrieve(invoiceRef) : invoiceRef;
  const subRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription;
  if (!subRef) return null;
  return typeof subRef === 'string' ? subRef : subRef.id;
}

/**
 * Pull access immediately and tell the user.
 * Throws on any database failure so the caller returns non-2xx and Stripe retries.
 */
async function revokeAccess(
  supabase: SupabaseClient,
  stripeSubscriptionId: string,
  reason: 'refund' | 'dispute' | 'payment_failed',
  status: 'refunded' | 'disputed' | 'unpaid'
): Promise<void> {
  const nowIso = new Date().toISOString();

  const { data: rows, error: updErr } = await supabase
    .from('academy_subscriptions')
    .update({
      status,
      revoked_at: nowIso,
      revoked_reason: reason,
      auto_renew: false,
      cancel_at_period_end: true,
      current_period_end: nowIso, // explicitly in the past for any date-based gate
      updated_at: nowIso,
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select('student_id');

  if (updErr) throw new Error(`revoke update failed: ${updErr.message}`);
  if (!rows || rows.length === 0) {
    // Nothing local to revoke (e.g. a charge unrelated to a course subscription).
    console.warn(`No local subscription for ${stripeSubscriptionId}; nothing to revoke.`);
    return;
  }

  const studentId = rows[0].student_id as string;

  const { error: tierErr } = await supabase
    .from('academy_students')
    .update({ tier: 'free', updated_at: nowIso })
    .eq('id', studentId);
  if (tierErr) throw new Error(`tier downgrade failed: ${tierErr.message}`);

  // The repo has no email provider. This gives the user a durable in-app
  // message immediately; add sendEmail() here once a provider is chosen.
  const copy = REVOKE_COPY[reason];
  const { error: notifErr } = await supabase.from('academy_notifications').insert({
    student_id: studentId,
    kind: `billing_${reason}`,
    severity: reason === 'refund' ? 'warning' : 'critical',
    title_en: copy.t[0], title_ro: copy.t[1], title_el: copy.t[2],
    body_en: copy.b[0], body_ro: copy.b[1], body_el: copy.b[2],
  });
  if (notifErr) throw new Error(`notification insert failed: ${notifErr.message}`);
}

/** Write the authoritative subscription state from a Stripe Subscription object. */
async function syncSubscription(
  supabase: SupabaseClient,
  sub: Stripe.Subscription,
  userIdHint?: string | null
): Promise<void> {
  const studentId = (sub.metadata?.supabase_user_id as string | undefined) || userIdHint || null;
  const nowIso = new Date().toISOString();
  const status = mapStatus(sub.status);

  const payload: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    tier: 'full_access',
    status,
    current_period_start: iso(sub.current_period_start),
    current_period_end: iso(sub.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    auto_renew: !(sub.cancel_at_period_end ?? false),
    updated_at: nowIso,
  };
  if (studentId) payload.student_id = studentId;

  // Clear any previous revocation when a subscription genuinely goes active again.
  if (status === 'active' || status === 'trialing') {
    payload.revoked_at = null;
    payload.revoked_reason = null;
  }

  if (!studentId) {
    const { error } = await supabase
      .from('academy_subscriptions')
      .update(payload)
      .eq('stripe_subscription_id', sub.id);
    if (error) throw new Error(`subscription update failed: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from('academy_subscriptions')
    .upsert(payload, { onConflict: 'stripe_subscription_id' });
  if (error) throw new Error(`subscription upsert failed: ${error.message}`);

  const tier = status === 'active' || status === 'trialing' ? 'pro' : 'free';
  const { error: tierErr } = await supabase
    .from('academy_students')
    .update({ tier, updated_at: nowIso })
    .eq('id', studentId);
  if (tierErr) throw new Error(`tier sync failed: ${tierErr.message}`);
}

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ---- Idempotency -------------------------------------------------------
  // Stripe delivers at-least-once and retries on non-2xx. A conflict here
  // means we already applied this event.
  const { data: inserted, error: idemErr } = await supabase
    .from('stripe_events')
    .upsert({ event_id: event.id, event_type: event.type }, {
      onConflict: 'event_id',
      ignoreDuplicates: true,
    })
    .select('event_id');

  if (idemErr) {
    console.error('Idempotency ledger write failed:', idemErr);
    return NextResponse.json({ error: 'Ledger unavailable' }, { status: 500 });
  }
  if (!inserted || inserted.length === 0) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Do NOT grant access before funds settle. Async methods (SEPA, Bacs)
        // complete the session while payment_status is still 'unpaid'.
        if (
          session.payment_status !== 'paid' &&
          session.payment_status !== 'no_payment_required'
        ) {
          console.warn(
            `checkout.session.completed ${session.id} payment_status=${session.payment_status}; no access granted.`
          );
          break;
        }

        const userId = session.metadata?.supabase_user_id || session.client_reference_id;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;

        if (userId && customerId) {
          const { error } = await supabase
            .from('academy_students')
            .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
            .eq('id', userId);
          if (error) throw new Error(`customer id write failed: ${error.message}`);
        }

        if (subscriptionId) {
          // Retrieve the subscription so the period fields are real values
          // rather than the nulls the previous handler left behind.
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(supabase, sub, userId);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(supabase, event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const nowIso = new Date().toISOString();
        const { data: rows, error } = await supabase
          .from('academy_subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
            auto_renew: false,
            updated_at: nowIso,
          })
          .eq('stripe_subscription_id', sub.id)
          .select('student_id');
        if (error) throw new Error(`cancel update failed: ${error.message}`);
        if (rows?.[0]) {
          const { error: tErr } = await supabase
            .from('academy_students')
            .update({ tier: 'free', updated_at: nowIso })
            .eq('id', rows[0].student_id as string);
          if (tErr) throw new Error(`tier downgrade failed: ${tErr.message}`);
        }
        break;
      }

      // ---- Money going back to the customer -------------------------------
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const subId = await subscriptionIdFromCharge(stripe, charge);
        if (subId) {
          await revokeAccess(supabase, subId, 'refund', 'refunded');
        } else {
          console.warn(`charge.refunded ${charge.id}: no subscription resolved.`);
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeRef = dispute.charge;
        const charge =
          typeof chargeRef === 'string' ? await stripe.charges.retrieve(chargeRef) : chargeRef;
        const subId = await subscriptionIdFromCharge(stripe, charge);
        if (subId) await revokeAccess(supabase, subId, 'dispute', 'disputed');
        break;
      }

      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        // Only a win restores access; 'lost' and 'warning_closed' stay revoked.
        if (dispute.status === 'won') {
          const chargeRef = dispute.charge;
          const charge =
            typeof chargeRef === 'string' ? await stripe.charges.retrieve(chargeRef) : chargeRef;
          const subId = await subscriptionIdFromCharge(stripe, charge);
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            await syncSubscription(supabase, sub);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
          next_payment_attempt?: number | null;
        };
        const subRef = invoice.subscription;
        const subId = typeof subRef === 'string' ? subRef : subRef?.id;
        if (!subId) break;

        if (invoice.next_payment_attempt) {
          // Stripe will retry — mark past_due but keep access during dunning.
          const { error } = await supabase
            .from('academy_subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subId);
          if (error) throw new Error(`past_due update failed: ${error.message}`);
        } else {
          // Final attempt failed — pull access.
          await revokeAccess(supabase, subId, 'payment_failed', 'unpaid');
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subRef = invoice.subscription;
        const subId = typeof subRef === 'string' ? subRef : subRef?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(supabase, sub);
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged deliberately.
        break;
    }
  } catch (err) {
    // Non-2xx so Stripe retries. The idempotency row is removed first, or the
    // retry would be swallowed as a duplicate and the event lost for good.
    console.error(`Webhook handler error for ${event.type} (${event.id}):`, err);
    await supabase.from('stripe_events').delete().eq('event_id', event.id);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
