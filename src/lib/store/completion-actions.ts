'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getLectureIndex } from '@/lib/lectures';

/**
 * W1.1 — server-authoritative lecture completion.
 *
 * THE PROBLEM
 * -----------
 * No code path anywhere wrote `completed = true`. Verified in production:
 * 19 rows in academy_progress, ZERO with completed = true, zero quiz
 * submissions recorded. Consequences, all live:
 *
 *   - progress-sync.ts:85 gated its merge on `row.completed`, which was always
 *     false, so server progress was NEVER restored to a new device.
 *   - school/actions.ts:149 counts `if (p.completed)`, so every teacher
 *     dashboard reported 0 lectures completed for every student, forever.
 *   - certificate/page.tsx read localStorage, so a certificate could be minted
 *     by editing devtools — and was lost by clearing site data.
 *
 * THE CRITERIA — and why
 * ----------------------
 * You did not pick these, so I did. The reasoning matters more than the
 * numbers, because your certificates rest on it:
 *
 *   Lecture WITH a quiz  ->  scrolled to bottom AND server-validated
 *                            quiz_score >= 70
 *   Lecture WITHOUT quiz ->  scrolled to bottom AND time_spent >= the lesser
 *                            of 25% of estimated reading time and 5 minutes
 *
 * I deliberately did NOT make elapsed time a requirement where a quiz exists.
 * Time-on-page is the weakest and most gameable signal available — leaving a
 * tab open satisfies any threshold — so using it to gate a credential mostly
 * measures patience. The quiz score is server-computed in /api/quiz from
 * answers the client never sees, so it is the one signal a learner cannot
 * forge. Where there is no quiz, a low time bar plus scroll is the honest
 * best available, and it is explicitly a weak claim.
 *
 * Every input here is read from the database, never from the request body.
 */

const QUIZ_PASS_THRESHOLD = 70;
const MIN_DWELL_SECONDS = 60;
const MAX_DWELL_REQUIREMENT_SECONDS = 300; // never demand more than 5 minutes

export interface CompletionResult {
  completed: boolean;
  /** Human-readable list of what is still outstanding, for the UI hint. */
  missing: string[];
  error: string | null;
}

export async function evaluateLectureCompletion(
  lectureId: string
): Promise<CompletionResult> {
  const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  if (!lectureId || !SAFE_ID.test(lectureId) || lectureId.length > 50) {
    return { completed: false, missing: [], error: 'Invalid lecture id' };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { completed: false, missing: [], error: 'Not authenticated' };
    }

    const entry = getLectureIndex().lectures.find((l) => l.id === lectureId);
    if (!entry) {
      return { completed: false, missing: [], error: 'Unknown lecture' };
    }

    const admin = createServiceRoleClient();

    const { data: row, error: readErr } = await admin
      .from('academy_progress')
      .select('completed, completed_at, scrolled_to_bottom, time_spent_seconds, quiz_score')
      .eq('student_id', user.id)
      .eq('lecture_id', lectureId)
      .maybeSingle();

    if (readErr) {
      console.error('[completion] read failed:', readErr.message);
      return { completed: false, missing: [], error: 'Could not read progress' };
    }

    // Idempotent: already complete stays complete. Completion is not revoked
    // by a later worse quiz attempt.
    if (row?.completed) {
      return { completed: true, missing: [], error: null };
    }

    const scrolled = row?.scrolled_to_bottom === true;
    const timeSpent = row?.time_spent_seconds ?? 0;
    const quizScore = row?.quiz_score ?? null;
    const hasQuiz = entry.hasQuiz === true;

    const missing: string[] = [];
    if (!scrolled) missing.push('read_to_end');

    if (hasQuiz) {
      if (quizScore === null) missing.push('take_quiz');
      else if (quizScore < QUIZ_PASS_THRESHOLD) missing.push('quiz_score_70');
    } else {
      const estimated = (entry.estimatedMinutes ?? 10) * 60;
      const required = Math.min(
        Math.max(Math.round(estimated * 0.25), MIN_DWELL_SECONDS),
        MAX_DWELL_REQUIREMENT_SECONDS
      );
      if (timeSpent < required) missing.push('spend_more_time');
    }

    if (missing.length > 0) {
      return { completed: false, missing, error: null };
    }

    const nowIso = new Date().toISOString();
    const { error: writeErr } = await admin
      .from('academy_progress')
      .upsert(
        {
          student_id: user.id,
          lecture_id: lectureId,
          completed: true,
          completed_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'student_id,lecture_id', ignoreDuplicates: false }
      );

    if (writeErr) {
      console.error('[completion] write failed:', writeErr.message);
      return { completed: false, missing: [], error: 'Could not save completion' };
    }

    return { completed: true, missing: [], error: null };
  } catch (err) {
    console.error('[completion] unexpected error:', err);
    return { completed: false, missing: [], error: 'Server error' };
  }
}

/**
 * Record that the learner reached the end of the lecture body, then
 * re-evaluate completion. `scrolled_to_bottom` is a client observation, but it
 * is monotonic (never un-set) and on its own grants nothing.
 */
export async function markScrolledToBottom(lectureId: string): Promise<CompletionResult> {
  const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  if (!lectureId || !SAFE_ID.test(lectureId) || lectureId.length > 50) {
    return { completed: false, missing: [], error: 'Invalid lecture id' };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { completed: false, missing: [], error: 'Not authenticated' };

    const admin = createServiceRoleClient();
    const { error } = await admin.from('academy_progress').upsert(
      {
        student_id: user.id,
        lecture_id: lectureId,
        scrolled_to_bottom: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,lecture_id', ignoreDuplicates: false }
    );

    if (error) {
      console.error('[completion] scroll write failed:', error.message);
      return { completed: false, missing: [], error: 'Could not save progress' };
    }
  } catch (err) {
    console.error('[completion] scroll unexpected error:', err);
    return { completed: false, missing: [], error: 'Server error' };
  }

  return evaluateLectureCompletion(lectureId);
}
