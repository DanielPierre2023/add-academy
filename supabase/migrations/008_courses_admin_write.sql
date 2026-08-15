-- ============================================================================
-- 008 — academy_courses admin write policy (W4.6)
--
-- WHY: academy_courses has RLS enabled but NO write policy, so every admin
-- course mutation (create/edit/reorder/deactivate) from the admin dashboard is
-- silently denied by RLS and fails with no error surfaced to the user.
--
-- This adds a PERMISSIVE FOR ALL policy for platform admins. Because RLS
-- policies are OR-ed, any existing public/authenticated SELECT policy on
-- academy_courses is untouched — this only ADDS admin write (and read) access.
--
-- SAFE TO RE-RUN (idempotent). Transactional.
--
-- NOTE — deliberately NOT included here (need live-DB inspection to do safely,
-- flagged for follow-up):
--   * reconciling the unmigrated tables (academy_courses, playground_usage,
--     vip_remembered_ips, ...) into migration DDL for reviewability;
--   * the missing school-staff (teacher/admin) SELECT policies — these must be
--     scoped to the caller's own school and are easy to get wrong; I will not
--     guess at RLS that could widen access.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS academy_courses_admin_write ON public.academy_courses;

CREATE POLICY academy_courses_admin_write ON public.academy_courses
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

COMMIT;

-- POST-APPLY VERIFICATION (run as a platform admin):
--   INSERT INTO academy_courses (slug, name, description, category, is_active, sort_order)
--     VALUES ('test','Test','desc','general',true,999);   -- should succeed
--   DELETE FROM academy_courses WHERE slug = 'test';
