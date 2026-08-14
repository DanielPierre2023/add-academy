import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export interface BillingInvoice {
  id: string;
  number: string | null;
  date: string;          // ISO
  description: string;
  amount: number;        // major units, e.g. 12.00
  currency: string;
  status: string;        // paid | open | void | uncollectible | draft
  refunded: boolean;
  amountRefunded: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

/**
 * GET /api/billing/invoices
 *
 * Real invoice history for the signed-in user, straight from Stripe.
 *
 * Replaces `const MOCK_INVOICES: any[] = []` in account-view.tsx, which meant
 * the Invoices tab rendered an empty state for every user, forever — including
 * users who had actually paid. Reported during the 14 Aug 2026 refund test.
 *
 * Refund state is included per invoice, so a refunded charge is visible to the
 * customer rather than silently disappearing.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // Not configured is not an error for the UI — just an empty history.
      return NextResponse.json({ invoices: [], configured: false });
    }

    const { data: student, error: studentErr } = await supabase
      .from('academy_students')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (studentErr) {
      console.error('Invoice lookup: student read failed', studentErr);
      return NextResponse.json({ error: 'Could not load billing profile' }, { status: 500 });
    }

    const customerId = student?.stripe_customer_id as string | null;
    if (!customerId) {
      // Never purchased — a genuinely empty history, not a failure.
      return NextResponse.json({ invoices: [], configured: true });
    }

    const stripe = new Stripe(stripeKey);

    const list = await stripe.invoices.list({
      customer: customerId,
      limit: 24,
      expand: ['data.charge'],
    });

    const invoices: BillingInvoice[] = list.data.map((inv) => {
      const charge = (inv as Stripe.Invoice & { charge?: Stripe.Charge | string | null }).charge;
      const chargeObj = charge && typeof charge !== 'string' ? charge : null;
      const amountRefunded = chargeObj ? (chargeObj.amount_refunded ?? 0) / 100 : 0;

      return {
        id: inv.id,
        number: inv.number ?? null,
        date: new Date((inv.created ?? 0) * 1000).toISOString(),
        description:
          inv.lines?.data?.[0]?.description ||
          inv.description ||
          'ADD Academica subscription',
        amount: (inv.amount_paid ?? inv.amount_due ?? 0) / 100,
        currency: (inv.currency || 'eur').toUpperCase(),
        status: inv.status ?? 'unknown',
        refunded: amountRefunded > 0,
        amountRefunded,
        pdfUrl: inv.invoice_pdf ?? null,
        hostedUrl: inv.hosted_invoice_url ?? null,
      };
    });

    return NextResponse.json({ invoices, configured: true });
  } catch (error) {
    console.error('Invoice list error:', error);
    return NextResponse.json({ error: 'Could not load invoices' }, { status: 500 });
  }
}
