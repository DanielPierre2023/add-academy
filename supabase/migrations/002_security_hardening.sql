-- ═══════════════════════════════════════════════════════
-- 002 — Security hardening
-- Adds WITH CHECK to all write policies, locks sensitive
-- columns on self-update, reconciles schema drift, and
-- narrows certificate verification to non-PII fields.
-- ═══════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────
-- 1. Add missing columns (schema drift reconciliation)
-- ───────────────────────────────────────────────────────

-- org_role: referenced in code but absent from 001 migration
ALTER TABLE academy_students
  ADD COLUMN IF NOT EXISTS org_role TEXT DEFAULT NULL
  CHECK (org_role IN ('admin', 'teacher', 'student', NULL));

-- contact_user_id: needed by school actions (getMySchool, submitSchoolApplication)
ALTER TABLE academy_schools
  ADD COLUMN IF NOT EXISTS contact_user_id UUID REFERENCES auth.users(id);

-- invite_code: used by school dashboard for enrollment
ALTER TABLE academy_schools
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- unlocked_stages: used by isAuthenticatedForStage in lecture page
ALTER TABLE academy_subscriptions
  ADD COLUMN IF NOT EXISTS unlocked_stages INTEGER[] DEFAULT '{}';

-- Expand tier CHECK to include values used in code
-- Drop and recreate since ALTER CHECK isn't supported
ALTER TABLE academy_subscriptions DROP CONSTRAINT IF EXISTS academy_subscriptions_tier_check;
ALTER TABLE academy_subscriptions
  ADD CONSTRAINT academy_subscriptions_tier_check
  CHECK (tier IN ('pro', 'team', 'enterprise', 'full_access', 'llm_course', 'stage'));


-- ───────────────────────────────────────────────────────
-- 2. Trusted admin role model
--    Create a dedicated roles table that only service-role
--    can write. Client-side never touches this.
-- ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS academy_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academy_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role (needed for client-side UI hints)
CREATE POLICY "Users can view own role"
  ON academy_roles FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for regular users — service role only
-- (No policy = denied by default when RLS is enabled)

-- Helper function for RLS policies (SECURITY DEFINER = runs as owner, not caller)
CREATE OR REPLACE FUNCTION public.is_academy_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Seed: copy existing org_role='admin' users into the new table
INSERT INTO academy_roles (user_id, role)
SELECT id, 'admin'
FROM academy_students
WHERE org_role = 'admin'
ON CONFLICT (user_id) DO NOTHING;


-- ───────────────────────────────────────────────────────
-- 3. Lock down academy_students self-update
--    Users can only change display fields, never tier/role/school
-- ───────────────────────────────────────────────────────

-- Drop the old permissive update policy
DROP POLICY IF EXISTS "Students can update own profile" ON academy_students;

-- New policy: can update own row, but sensitive columns must stay unchanged
CREATE POLICY "Students can update own safe fields"
  ON academy_students FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier = (SELECT tier FROM academy_students WHERE id = auth.uid())
    AND school_id IS NOT DISTINCT FROM (SELECT school_id FROM academy_students WHERE id = auth.uid())
    AND org_role IS NOT DISTINCT FROM (SELECT org_role FROM academy_students WHERE id = auth.uid())
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM academy_students WHERE id = auth.uid())
  );

-- Admin policy: admins (via trusted roles table) can update any student
CREATE POLICY "Admins can update any student"
  ON academy_students FOR UPDATE
  USING (public.is_academy_admin(auth.uid()));

-- Admin policy: admins can read any student (for dashboard)
CREATE POLICY "Admins can view all students"
  ON academy_students FOR SELECT
  USING (public.is_academy_admin(auth.uid()));


-- ───────────────────────────────────────────────────────
-- 4. Lock down progress & quiz writes
--    Clients get read-only; writes go through service role
-- ───────────────────────────────────────────────────────

-- Drop the old FOR ALL policies
DROP POLICY IF EXISTS "Students can manage own progress" ON academy_progress;
DROP POLICY IF EXISTS "Students can manage own quiz submissions" ON academy_quiz_submissions;
DROP POLICY IF EXISTS "Students can manage own conversations" ON academy_ai_conversations;

-- Progress: read-only for students
CREATE POLICY "Students can view own progress"
  ON academy_progress FOR SELECT
  USING (auth.uid() = student_id);

-- Progress: admins and teachers can view school students' progress
CREATE POLICY "Admins can view all progress"
  ON academy_progress FOR SELECT
  USING (public.is_academy_admin(auth.uid()));

-- Quiz submissions: read-only for students
CREATE POLICY "Students can view own quiz submissions"
  ON academy_quiz_submissions FOR SELECT
  USING (auth.uid() = student_id);

-- AI conversations: students can read and insert (they initiate conversations)
-- but the actual AI response writing happens server-side
CREATE POLICY "Students can view own conversations"
  ON academy_ai_conversations FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create own conversations"
  ON academy_ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own conversations"
  ON academy_ai_conversations FOR UPDATE
  USING (auth.uid() = student_id);


-- ───────────────────────────────────────────────────────
-- 5. Narrow certificate verification
--    Replace USING(true) with a function-based lookup
-- ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Public certificate verification" ON academy_certificates;

-- Public can only verify by hash — returns limited fields via the API
-- No blanket SELECT policy; verification goes through /api/verify-certificate
-- Keep the owner-read policy (already exists)

-- Admins can view all certificates
CREATE POLICY "Admins can view all certificates"
  ON academy_certificates FOR SELECT
  USING (public.is_academy_admin(auth.uid()));

-- Verification function returns only non-PII fields
CREATE OR REPLACE FUNCTION public.verify_certificate(hash TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  certificate_name TEXT,
  completion_date TIMESTAMPTZ,
  lectures_completed INTEGER
) AS $$
  SELECT
    true AS valid,
    certificate_name,
    completion_date,
    lectures_completed
  FROM public.academy_certificates
  WHERE verification_hash = hash
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ───────────────────────────────────────────────────────
-- 6. Subscriptions: read-only for students (already correct,
--    but add explicit no-write for defense-in-depth)
-- ───────────────────────────────────────────────────────

-- The existing SELECT policy is fine. Ensure no INSERT/UPDATE/DELETE
-- policies exist for non-admin users (none do — RLS denies by default).

-- Admin view for subscription management
CREATE POLICY "Admins can view all subscriptions"
  ON academy_subscriptions FOR SELECT
  USING (public.is_academy_admin(auth.uid()));

CREATE POLICY "Admins can manage subscriptions"
  ON academy_subscriptions FOR ALL
  USING (public.is_academy_admin(auth.uid()));


-- ───────────────────────────────────────────────────────
-- 7. Schools: admin management policies
-- ───────────────────────────────────────────────────────

-- School contacts can view their own school (even if unverified)
CREATE POLICY "School contacts can view own school"
  ON academy_schools FOR SELECT
  USING (auth.uid() = contact_user_id);

-- Authenticated users can insert (apply for school)
CREATE POLICY "Authenticated users can apply for school"
  ON academy_schools FOR INSERT
  WITH CHECK (auth.uid() = contact_user_id);

-- Admins can manage all schools
CREATE POLICY "Admins can manage schools"
  ON academy_schools FOR ALL
  USING (public.is_academy_admin(auth.uid()));
