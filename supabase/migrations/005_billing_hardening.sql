-- ============================================================================
-- 005_billing_hardening.sql
--
-- Supports W1.3 (Stripe hardening) and the refund incident of 14 Aug 2026.
--
-- What went wrong, verified against production:
--   subscription ad8a75f3-2a3c-4f25-914a-de3b49e7b76d
--   (stripe sub_1U4It4G0WrhMtD2EHw91qUEt, nicuddobos@gmail.com)
--     status               = 'active'   <- still granting access after a refund
--     current_period_start = NULL       <- webhook never wrote it
--     current_period_end   = NULL       <- webhook never wrote it
--     updated_at           = created_at <- the refund produced NO write at all
--
--   Root cause: api/webhooks/stripe/route.ts handled only
--   checkout.session.completed and customer.subscription.*. Every refund event
--   (charge.refunded, charge.dispute.created, invoice.payment_failed) fell
--   through to `default:` and was silently dropped with a 200 response, so
--   Stripe considered delivery successful and never retried.
--
-- This migration adds the state the corrected webhook needs. It does NOT
-- revoke the affected subscription -- see 005b_revoke_refunded_subscription.sql
-- for that, which is a data change you should run and review separately.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Webhook idempotency.
--    Stripe delivers at-least-once and retries on non-2xx. Without a dedupe
--    key, a retry re-applies the handler. The event id is the natural key.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id     text PRIMARY KEY,
  event_type   text        NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  payload      jsonb
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies: service_role bypasses RLS, everyone else is denied. Correct --
-- this table is webhook bookkeeping and must never be readable by a client.

COMMENT ON TABLE public.stripe_events IS
  'Stripe webhook idempotency ledger. INSERT ... ON CONFLICT DO NOTHING; a '
  'conflict means the event was already processed and the handler returns 200 early.';

-- ---------------------------------------------------------------------------
-- 2. Explicit revocation state on subscriptions.
--    'canceled' alone cannot distinguish "user cancelled at period end" from
--    "we refunded them and pulled access immediately".
-- ---------------------------------------------------------------------------
ALTER TABLE public.academy_subscriptions
  ADD COLUMN IF NOT EXISTS revoked_at     timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text;

-- Widen the status CHECK to include the refund/dispute terminal states.
ALTER TABLE public.academy_subscriptions
  DROP CONSTRAINT IF EXISTS academy_subscriptions_status_check;

ALTER TABLE public.academy_subscriptions
  ADD CONSTRAINT academy_subscriptions_status_check
  CHECK (status = ANY (ARRAY[
    'active', 'canceled', 'past_due', 'trialing',
    'refunded',   -- money returned; access revoked immediately
    'disputed',   -- chargeback opened; access revoked pending resolution
    'unpaid'      -- payment failed after retries
  ]));

COMMENT ON COLUMN public.academy_subscriptions.revoked_reason IS
  'Why access was pulled: refund | dispute | payment_failed | admin. NULL when active.';

-- Fast lookup by Stripe id -- every webhook handler filters on this.
CREATE UNIQUE INDEX IF NOT EXISTS academy_subscriptions_stripe_sub_id_key
  ON public.academy_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. In-app notifications.
--
--    The repo has NO email infrastructure -- no Resend, SendGrid, Postmark or
--    nodemailer anywhere (the only mail path is Supabase's
--    auth.admin.inviteUserByEmail). So a refunded user currently receives no
--    communication of any kind.
--
--    This table gives users a durable, in-app message immediately, with no new
--    vendor. sendEmail() in the webhook is a single call-site to add later once
--    you pick a provider.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academy_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.academy_students(id) ON DELETE CASCADE,
  kind        text NOT NULL,          -- 'billing_refund' | 'billing_dispute' | 'billing_failed' | 'info'
  severity    text NOT NULL DEFAULT 'info'
              CHECK (severity = ANY (ARRAY['info', 'warning', 'critical'])),
  title_en    text NOT NULL,
  title_ro    text NOT NULL,
  title_el    text NOT NULL,
  body_en     text NOT NULL,
  body_ro     text NOT NULL,
  body_el     text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_notifications_student_idx
  ON public.academy_notifications (student_id, created_at DESC);

ALTER TABLE public.academy_notifications ENABLE ROW LEVEL SECURITY;

-- Users read ONLY their own notifications.
DROP POLICY IF EXISTS "notifications_read_own" ON public.academy_notifications;
CREATE POLICY "notifications_read_own"
  ON public.academy_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- Marking-as-read goes through a server action (markNotificationRead in
-- src/lib/notifications/actions.ts), NOT a client UPDATE policy.
--
-- Rationale: an UPDATE policy here would need a WITH CHECK that re-asserts
-- every immutable column, and the only way to express that is a subquery
-- against this same table from inside its own policy. That is fragile, and
-- getting it wrong is exactly the class of bug 004 just fixed (an UPDATE
-- policy whose missing WITH CHECK let any column be rewritten). A service-role
-- server action that only ever writes read_at is simpler and cannot be
-- widened by accident.

-- Admins can read everything (support).
DROP POLICY IF EXISTS "notifications_admin_read" ON public.academy_notifications;
CREATE POLICY "notifications_admin_read"
  ON public.academy_notifications FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- No INSERT policy: only the service role (webhooks / server actions) writes.

COMMIT;

-- ============================================================================
-- VERIFY
--
--   select column_name from information_schema.columns
--   where table_name = 'academy_subscriptions'
--     and column_name in ('revoked_at','revoked_reason');   -- expect 2 rows
--
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'academy_subscriptions_status_check';   -- expect 7 states
--
--   select relname, relrowsecurity from pg_class
--   where relname in ('stripe_events','academy_notifications');  -- expect true, true
-- ============================================================================
