-- ============================================================================
-- 007 — Certificate issuance (W1.2)
--
-- WHY
-- ---
-- academy_certificates, the owner-read RLS policy, the verify_certificate()
-- RPC and the /api/verify-certificate route all already exist — but NOTHING
-- in the application ever INSERTED a certificate row. Verified in production:
-- the table is empty, so every public verification returns "invalid", and the
-- certificate a learner "downloads" was drawn entirely client-side from
-- localStorage with a name they typed themselves. It was therefore both
-- unverifiable and trivially forgeable.
--
-- This migration adds the small amount of schema the issuance path needs:
--   1. a course_name column, so the credential records WHAT was completed
--      separately from WHO completed it (certificate_name = recipient);
--   2. idempotency — one certificate per student per course;
--   3. a student_id index for the owner-read RLS policy;
--   4. verify_certificate() re-issued to also return course_name.
--
-- Issuance itself is done by a server action using the service-role key
-- (src/lib/certificates/actions.ts). There is deliberately NO INSERT policy
-- for anon/authenticated: a certificate can only be minted by server code that
-- has first re-checked completion against the database. That is the anti-forgery
-- guarantee.
--
-- SAFE TO RE-RUN: every statement is idempotent. Transactional.
-- NOTE ON CONCURRENTLY: the table is empty (0 certificates ever issued), so a
-- plain CREATE INDEX takes a negligible lock. CONCURRENTLY (which cannot run
-- inside this transaction) is unnecessary here.
-- ============================================================================

BEGIN;

-- 1. Record the course the certificate attests to. Single-course platform
--    today, but naming it explicitly future-proofs multi-course and makes the
--    public verification meaningful ("X completed <course>").
ALTER TABLE public.academy_certificates
  ADD COLUMN IF NOT EXISTS course_name TEXT;

-- Backfill any legacy rows (there are none in production, but keep it correct).
UPDATE public.academy_certificates
  SET course_name = 'Building Large Language Models from Scratch'
  WHERE course_name IS NULL;

-- 2. Idempotency: a student earns at most one certificate per course. The
--    server action relies on this to make re-issue a no-op instead of a
--    duplicate. Partial-safe: only enforced once course_name is set.
CREATE UNIQUE INDEX IF NOT EXISTS idx_academy_cert_student_course
  ON public.academy_certificates (student_id, course_name);

-- 3. The owner-read RLS policy filters on student_id (auth.uid() = student_id).
--    Index it so that filter is not a sequential scan as the table grows.
CREATE INDEX IF NOT EXISTS idx_academy_cert_student
  ON public.academy_certificates (student_id);

-- 4. Re-issue the public verification function to also return course_name.
--    The return signature changes, so DROP first (CREATE OR REPLACE cannot
--    alter OUT columns). search_path is pinned inline (004 had pinned the old
--    signature; dropping it discarded that setting). Still SECURITY DEFINER +
--    STABLE, still returns only non-PII, holder-shareable fields.
DROP FUNCTION IF EXISTS public.verify_certificate(TEXT);

CREATE FUNCTION public.verify_certificate(hash TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  certificate_name TEXT,
  course_name TEXT,
  completion_date TIMESTAMPTZ,
  lectures_completed INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    true AS valid,
    c.certificate_name,
    c.course_name,
    c.completion_date,
    c.lectures_completed
  FROM public.academy_certificates c
  WHERE c.verification_hash = hash
  LIMIT 1;
$$;

-- verify_certificate IS the public verification endpoint — keep it callable by
-- anon (its default PUBLIC grant survives the DROP/CREATE; make it explicit).
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

COMMIT;

-- ---------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
--   -- column present:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'academy_certificates' AND column_name = 'course_name';
--   -- function returns 5 columns incl course_name:
--   SELECT * FROM public.verify_certificate('nonexistent');   -- 0 rows, no error
--   -- indexes present:
--   SELECT indexname FROM pg_indexes WHERE tablename = 'academy_certificates';
-- ---------------------------------------------------------------------------
