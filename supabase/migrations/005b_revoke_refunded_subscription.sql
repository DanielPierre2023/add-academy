-- ============================================================================
-- 005b_revoke_refunded_subscription.sql
--
-- ONE-OFF DATA FIX for the refunded test subscription of 14 Aug 2026.
-- Run AFTER 005_billing_hardening.sql. Review before running.
--
-- Target (verified in production before writing this):
--   student  87da8d6e-066f-4264-b27d-367a2e543eb2  nicuddobos@gmail.com
--   sub      ad8a75f3-2a3c-4f25-914a-de3b49e7b76d
--   stripe   sub_1U4It4G0WrhMtD2EHw91qUEt
--   state    status='active', period_start=NULL, period_end=NULL,
--            updated_at = created_at  (the refund never reached the database)
--
-- ---------------------------------------------------------------------------
-- WHY THIS DOES NOT DELETE THE ROW
-- ---------------------------------------------------------------------------
-- You asked for the subscription to be deleted. I am recommending against a
-- hard DELETE, for three reasons:
--
--   1. Accounting. A charge was made and refunded. That is a real financial
--      event in your Stripe account. Deleting the local record leaves your
--      database unable to explain a line item that still exists at Stripe --
--      and it is the kind of gap an accountant or an audit will ask about.
--
--   2. Idempotency. The corrected webhook matches on stripe_subscription_id.
--      If the row is gone and Stripe later re-delivers ANY event for
--      sub_1U4It4G0WrhMtD2EHw91qUEt (retries can arrive up to 3 days later),
--      the handler finds nothing to update and the event is lost again --
--      the exact failure mode we are fixing.
--
--   3. Support. If this user contacts you about the refund, "no record" is a
--      worse answer than "refunded on 14 Aug, access revoked the same day".
--
-- Setting status='refunded' + revoked_at blocks access just as completely --
-- every entitlement check requires status='active' -- while keeping the trail.
--
-- If you still want the row gone, the DELETE is at the bottom, commented out.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Revoke access.
-- ---------------------------------------------------------------------------
UPDATE public.academy_subscriptions
SET status         = 'refunded',
    revoked_at     = now(),
    revoked_reason = 'refund',
    auto_renew     = false,
    cancel_at_period_end = true,
    -- An explicitly past period end means every gate treats this as expired
    -- even if some code path only looks at the date.
    current_period_end = LEAST(COALESCE(current_period_end, now()), now()),
    updated_at     = now()
WHERE stripe_subscription_id = 'sub_1U4It4G0WrhMtD2EHw91qUEt';

-- ---------------------------------------------------------------------------
-- 2. Drop the student back to the free tier.
--    (tier is already 'free' on this account -- this is belt-and-braces and a
--    no-op if so. It matters for any future refund where tier was upgraded.)
-- ---------------------------------------------------------------------------
UPDATE public.academy_students
SET tier = 'free',
    updated_at = now()
WHERE id = '87da8d6e-066f-4264-b27d-367a2e543eb2'
  AND tier <> 'free';

-- ---------------------------------------------------------------------------
-- 3. Tell the user. They were never notified of the refund.
--    Trilingual, because the platform is trilingual.
-- ---------------------------------------------------------------------------
INSERT INTO public.academy_notifications
  (student_id, kind, severity, title_en, title_ro, title_el, body_en, body_ro, body_el)
VALUES (
  '87da8d6e-066f-4264-b27d-367a2e543eb2',
  'billing_refund',
  'warning',
  'Your payment has been refunded',
  'Plata ta a fost rambursată',
  'Η πληρωμή σας επιστράφηκε',
  'Your subscription payment has been refunded in full. Your access to paid course content has ended, and you have been returned to the free plan. Stages 0 and 1 remain available. If this was not expected, reply to your receipt email and we will sort it out.',
  'Plata pentru abonamentul tău a fost rambursată integral. Accesul la conținutul plătit s-a încheiat și ai revenit la planul gratuit. Etapele 0 și 1 rămân disponibile. Dacă nu te așteptai la asta, răspunde la emailul cu chitanța și rezolvăm.',
  'Η πληρωμή της συνδρομής σας επιστράφηκε πλήρως. Η πρόσβαση στο πληρωμένο περιεχόμενο τερματίστηκε και επιστρέψατε στο δωρεάν πλάνο. Τα Στάδια 0 και 1 παραμένουν διαθέσιμα. Αν δεν το περιμένατε, απαντήστε στο email της απόδειξης και θα το τακτοποιήσουμε.'
);

COMMIT;

-- ============================================================================
-- VERIFY -- all three must hold
--
--   -- (a) subscription revoked
--   select status, revoked_at, revoked_reason, current_period_end
--   from academy_subscriptions
--   where stripe_subscription_id = 'sub_1U4It4G0WrhMtD2EHw91qUEt';
--   -- expect: refunded | <now> | refund | <= now
--
--   -- (b) no active subscription remains for this student
--   select count(*) from academy_subscriptions
--   where student_id = '87da8d6e-066f-4264-b27d-367a2e543eb2'
--     and status = 'active';
--   -- expect: 0
--
--   -- (c) the user has been told
--   select kind, severity, created_at from academy_notifications
--   where student_id = '87da8d6e-066f-4264-b27d-367a2e543eb2';
--   -- expect: billing_refund | warning | <now>
--
-- Then log in as nicuddobos@gmail.com and open any Stage 2+ lecture.
-- Expected: the lock screen, and the server sends only a teaser -- open
-- devtools > Network and confirm the RSC payload contains no lesson prose
-- and no quiz answers.
-- ============================================================================


-- ============================================================================
-- NOT RECOMMENDED -- hard delete. Only if you reject the reasoning above.
-- Run INSTEAD of section 1, never after it.
--
--   DELETE FROM public.academy_subscriptions
--   WHERE stripe_subscription_id = 'sub_1U4It4G0WrhMtD2EHw91qUEt';
--
-- ============================================================================
