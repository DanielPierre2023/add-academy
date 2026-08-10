'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

interface ProgressEntry {
  lectureId: string;
  completed: boolean;
  quizScore: number | null;
  timeSpent: number;
  completedAt: string | null;
}

/**
 * Server action to sync progress from client to database.
 * This bypasses the read-only RLS on academy_progress by running
 * server-side with the authenticated user's session.
 *
 * Validates that the user can only write their own progress.
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
    const validEntries = entries.filter(e =>
      SAFE_ID.test(e.lectureId) &&
      !e.lectureId.includes('..') &&
      e.lectureId.length <= 50
    );

    if (validEntries.length === 0) {
      return { error: null };
    }

    const rows = validEntries.map((p) => ({
      student_id: user.id,
      lecture_id: p.lectureId,
      completed: p.completed,
      quiz_score: p.quizScore,
      time_spent_seconds: Math.min(Math.round(p.timeSpent), 86400), // cap at 24h per lecture
      completed_at: p.completedAt || null,
      updated_at: new Date().toISOString(),
    }));

    // Use service role to bypass read-only RLS (user already verified above)
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
