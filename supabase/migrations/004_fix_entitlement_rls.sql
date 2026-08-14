-- ============================================================================
-- 004_fix_entitlement_rls.sql
--
-- CRITICAL: closes a full paywall bypass.
--
-- Root cause
-- ----------
-- academy_students has five PERMISSIVE UPDATE policies. Postgres OR's
-- permissive policies together. One of them --
--
--   students_update_own : USING (auth.uid() = id), WITH CHECK = NULL
--
-- -- has no WITH CHECK, so Postgres falls back to using its USING expression
-- as the check. That permits ANY column change to your own row, which OR's
-- away the carefully-written "Students can update own safe fields" policy
-- sitting next to it (the one that locks tier/school_id/org_role/
-- stripe_customer_id).
--
-- Exploit chain, using only the anon key that ships in the JS bundle:
--
--   1. POST /rest/v1/academy_schools
--      {"name":"x","contact_user_id":"<uid>","verified":true,"max_students":999999}
--      -- the school INSERT policy only constrained contact_user_id.
--
--   2. PATCH /rest/v1/academy_students?id=eq.<uid>
--      {"school_id":"<id from step 1>"}
--      -- permitted by students_update_own.
--
-- The server-side gate in src/app/(academy)/lectures/[id]/page.tsx then read
-- `if (student?.school_id) return true;` and rendered the full paid catalogue.
--
-- This migration closes all three links in that chain and adds the RPC the
-- application needs to keep working once academy_schools stops being
-- world-readable to authenticated users.
--
-- Verified against production before writing: 0 rows in academy_schools and
-- 0 students with a non-null school_id, so this has almost certainly not been
-- exploited. Re-check before applying:
--
--   SELECT id, school_id, tier FROM academy_students
--   WHERE school_id IS NOT NULL OR tier <> 'free';
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Remove the policy that voids the safe-fields lock.
--    It is pure redundancy over "Students can update own safe fields" -- its
--    only observable effect is to disable that policy's WITH CHECK.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "students_update_own" ON public.academy_students;

-- ---------------------------------------------------------------------------
-- 2. Recreate the safe-fields policy, additionally locking `email`.
--    email feeds isInternalEmail()/isComped() in src/lib/admin/metrics.ts,
--    so leaving it writable makes revenue reporting user-manipulable.
--
--    Editable by design: display_name, full_name, avatar_url,
--    preferred_language, theme, last_active_at.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can update own safe fields" ON public.academy_students;

CREATE POLICY "students_update_own_safe_fields"
  ON public.academy_students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier = (
      SELECT s.tier FROM public.academy_students s WHERE s.id = auth.uid()
    )
    AND email = (
      SELECT s.email FROM public.academy_students s WHERE s.id = auth.uid()
    )
    AND school_id IS NOT DISTINCT FROM (
      SELECT s.school_id FROM public.academy_students s WHERE s.id = auth.uid()
    )
    AND org_role IS NOT DISTINCT FROM (
      SELECT s.org_role FROM public.academy_students s WHERE s.id = auth.uid()
    )
    AND stripe_customer_id IS NOT DISTINCT FROM (
      SELECT s.stripe_customer_id FROM public.academy_students s WHERE s.id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. service_insert_students was INSERT ... WITH CHECK (true) granted to
--    `public` -- i.e. any caller could insert arbitrary student rows.
--    Student rows are created by the handle_academy_signup trigger, which is
--    SECURITY DEFINER and therefore bypasses RLS entirely. The policy is
--    unnecessary. (Verified: the trigger hardcodes school_id=NULL,
--    org_role=NULL, tier='free' and ignores user metadata -- signup is safe.)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "service_insert_students" ON public.academy_students;

-- ---------------------------------------------------------------------------
-- 4. School INSERT constrained only contact_user_id, leaving verified,
--    max_students and invite_code attacker-controlled. Column DEFAULTs are
--    not access control -- an attacker supplies explicit values.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can apply for school" ON public.academy_schools;

CREATE POLICY "authenticated_apply_for_school"
  ON public.academy_schools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = contact_user_id
    AND verified IS NOT TRUE
    AND invite_code IS NULL
    AND COALESCE(max_students, 0) <= 20
    AND COALESCE(current_students, 0) = 0
  );

-- ---------------------------------------------------------------------------
-- 5. authenticated_read_schools was USING (auth.role() = 'authenticated'),
--    exposing EVERY school row to EVERY logged-in user. RLS is row-level, not
--    column-level, so that included invite_code (a bearer secret that
--    enrollInSchool treats as proof of membership) and contact_email.
--
--    Replaced with a column-limited view over verified schools only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_read_schools" ON public.academy_schools;

DROP VIEW IF EXISTS public.academy_schools_public;

CREATE VIEW public.academy_schools_public
WITH (security_invoker = false) AS
  SELECT id, name, country, city, slug, logo_url, verified
  FROM public.academy_schools
  WHERE verified IS TRUE;

REVOKE ALL ON public.academy_schools_public FROM PUBLIC;
GRANT SELECT ON public.academy_schools_public TO anon, authenticated;

COMMENT ON VIEW public.academy_schools_public IS
  'Safe projection of verified schools. Never exposes invite_code or contact_email. '
  'security_invoker = false so it can read past academy_schools RLS while still '
  'restricting the visible columns.';

-- ---------------------------------------------------------------------------
-- 6. Application support.
--
--    Once academy_schools is no longer readable by ordinary members, three
--    code paths would silently break -- and two of them would FAIL OPEN:
--
--      * lectures/[id]/page.tsx  : needs school.verified for the entitlement gate
--      * auth-context.tsx        : needs school.verified for isOrgUser
--      * api/ai-tutor/route.ts   : reads ai_tutor_daily_limit; on null it
--                                  returns { allowed: true } -> UNLIMITED
--                                  Gemini spend for every school user.
--
--    One SECURITY DEFINER function serves all three. It exposes only the
--    caller's own school context and never returns invite_code.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_school_context()
RETURNS TABLE (
  school_id             uuid,
  verified              boolean,
  ai_tutor_daily_limit  integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    sc.id,
    COALESCE(sc.verified, false),
    COALESCE(sc.ai_tutor_daily_limit, 50)
  FROM public.academy_students st
  JOIN public.academy_schools  sc ON sc.id = st.school_id
  WHERE st.id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.current_school_context() IS
  'Returns the calling user''s own school context (id, verified, AI daily limit). '
  'Zero rows when the user has no school. Never exposes invite_code or contact_email.';

REVOKE ALL ON FUNCTION public.current_school_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_school_context() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Pin search_path on SECURITY DEFINER functions.
--    is_academy_admin is the root of trust for every admin RLS policy in 002;
--    a caller-controlled search_path under it is a privilege-escalation
--    primitive. (7 advisor warnings: function_search_path_mutable.)
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.is_academy_admin(uuid)                   SET search_path = public, pg_temp;
ALTER FUNCTION public.is_platform_admin()                      SET search_path = public, pg_temp;
ALTER FUNCTION public.is_platform_admin(uuid)                  SET search_path = public, pg_temp;
ALTER FUNCTION public.verify_certificate(text)                 SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_academy_signup()                  SET search_path = public, pg_temp;
ALTER FUNCTION public.current_admin_school_id()                SET search_path = public, pg_temp;
ALTER FUNCTION public.academy_increment_school_seats(uuid)     SET search_path = public, pg_temp;
ALTER FUNCTION public.update_academy_reports_updated_at()      SET search_path = public, pg_temp;
ALTER FUNCTION public.update_academy_announcements_updated_at() SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 8. Revoke anon EXECUTE on internal SECURITY DEFINER functions.
--    (11 advisor warnings: anon_security_definer_function_executable.)
--    verify_certificate stays public -- it IS the public verification endpoint.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_academy_admin(uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin()                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_admin_school_id()            FROM anon;
REVOKE EXECUTE ON FUNCTION public.academy_increment_school_seats(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_school_students(uuid)      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_academy_signup()              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                    FROM anon, authenticated;

COMMIT;

-- ============================================================================
-- POST-APPLY VERIFICATION -- run these as an ordinary authenticated user.
--
--   -- must return 0 rows
--   select * from academy_schools;
--
--   -- must return only safe columns, verified schools only
--   select * from academy_schools_public;
--
--   -- must return 0 rows updated
--   update academy_students set tier = 'full_access' where id = auth.uid();
--   update academy_students set school_id = gen_random_uuid() where id = auth.uid();
--
--   -- must be rejected
--   insert into academy_schools (name, contact_user_id, verified)
--   values ('x', auth.uid(), true);
--
--   -- must still succeed (display name is editable by design)
--   update academy_students set display_name = 'New Name' where id = auth.uid();
-- ============================================================================
