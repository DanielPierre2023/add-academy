-- 010_ai_tutor_usage.sql
--
-- SECURITY (Medium): make the AI-tutor daily quota tamper-proof.
--
-- The quota was computed by counting today's user messages inside the caller's
-- own academy_ai_conversations rows. But students hold an UPDATE policy on that
-- table (003), so a user could PATCH their own rows to strip today's messages
-- and reset their counter — then keep prompting, uncapped (only the per-IP
-- burst limit remained). That is metered third-party (Gemini) spend a user can
-- reset at will.
--
-- Fix: a dedicated usage ledger that clients cannot read or write. RLS is
-- enabled with NO policies, so only the service role (which bypasses RLS) can
-- touch it. The API route increments it via bump_ai_tutor_usage() on each
-- successful generation and reads it to enforce the cap.
--
-- Idempotent and transactional.

BEGIN;

CREATE TABLE IF NOT EXISTS public.academy_ai_usage (
  student_id uuid NOT NULL,
  day        date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, day)
);

ALTER TABLE public.academy_ai_usage ENABLE ROW LEVEL SECURITY;

-- No policies on purpose: anon/authenticated get zero access; only the service
-- role (RLS-exempt) reads/writes this table.
REVOKE ALL ON public.academy_ai_usage FROM anon, authenticated;

-- Atomic per-day increment; returns the new running count for the day.
CREATE OR REPLACE FUNCTION public.bump_ai_tutor_usage(p_student uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.academy_ai_usage (student_id, day, count, updated_at)
  VALUES (p_student, (now() AT TIME ZONE 'utc')::date, 1, now())
  ON CONFLICT (student_id, day)
  DO UPDATE SET count = academy_ai_usage.count + 1, updated_at = now()
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

-- Only the service role may call it (the route uses the service-role client).
REVOKE ALL ON FUNCTION public.bump_ai_tutor_usage(uuid) FROM anon, authenticated;

COMMIT;
