-- ═══════════════════════════════════════════════════════
-- 003 — Security hardening (follow-ups to 002)
--
-- 1. Fix the org_role CHECK constraint: `IN (..., NULL)` never
--    matches NULL in SQL, so the NULL literal was dead. Rewrite it
--    with an explicit IS NULL branch.
-- 2. Add WITH CHECK to the academy_ai_conversations UPDATE policy
--    so a row cannot be re-owned to a different student_id.
-- ═══════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────
-- 1. Correct org_role CHECK constraint on academy_students
-- ───────────────────────────────────────────────────────

ALTER TABLE academy_students
  DROP CONSTRAINT IF EXISTS academy_students_org_role_check;

ALTER TABLE academy_students
  ADD CONSTRAINT academy_students_org_role_check
  CHECK (org_role IS NULL OR org_role IN ('admin', 'teacher', 'student'));


-- ───────────────────────────────────────────────────────
-- 2. Add WITH CHECK to academy_ai_conversations UPDATE
--    Prevents a user from updating a row so that student_id
--    points at another user (row re-ownership).
-- ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Students can update own conversations" ON academy_ai_conversations;

CREATE POLICY "Students can update own conversations"
  ON academy_ai_conversations FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
