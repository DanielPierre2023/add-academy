'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * A progress-sync entry from the client.
 *
 * NOTE: `completed`, `quizScore` and `completedAt` are intentionally NOT part
 * of this type. Those values are authoritative and are written ONLY by the
 * server (see /api/quiz, which computes and records the validated score).
 * Accepting them here would let a client forge completion/scores via the
 * service-role write path, bypassing the read-only RLS on academy_progress.
 */
interface ProgressEntry {
  lectureId: string;
  timeSpent: number;
}

/**
 * Server action to sync NON-AUTHORITATIVE progress from client to database.
 *
 * Only `time_spent_seconds` (and `updated_at`) are written. Completion status
 * and quiz scores are owned exclusively by the server-side quiz validator and
 * are never accepted from the client. The upsert deliberately omits the
 * `completed`, `quiz_score` and `completed_at` columns so an existing row's
 * server-written values are preserved on conflict, and a freshly-inserted row
 * falls back to the table defaults (completed = false, quiz_score = null).
 */
export async function syncProgress(entries: ProgressEntry[]): Promise<{ error: string | null }> {
  if (!entries || entries.length === 0) {
    return { error: null };
  }

  // Limit batch size to prevent abuse
  if (entries.length > 100) {
    return { error: 'Too many entries. Maximum 100 per sync.' };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Validate lecture IDs (prevent injection)
    const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    const validEntries = entries.filter((e) =>
      SAFE_ID.test(e.lectureId) &&
      !e.lectureId.includes('..') &&
      e.lectureId.length <= 50
    );

    if (validEntries.length === 0) {
      return { error: null };
    }

    // Only time-spent is client-supplied and safe to persist. Completion and
    // quiz scores are written server-side (see /api/quiz) and are omitted here
    // so they cannot be overwritten by forged client input.
    const rows = validEntries.map((p) => ({
      student_id: user.id,
      lecture_id: p.lectureId,
      time_spent_seconds: Math.min(Math.max(Math.round(p.timeSpent), 0), 86400), // clamp 0..24h
      updated_at: new Date().toISOString(),
    }));

    // Use service role to bypass read-only RLS (user already verified above).
    // onConflict updates ONLY the provided columns, preserving server-written
    // completed/quiz_score on existing rows.
    const admin = createServiceRoleClient();
    const { error } = await admin
      .from('academy_progress')
      .upsert(rows, {
        onConflict: 'student_id,lecture_id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('[progress-actions] Sync failed:', error.message);
      return { error: 'Failed to sync progress.' };
    }

    return { error: null };
  } catch (err) {
    console.error('[progress-actions] Unexpected error:', err);
    return { error: 'Server error during sync.' };
  }
}
