-- 009_drop_public_schools_policy.sql
--
-- SECURITY (Critical): remove the leftover public read policy on
-- academy_schools that exposes EVERY column of every verified school —
-- including `invite_code` (a bearer secret) and `contact_email` (PII) — to
-- anon + authenticated callers using the public anon key.
--
-- Background:
--   * 001_academy_schema.sql created "Public can view verified schools"
--     (FOR SELECT, role public, USING verified = true) over the whole table.
--   * 004_fix_entitlement_rls.sql rebuilt the entitlement model on the
--     assumption that academy_schools is NOT readable by ordinary members
--     (invite_code must stay secret) and introduced the column-safe
--     `academy_schools_public` VIEW for the only fields clients legitimately
--     need. It dropped `authenticated_read_schools` but never removed the 001
--     public policy — and because Postgres OR-s permissive policies, that one
--     policy alone re-opens full-row reads and defeats 004's invariant.
--
-- Exploit it prevents: harvest invite_code for every verified school via the
-- anon key, then self-enroll (org_role='student', tier='school') to unlock the
-- entire paid catalogue for free.
--
-- Safe to run: clients already read verified schools through the
-- academy_schools_public view (created in 004, granted to anon/authenticated).
-- Idempotent and transactional.

BEGIN;

DROP POLICY IF EXISTS "Public can view verified schools" ON public.academy_schools;

COMMIT;

-- Post-check (optional): the only SELECT policies left on academy_schools
-- should be "School contacts can view own school" (owner) and
-- "Admins can manage schools" (admin). Verify with:
--   SELECT polname FROM pg_policies WHERE tablename = 'academy_schools';
--
-- NOTE: any invite codes issued while the public policy was live may have been
-- readable with the anon key. Consider rotating invite codes for any already-
-- verified schools (there were none in production at the time of writing).
