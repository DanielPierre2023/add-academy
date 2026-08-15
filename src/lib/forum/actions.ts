'use server';

/**
 * Community forum — application layer.
 *
 * Security model (mirrors supabase/migrations/012_forum.sql):
 *   - READS that must show OTHER users' display names use the SERVICE ROLE
 *     client (ordinary sessions have no broad SELECT on academy_students), and
 *     this file MANUALLY re-enforces row visibility: a non-admin viewer never
 *     sees a hidden thread/post unless they authored it.
 *   - WRITES always use the USER SESSION client so the database RLS enforces
 *     author_id = auth.uid(), mute, locked-thread and admin checks. Admin
 *     actions additionally verify is_academy_admin() server-side first.
 *   - A student's email is NEVER read or returned by this module.
 *
 * Every action calls auth.getUser() and returns a plain serialisable object;
 * nothing throws to the client (errors are caught and returned as { error }).
 */

import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';

/* ─── Types ────────────────────────────────────────────── */

export interface ForumCategory {
  id: string;
  slug: string;
  name_en: string;
  name_ro: string;
  name_el: string;
  desc_en: string | null;
  desc_ro: string | null;
  desc_el: string | null;
  sortOrder: number;
  threadCount: number;
}

export interface ForumThreadSummary {
  id: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  postCount: number;
  createdAt: string;
  lastPostAt: string;
  authorId: string;
  authorName: string;
  categoryId: string | null;
  lectureId: string | null;
}

export interface ForumPostView {
  id: string;
  threadId: string;
  body: string;
  upvotes: number;
  edited: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  hasUpvoted: boolean;
  isMine: boolean;
}

export interface ForumThreadDetail {
  id: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  postCount: number;
  createdAt: string;
  lastPostAt: string;
  authorId: string;
  authorName: string;
  categoryId: string | null;
  lectureId: string | null;
  posts: ForumPostView[];
}

export interface ForumMuteInfo {
  userId: string;
  mutedUntil: string | null; // null = permanent
  reason: string | null;
  createdAt: string;
}

export interface ForumReportView {
  id: string;
  postId: string;
  reason: string | null;
  resolved: boolean;
  createdAt: string;
  reporterId: string;
  reporterName: string;
  postBody: string;
  postHidden: boolean;
  postAuthorId: string;
  postAuthorName: string;
  threadId: string;
}

type Admin = ReturnType<typeof createServiceRoleClient>;

/* ─── Internal helpers ─────────────────────────────────── */

const TITLE_MAX = 200;
const BODY_MAX = 10000;
const REASON_MAX = 500;

/** Resolve display names for a set of student ids. Never exposes email. */
async function displayNames(
  admin: Admin,
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data } = await admin
    .from('academy_students')
    .select('id, display_name, full_name')
    .in('id', unique);

  for (const row of data ?? []) {
    const name =
      (row.display_name as string | null)?.trim() ||
      (row.full_name as string | null)?.trim() ||
      'Member';
    map.set(row.id as string, name);
  }
  // Fill any gaps so the UI always has a label.
  for (const id of unique) if (!map.has(id)) map.set(id, 'Member');
  return map;
}

/** Is the given user a platform admin? Uses the trusted RPC. */
async function isAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_academy_admin', {
    check_user_id: userId,
  });
  if (error) return false;
  return data === true;
}

/* ─── Reads ────────────────────────────────────────────── */

/** Categories ordered by sort_order, each with its visible thread count. */
export async function listCategories(): Promise<
  { categories: ForumCategory[]; error: string | null }
> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { categories: [], error: 'Not authenticated' };

    const admin = createServiceRoleClient();

    const { data: cats, error: catErr } = await admin
      .from('academy_forum_categories')
      .select(
        'id, slug, name_en, name_ro, name_el, desc_en, desc_ro, desc_el, sort_order'
      )
      .order('sort_order', { ascending: true });
    if (catErr) return { categories: [], error: catErr.message };

    const categories: ForumCategory[] = [];
    for (const c of cats ?? []) {
      const { count } = await admin
        .from('academy_forum_threads')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', c.id)
        .eq('hidden', false);
      categories.push({
        id: c.id as string,
        slug: c.slug as string,
        name_en: c.name_en as string,
        name_ro: c.name_ro as string,
        name_el: c.name_el as string,
        desc_en: (c.desc_en as string | null) ?? null,
        desc_ro: (c.desc_ro as string | null) ?? null,
        desc_el: (c.desc_el as string | null) ?? null,
        sortOrder: Number(c.sort_order ?? 0),
        threadCount: count ?? 0,
      });
    }
    return { categories, error: null };
  } catch (err) {
    console.error('[forum] listCategories:', err);
    return { categories: [], error: 'Server error' };
  }
}

/**
 * Visible threads for a category or a lecture (pinned first, then last_post_at
 * desc). Hidden threads are excluded unless the viewer authored them (admins
 * see all). One of categoryId / lectureId should be provided; if neither is,
 * the most recent threads across all categories are returned.
 */
export async function listThreads(opts: {
  categoryId?: string;
  categorySlug?: string;
  lectureId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ threads: ForumThreadSummary[]; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { threads: [], error: 'Not authenticated' };

    const admin = createServiceRoleClient();
    const viewerIsAdmin = await isAdmin(supabase, user.id);

    let categoryId = opts.categoryId ?? null;
    if (!categoryId && opts.categorySlug) {
      const { data: cat } = await admin
        .from('academy_forum_categories')
        .select('id')
        .eq('slug', opts.categorySlug)
        .maybeSingle();
      categoryId = (cat?.id as string) ?? null;
      if (!categoryId) return { threads: [], error: null };
    }

    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    const offset = Math.max(opts.offset ?? 0, 0);

    let query = admin
      .from('academy_forum_threads')
      .select(
        'id, title, pinned, locked, hidden, post_count, created_at, last_post_at, author_id, category_id, lecture_id'
      )
      .order('pinned', { ascending: false })
      .order('last_post_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (categoryId) query = query.eq('category_id', categoryId);
    if (opts.lectureId) query = query.eq('lecture_id', opts.lectureId);

    const { data: rows, error } = await query;
    if (error) return { threads: [], error: error.message };

    // Manual visibility enforcement mirroring RLS.
    const visible = (rows ?? []).filter(
      (t) =>
        t.hidden === false ||
        t.author_id === user.id ||
        viewerIsAdmin
    );

    const names = await displayNames(
      admin,
      visible.map((t) => t.author_id as string)
    );

    const threads: ForumThreadSummary[] = visible.map((t) => ({
      id: t.id as string,
      title: t.title as string,
      pinned: Boolean(t.pinned),
      locked: Boolean(t.locked),
      hidden: Boolean(t.hidden),
      postCount: Number(t.post_count ?? 0),
      createdAt: t.created_at as string,
      lastPostAt: t.last_post_at as string,
      authorId: t.author_id as string,
      authorName: names.get(t.author_id as string) ?? 'Member',
      categoryId: (t.category_id as string | null) ?? null,
      lectureId: (t.lecture_id as string | null) ?? null,
    }));

    return { threads, error: null };
  } catch (err) {
    console.error('[forum] listThreads:', err);
    return { threads: [], error: 'Server error' };
  }
}

/**
 * A single thread with its visible posts. Non-admins never receive hidden
 * posts (except their own); a hidden thread is only returned to its author or
 * an admin.
 */
export async function getThread(
  threadId: string
): Promise<{ thread: ForumThreadDetail | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { thread: null, error: 'Not authenticated' };

    const admin = createServiceRoleClient();
    const viewerIsAdmin = await isAdmin(supabase, user.id);

    const { data: t, error: tErr } = await admin
      .from('academy_forum_threads')
      .select(
        'id, title, pinned, locked, hidden, post_count, created_at, last_post_at, author_id, category_id, lecture_id'
      )
      .eq('id', threadId)
      .maybeSingle();
    if (tErr) return { thread: null, error: tErr.message };
    if (!t) return { thread: null, error: 'Not found' };

    // Hidden thread visibility.
    if (t.hidden && t.author_id !== user.id && !viewerIsAdmin) {
      return { thread: null, error: 'Not found' };
    }

    const { data: postRows, error: pErr } = await admin
      .from('academy_forum_posts')
      .select(
        'id, thread_id, body, upvotes, edited, hidden, created_at, updated_at, author_id'
      )
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (pErr) return { thread: null, error: pErr.message };

    const visiblePosts = (postRows ?? []).filter(
      (p) =>
        p.hidden === false || p.author_id === user.id || viewerIsAdmin
    );

    // Which of these posts has the caller upvoted? (RLS: users read own votes.)
    const postIds = visiblePosts.map((p) => p.id as string);
    const myVotes = new Set<string>();
    if (postIds.length > 0) {
      const { data: votes } = await supabase
        .from('academy_forum_post_votes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);
      for (const v of votes ?? []) myVotes.add(v.post_id as string);
    }

    const names = await displayNames(admin, [
      t.author_id as string,
      ...visiblePosts.map((p) => p.author_id as string),
    ]);

    const posts: ForumPostView[] = visiblePosts.map((p) => ({
      id: p.id as string,
      threadId: p.thread_id as string,
      body: p.body as string,
      upvotes: Number(p.upvotes ?? 0),
      edited: Boolean(p.edited),
      hidden: Boolean(p.hidden),
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string,
      authorId: p.author_id as string,
      authorName: names.get(p.author_id as string) ?? 'Member',
      hasUpvoted: myVotes.has(p.id as string),
      isMine: p.author_id === user.id,
    }));

    const thread: ForumThreadDetail = {
      id: t.id as string,
      title: t.title as string,
      pinned: Boolean(t.pinned),
      locked: Boolean(t.locked),
      hidden: Boolean(t.hidden),
      postCount: Number(t.post_count ?? 0),
      createdAt: t.created_at as string,
      lastPostAt: t.last_post_at as string,
      authorId: t.author_id as string,
      authorName: names.get(t.author_id as string) ?? 'Member',
      categoryId: (t.category_id as string | null) ?? null,
      lectureId: (t.lecture_id as string | null) ?? null,
      posts,
    };
    return { thread, error: null };
  } catch (err) {
    console.error('[forum] getThread:', err);
    return { thread: null, error: 'Server error' };
  }
}

/* ─── Writes (user session — RLS enforced) ─────────────── */

/**
 * Create a thread and its first post. The thread belongs to a category OR a
 * lecture. RLS enforces author_id = auth.uid() and blocks muted users.
 */
export async function createThread(input: {
  categoryId?: string;
  categorySlug?: string;
  lectureId?: string;
  title: string;
  body: string;
}): Promise<{ threadId: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { threadId: null, error: 'Not authenticated' };

    const title = (input.title ?? '').trim();
    const body = (input.body ?? '').trim();
    if (title.length < 1 || title.length > TITLE_MAX) {
      return { threadId: null, error: 'invalid_title' };
    }
    if (body.length < 1 || body.length > BODY_MAX) {
      return { threadId: null, error: 'invalid_body' };
    }

    let categoryId = input.categoryId ?? null;
    if (!categoryId && input.categorySlug) {
      // Resolve slug with an anon-safe read (categories are world-readable).
      const { data: cat } = await supabase
        .from('academy_forum_categories')
        .select('id')
        .eq('slug', input.categorySlug)
        .maybeSingle();
      categoryId = (cat?.id as string) ?? null;
    }

    if (!categoryId && !input.lectureId) {
      return { threadId: null, error: 'missing_target' };
    }

    const { data: thread, error: tErr } = await supabase
      .from('academy_forum_threads')
      .insert({
        author_id: user.id,
        category_id: categoryId,
        lecture_id: input.lectureId ?? null,
        title,
      })
      .select('id')
      .single();

    if (tErr || !thread) {
      // RLS rejects muted users at INSERT.
      return { threadId: null, error: tErr?.message ?? 'insert_failed' };
    }

    const { error: pErr } = await supabase.from('academy_forum_posts').insert({
      thread_id: thread.id,
      author_id: user.id,
      body,
    });
    if (pErr) {
      // First post failed — remove the empty thread so we don't orphan it.
      await supabase.from('academy_forum_threads').delete().eq('id', thread.id);
      return { threadId: null, error: pErr.message };
    }

    return { threadId: thread.id as string, error: null };
  } catch (err) {
    console.error('[forum] createThread:', err);
    return { threadId: null, error: 'Server error' };
  }
}

/** Reply to a thread. RLS enforces mute + locked + not-hidden thread. */
export async function createPost(
  threadId: string,
  body: string
): Promise<{ postId: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { postId: null, error: 'Not authenticated' };

    const clean = (body ?? '').trim();
    if (clean.length < 1 || clean.length > BODY_MAX) {
      return { postId: null, error: 'invalid_body' };
    }

    const { data, error } = await supabase
      .from('academy_forum_posts')
      .insert({ thread_id: threadId, author_id: user.id, body: clean })
      .select('id')
      .single();

    if (error || !data) {
      return { postId: null, error: error?.message ?? 'insert_failed' };
    }
    return { postId: data.id as string, error: null };
  } catch (err) {
    console.error('[forum] createPost:', err);
    return { postId: null, error: 'Server error' };
  }
}

/** Edit own post. RLS restricts to author + non-hidden. */
export async function editPost(
  postId: string,
  body: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const clean = (body ?? '').trim();
    if (clean.length < 1 || clean.length > BODY_MAX) {
      return { error: 'invalid_body' };
    }

    const { error } = await supabase
      .from('academy_forum_posts')
      .update({ body: clean, edited: true, updated_at: new Date().toISOString() })
      .eq('id', postId)
      .eq('author_id', user.id);

    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] editPost:', err);
    return { error: 'Server error' };
  }
}

/** Toggle the caller's single upvote on a post. Triggers keep the count. */
export async function toggleUpvote(
  postId: string
): Promise<{ upvoted: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { upvoted: false, error: 'Not authenticated' };

    const { data: existing } = await supabase
      .from('academy_forum_post_votes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('academy_forum_post_votes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      if (error) return { upvoted: true, error: error.message };
      return { upvoted: false, error: null };
    }

    const { error } = await supabase
      .from('academy_forum_post_votes')
      .insert({ post_id: postId, user_id: user.id });
    if (error) return { upvoted: false, error: error.message };
    return { upvoted: true, error: null };
  } catch (err) {
    console.error('[forum] toggleUpvote:', err);
    return { upvoted: false, error: 'Server error' };
  }
}

/** File a report about a post. */
export async function reportPost(
  postId: string,
  reason: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const clean = (reason ?? '').trim().slice(0, REASON_MAX);

    const { error } = await supabase.from('academy_forum_reports').insert({
      post_id: postId,
      reporter_id: user.id,
      reason: clean || null,
    });
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] reportPost:', err);
    return { error: 'Server error' };
  }
}

/** The caller's active mute (or null). */
export async function getMyForumMute(): Promise<{
  mute: ForumMuteInfo | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { mute: null, error: 'Not authenticated' };

    const { data } = await supabase
      .from('academy_forum_mutes')
      .select('user_id, muted_until, reason, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) return { mute: null, error: null };

    const until = data.muted_until as string | null;
    const active = until === null || new Date(until) > new Date();
    if (!active) return { mute: null, error: null };

    return {
      mute: {
        userId: data.user_id as string,
        mutedUntil: until,
        reason: (data.reason as string | null) ?? null,
        createdAt: data.created_at as string,
      },
      error: null,
    };
  } catch (err) {
    console.error('[forum] getMyForumMute:', err);
    return { mute: null, error: 'Server error' };
  }
}

/* ─── Admin actions (verify admin, then user-session write) ─── */

async function requireAdmin(): Promise<
  | { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; userId: string }
  | { error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  if (!(await isAdmin(supabase, user.id))) return { error: 'Forbidden' };
  return { supabase, userId: user.id };
}

export async function setThreadFlags(
  threadId: string,
  flags: { pinned?: boolean; locked?: boolean; hidden?: boolean }
): Promise<{ error: string | null }> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { error: ctx.error };

    const update: Record<string, boolean | string> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof flags.pinned === 'boolean') update.pinned = flags.pinned;
    if (typeof flags.locked === 'boolean') update.locked = flags.locked;
    if (typeof flags.hidden === 'boolean') update.hidden = flags.hidden;

    const { error } = await ctx.supabase
      .from('academy_forum_threads')
      .update(update)
      .eq('id', threadId);
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] setThreadFlags:', err);
    return { error: 'Server error' };
  }
}

export async function setPostHidden(
  postId: string,
  hidden: boolean
): Promise<{ error: string | null }> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { error: ctx.error };

    const { error } = await ctx.supabase
      .from('academy_forum_posts')
      .update({ hidden, updated_at: new Date().toISOString() })
      .eq('id', postId);
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] setPostHidden:', err);
    return { error: 'Server error' };
  }
}

export async function deletePost(
  postId: string
): Promise<{ error: string | null }> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { error: ctx.error };

    const { error } = await ctx.supabase
      .from('academy_forum_posts')
      .delete()
      .eq('id', postId);
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] deletePost:', err);
    return { error: 'Server error' };
  }
}

export async function deleteThread(
  threadId: string
): Promise<{ error: string | null }> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { error: ctx.error };

    const { error } = await ctx.supabase
      .from('academy_forum_threads')
      .delete()
      .eq('id', threadId);
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] deleteThread:', err);
    return { error: 'Server error' };
  }
}

/** Open reports first, each with the reported post body + author. */
export async function listReports(): Promise<{
  reports: ForumReportView[];
  error: string | null;
}> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { reports: [], error: ctx.error };

    const admin = createServiceRoleClient();

    const { data: rows, error } = await admin
      .from('academy_forum_reports')
      .select('id, post_id, reporter_id, reason, resolved, created_at')
      .order('resolved', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return { reports: [], error: error.message };

    const postIds = [...new Set((rows ?? []).map((r) => r.post_id as string))];
    const postMap = new Map<
      string,
      { body: string; hidden: boolean; authorId: string; threadId: string }
    >();
    if (postIds.length > 0) {
      const { data: posts } = await admin
        .from('academy_forum_posts')
        .select('id, body, hidden, author_id, thread_id')
        .in('id', postIds);
      for (const p of posts ?? []) {
        postMap.set(p.id as string, {
          body: p.body as string,
          hidden: Boolean(p.hidden),
          authorId: p.author_id as string,
          threadId: p.thread_id as string,
        });
      }
    }

    const nameIds = [
      ...(rows ?? []).map((r) => r.reporter_id as string),
      ...[...postMap.values()].map((p) => p.authorId),
    ];
    const names = await displayNames(admin, nameIds);

    const reports: ForumReportView[] = (rows ?? []).map((r) => {
      const post = postMap.get(r.post_id as string);
      return {
        id: r.id as string,
        postId: r.post_id as string,
        reason: (r.reason as string | null) ?? null,
        resolved: Boolean(r.resolved),
        createdAt: r.created_at as string,
        reporterId: r.reporter_id as string,
        reporterName: names.get(r.reporter_id as string) ?? 'Member',
        postBody: post?.body ?? '(post deleted)',
        postHidden: post?.hidden ?? false,
        postAuthorId: post?.authorId ?? '',
        postAuthorName: post ? names.get(post.authorId) ?? 'Member' : 'Member',
        threadId: post?.threadId ?? '',
      };
    });

    return { reports, error: null };
  } catch (err) {
    console.error('[forum] listReports:', err);
    return { reports: [], error: 'Server error' };
  }
}

export async function resolveReport(
  reportId: string
): Promise<{ error: string | null }> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { error: ctx.error };

    const { error } = await ctx.supabase
      .from('academy_forum_reports')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', reportId);
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] resolveReport:', err);
    return { error: 'Server error' };
  }
}

export async function muteUser(
  userId: string,
  mutedUntil: string | null,
  reason: string
): Promise<{ error: string | null }> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { error: ctx.error };

    const { error } = await ctx.supabase.from('academy_forum_mutes').upsert(
      {
        user_id: userId,
        muted_until: mutedUntil,
        reason: (reason ?? '').trim().slice(0, REASON_MAX) || null,
        created_by: ctx.userId,
      },
      { onConflict: 'user_id' }
    );
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] muteUser:', err);
    return { error: 'Server error' };
  }
}

export async function unmuteUser(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const ctx = await requireAdmin();
    if ('error' in ctx) return { error: ctx.error };

    const { error } = await ctx.supabase
      .from('academy_forum_mutes')
      .delete()
      .eq('user_id', userId);
    return { error: error ? error.message : null };
  } catch (err) {
    console.error('[forum] unmuteUser:', err);
    return { error: 'Server error' };
  }
}
