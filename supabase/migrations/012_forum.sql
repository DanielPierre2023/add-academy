-- 012_forum.sql
--
-- Community forum: categories -> threads -> posts, with upvotes, reports, and
-- moderation. Model decisions:
--   * Post-moderation: content is visible immediately; admins hide/delete after
--     the fact. `hidden` rows disappear for everyone except their author and admins.
--   * Any logged-in user may post (free + paid + org), unless muted/banned.
--   * Upvotes only (one per user per post); denormalised count on the post.
--   * Threads live under a general category OR are attached to a lecture
--     (lecture_id) for the per-lecture discussion tab.
--
-- Security model:
--   * is_academy_admin(auth.uid()) is the root of trust for every admin action.
--   * is_forum_muted(auth.uid()) blocks posting for muted/banned users.
--   * Authors may edit their own NON-hidden posts but can never change `hidden`
--     (they cannot un-hide a moderated post — enforced by USING + WITH CHECK).
--   * Reports and mutes are admin-only to read.
--
-- Idempotent and transactional.

BEGIN;

-- ── Helper: is this user currently muted/banned from the forum? ──
CREATE OR REPLACE FUNCTION public.is_forum_muted(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_forum_mutes m
    WHERE m.user_id = p_user
      AND (m.muted_until IS NULL OR m.muted_until > now())
  );
$$;

-- ── Tables ──
CREATE TABLE IF NOT EXISTS public.academy_forum_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name_en text NOT NULL, name_ro text NOT NULL, name_el text NOT NULL,
  desc_en text, desc_ro text, desc_el text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_forum_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.academy_forum_categories(id) ON DELETE SET NULL,
  lecture_id  text,                        -- set for per-lecture discussion threads
  author_id   uuid NOT NULL REFERENCES public.academy_students(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  pinned      boolean NOT NULL DEFAULT false,
  locked      boolean NOT NULL DEFAULT false,
  hidden      boolean NOT NULL DEFAULT false,
  post_count  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  last_post_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON public.academy_forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_lecture  ON public.academy_forum_threads(lecture_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_activity ON public.academy_forum_threads(last_post_at DESC);

CREATE TABLE IF NOT EXISTS public.academy_forum_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES public.academy_forum_threads(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.academy_students(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  upvotes     int NOT NULL DEFAULT 0,
  edited      boolean NOT NULL DEFAULT false,
  hidden      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON public.academy_forum_posts(thread_id, created_at);

CREATE TABLE IF NOT EXISTS public.academy_forum_post_votes (
  post_id uuid NOT NULL REFERENCES public.academy_forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.academy_students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.academy_forum_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.academy_forum_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.academy_students(id) ON DELETE CASCADE,
  reason      text CHECK (reason IS NULL OR char_length(reason) <= 500),
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_forum_reports_open ON public.academy_forum_reports(resolved, created_at);

CREATE TABLE IF NOT EXISTS public.academy_forum_mutes (
  user_id     uuid PRIMARY KEY REFERENCES public.academy_students(id) ON DELETE CASCADE,
  muted_until timestamptz,                 -- NULL = permanent ban
  reason      text,
  created_by  uuid REFERENCES public.academy_students(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Denormalisation triggers (counts + activity) ──
CREATE OR REPLACE FUNCTION public.forum_post_after_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.academy_forum_threads
    SET post_count = post_count + 1, last_post_at = now(), updated_at = now()
    WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.forum_post_after_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.academy_forum_threads
    SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = OLD.thread_id;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.forum_vote_after_ins() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.academy_forum_posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.forum_vote_after_del() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.academy_forum_posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_forum_post_ins ON public.academy_forum_posts;
CREATE TRIGGER trg_forum_post_ins AFTER INSERT ON public.academy_forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_post_after_ins();
DROP TRIGGER IF EXISTS trg_forum_post_del ON public.academy_forum_posts;
CREATE TRIGGER trg_forum_post_del AFTER DELETE ON public.academy_forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_post_after_del();
DROP TRIGGER IF EXISTS trg_forum_vote_ins ON public.academy_forum_post_votes;
CREATE TRIGGER trg_forum_vote_ins AFTER INSERT ON public.academy_forum_post_votes
  FOR EACH ROW EXECUTE FUNCTION public.forum_vote_after_ins();
DROP TRIGGER IF EXISTS trg_forum_vote_del ON public.academy_forum_post_votes;
CREATE TRIGGER trg_forum_vote_del AFTER DELETE ON public.academy_forum_post_votes
  FOR EACH ROW EXECUTE FUNCTION public.forum_vote_after_del();

-- ── Row-level security ──
ALTER TABLE public.academy_forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_forum_threads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_forum_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_forum_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_forum_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_forum_mutes      ENABLE ROW LEVEL SECURITY;

-- categories: everyone signed-in reads; admin manages
DROP POLICY IF EXISTS forum_categories_read ON public.academy_forum_categories;
CREATE POLICY forum_categories_read ON public.academy_forum_categories
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS forum_categories_admin ON public.academy_forum_categories;
CREATE POLICY forum_categories_admin ON public.academy_forum_categories
  FOR ALL TO authenticated
  USING (public.is_academy_admin(auth.uid())) WITH CHECK (public.is_academy_admin(auth.uid()));

-- threads: visible unless hidden (author + admin still see); any non-muted user creates; admin moderates
DROP POLICY IF EXISTS forum_threads_read ON public.academy_forum_threads;
CREATE POLICY forum_threads_read ON public.academy_forum_threads
  FOR SELECT TO authenticated
  USING (hidden = false OR author_id = auth.uid() OR public.is_academy_admin(auth.uid()));
DROP POLICY IF EXISTS forum_threads_insert ON public.academy_forum_threads;
CREATE POLICY forum_threads_insert ON public.academy_forum_threads
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND NOT public.is_forum_muted(auth.uid()));
DROP POLICY IF EXISTS forum_threads_admin_update ON public.academy_forum_threads;
CREATE POLICY forum_threads_admin_update ON public.academy_forum_threads
  FOR UPDATE TO authenticated
  USING (public.is_academy_admin(auth.uid())) WITH CHECK (public.is_academy_admin(auth.uid()));
DROP POLICY IF EXISTS forum_threads_admin_delete ON public.academy_forum_threads;
CREATE POLICY forum_threads_admin_delete ON public.academy_forum_threads
  FOR DELETE TO authenticated USING (public.is_academy_admin(auth.uid()));

-- posts: visible unless hidden; any non-muted user replies to an open thread;
-- authors edit their own non-hidden post (never toggling hidden); admin moderates
DROP POLICY IF EXISTS forum_posts_read ON public.academy_forum_posts;
CREATE POLICY forum_posts_read ON public.academy_forum_posts
  FOR SELECT TO authenticated
  USING (hidden = false OR author_id = auth.uid() OR public.is_academy_admin(auth.uid()));
DROP POLICY IF EXISTS forum_posts_insert ON public.academy_forum_posts;
CREATE POLICY forum_posts_insert ON public.academy_forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND NOT public.is_forum_muted(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.academy_forum_threads t
      WHERE t.id = thread_id AND t.locked = false AND t.hidden = false
    )
  );
DROP POLICY IF EXISTS forum_posts_author_update ON public.academy_forum_posts;
CREATE POLICY forum_posts_author_update ON public.academy_forum_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND hidden = false)
  WITH CHECK (author_id = auth.uid() AND hidden = false);
DROP POLICY IF EXISTS forum_posts_admin_update ON public.academy_forum_posts;
CREATE POLICY forum_posts_admin_update ON public.academy_forum_posts
  FOR UPDATE TO authenticated
  USING (public.is_academy_admin(auth.uid())) WITH CHECK (public.is_academy_admin(auth.uid()));
DROP POLICY IF EXISTS forum_posts_admin_delete ON public.academy_forum_posts;
CREATE POLICY forum_posts_admin_delete ON public.academy_forum_posts
  FOR DELETE TO authenticated USING (public.is_academy_admin(auth.uid()));

-- votes: users manage only their own vote row; reads scoped to own (counts come
-- from posts.upvotes)
DROP POLICY IF EXISTS forum_votes_read_own ON public.academy_forum_post_votes;
CREATE POLICY forum_votes_read_own ON public.academy_forum_post_votes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS forum_votes_insert_own ON public.academy_forum_post_votes;
CREATE POLICY forum_votes_insert_own ON public.academy_forum_post_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT public.is_forum_muted(auth.uid()));
DROP POLICY IF EXISTS forum_votes_delete_own ON public.academy_forum_post_votes;
CREATE POLICY forum_votes_delete_own ON public.academy_forum_post_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- reports: any user files a report about a post; only admins read/resolve
DROP POLICY IF EXISTS forum_reports_insert ON public.academy_forum_reports;
CREATE POLICY forum_reports_insert ON public.academy_forum_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS forum_reports_admin_read ON public.academy_forum_reports;
CREATE POLICY forum_reports_admin_read ON public.academy_forum_reports
  FOR SELECT TO authenticated USING (public.is_academy_admin(auth.uid()));
DROP POLICY IF EXISTS forum_reports_admin_update ON public.academy_forum_reports;
CREATE POLICY forum_reports_admin_update ON public.academy_forum_reports
  FOR UPDATE TO authenticated
  USING (public.is_academy_admin(auth.uid())) WITH CHECK (public.is_academy_admin(auth.uid()));

-- mutes: the user can see their own mute; admins manage all
DROP POLICY IF EXISTS forum_mutes_read ON public.academy_forum_mutes;
CREATE POLICY forum_mutes_read ON public.academy_forum_mutes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_academy_admin(auth.uid()));
DROP POLICY IF EXISTS forum_mutes_admin ON public.academy_forum_mutes;
CREATE POLICY forum_mutes_admin ON public.academy_forum_mutes
  FOR ALL TO authenticated
  USING (public.is_academy_admin(auth.uid())) WITH CHECK (public.is_academy_admin(auth.uid()));

-- ── Privilege grants (RLS still governs row access) ──
GRANT SELECT ON public.academy_forum_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_forum_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_forum_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.academy_forum_post_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_forum_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_forum_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_forum_mutes TO authenticated;
REVOKE ALL ON FUNCTION public.is_forum_muted(uuid) FROM anon;

-- ── Seed the general categories ──
INSERT INTO public.academy_forum_categories (slug, name_en, name_ro, name_el, desc_en, desc_ro, desc_el, sort_order)
VALUES
  ('general', 'General', 'General', 'Γενικά',
   'Anything about the course and learning LLMs.', 'Orice despre curs și învățarea LLM-urilor.', 'Οτιδήποτε σχετικά με το μάθημα και τα LLM.', 1),
  ('course-help', 'Course Help', 'Ajutor Curs', 'Βοήθεια Μαθήματος',
   'Stuck on a lecture, exercise, or concept? Ask here.', 'Blocat la o lecție, exercițiu sau concept? Întreabă aici.', 'Κολλήσατε σε μάθημα ή έννοια; Ρωτήστε εδώ.', 2),
  ('show-and-tell', 'Show & Tell', 'Prezintă & Povestește', 'Παρουσίασε & Μοιράσου',
   'Share what you built with your NeuralForge LLM or SaaS kits.', 'Arată ce ai construit cu LLM-ul NeuralForge sau kiturile SaaS.', 'Μοιραστείτε τι φτιάξατε με το NeuralForge ή τα SaaS kits.', 3),
  ('feedback', 'Feedback', 'Feedback', 'Σχόλια',
   'Ideas and suggestions to improve the platform.', 'Idei și sugestii pentru a îmbunătăți platforma.', 'Ιδέες και προτάσεις για βελτίωση της πλατφόρμας.', 4)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
