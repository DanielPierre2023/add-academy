-- 011_leaderboard_optin.sql
--
-- Opt-in, aliased leaderboard.
--
-- Privacy model: a learner does NOT appear on the leaderboard unless they
-- explicitly opt in, and they appear only under a self-chosen alias — never
-- their real name or email. Ranking is computed from SERVER-VERIFIED progress
-- (academy_progress), not the client-side XP store, so it can't be spoofed.
--
-- The two new columns are covered by the existing "students_update_own_safe_fields"
-- UPDATE policy (which locks only tier/email/school_id/org_role/stripe_customer_id
-- and lets the owner edit everything else), so a user can set their own opt-in
-- and alias — but cannot read other students' rows (no broad SELECT policy).
-- Cross-user reads happen ONLY through the SECURITY DEFINER function below,
-- which exposes alias + score and nothing else.
--
-- Idempotent and transactional.

BEGIN;

ALTER TABLE public.academy_students
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leaderboard_alias  text;

-- Keep aliases short and sane.
ALTER TABLE public.academy_students
  DROP CONSTRAINT IF EXISTS academy_students_leaderboard_alias_len;
ALTER TABLE public.academy_students
  ADD CONSTRAINT academy_students_leaderboard_alias_len
  CHECK (leaderboard_alias IS NULL OR char_length(leaderboard_alias) <= 32);

-- Ranked board from server-verified progress. Returns alias + aggregate score
-- only (no id, name, or email). `is_me` lets the UI highlight the caller's row
-- without revealing anyone else's identity.
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit int DEFAULT 100)
RETURNS TABLE (
  rank bigint,
  alias text,
  lectures_completed int,
  xp int,
  is_me boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scored AS (
    SELECT
      st.id AS student_id,
      COALESCE(NULLIF(btrim(st.leaderboard_alias), ''), 'Learner') AS alias,
      COUNT(*) FILTER (WHERE p.completed)::int AS lectures_completed,
      (
        COUNT(*) FILTER (WHERE p.completed) * 50
        + COALESCE(SUM(COALESCE(array_length(p.code_blocks_run, 1), 0)), 0) * 10
        + COUNT(*) FILTER (WHERE p.quiz_attempted) * 25
      )::int AS xp
    FROM public.academy_students st
    LEFT JOIN public.academy_progress p ON p.student_id = st.id
    WHERE st.leaderboard_opt_in = true
    GROUP BY st.id, st.leaderboard_alias
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY xp DESC, lectures_completed DESC) AS rank,
    alias,
    lectures_completed,
    xp,
    (student_id = auth.uid()) AS is_me
  FROM scored
  ORDER BY xp DESC, lectures_completed DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;

-- Logged-in users only (leaderboard is an authenticated feature).
REVOKE ALL ON FUNCTION public.get_leaderboard(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO authenticated;

COMMIT;
