'use client';

import { createClient } from '@/lib/supabase/client';
import { useAcademyStore } from './academy-store';
import { syncProgress } from './progress-actions';

/**
 * Bi-directional sync between the Zustand/localStorage store and
 * `academy_progress`.
 *
 * Writes go through a server action because RLS makes academy_progress
 * read-only for clients. Only non-authoritative signals are sent — time spent,
 * scroll-to-bottom, code blocks run. `completed` and `quiz_score` are written
 * exclusively by the server (see /api/quiz and completion-actions.ts).
 *
 * W1.1 fixes three silent data-loss bugs that were here:
 *
 *   1. `.filter((p) => p.timeSpent > 60)` — a lecture read in under a minute
 *      was NEVER synced under any circumstance.
 *   2. `if (syncInFlight) return;` DISCARDED a concurrent request instead of
 *      queueing it, so changes made during an in-flight sync were dropped
 *      until some unrelated later change happened to trigger another one.
 *   3. `loadProgressFromSupabase` merged only when `row.completed` was true —
 *      and nothing ever set it — so server progress was never restored.
 */

let syncInFlight = false;
let syncQueued = false;

export async function syncProgressToSupabase(): Promise<void> {
  // Coalesce rather than discard: remember that another sync was asked for
  // and run exactly one more pass when the current one finishes.
  if (syncInFlight) {
    syncQueued = true;
    return;
  }
  syncInFlight = true;

  try {
    do {
      syncQueued = false;

      const state = useAcademyStore.getState();
      const entries = Object.values(state.progress);
      if (entries.length === 0) return;

      // Sync everything with ANY signal. The old 60-second floor silently
      // discarded short lectures and every scroll event that came with them.
      const toSync = entries
        .filter(
          (p) =>
            p.timeSpent > 0 ||
            p.scrolledToBottom ||
            (p.codeBlocksRun?.length ?? 0) > 0
        )
        .map((p) => ({
          lectureId: p.lectureId,
          timeSpent: Math.round(p.timeSpent),
          scrolledToBottom: p.scrolledToBottom === true,
          codeBlocksRun: p.codeBlocksRun?.length ?? 0,
        }));

      if (toSync.length === 0) return;

      // The server action batches at 100; chunk so nothing is silently dropped.
      for (let i = 0; i < toSync.length; i += 100) {
        const result = await syncProgress(toSync.slice(i, i + 100));
        if (result.error) {
          console.warn('[progress-sync] Server sync failed:', result.error);
          return;
        }
      }
    } while (syncQueued);
  } catch (err) {
    console.warn('[progress-sync] Unexpected error:', err);
  } finally {
    syncInFlight = false;
  }
}

/**
 * Load server progress and merge it into local state.
 *
 * Merge rules:
 *   completed   — server wins (it is the only writer, and it never un-sets)
 *   quizScore   — highest of the two
 *   timeSpent   — highest of the two (accumulates on the client)
 *   completedAt — earliest known non-null
 */
export async function loadProgressFromSupabase(userId: string): Promise<void> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('academy_progress')
      .select(
        'lecture_id, completed, quiz_score, time_spent_seconds, completed_at, scrolled_to_bottom'
      )
      .eq('student_id', userId);

    if (error || !data) {
      console.warn('[progress-sync] Failed to load server progress:', error?.message);
      return;
    }

    const state = useAcademyStore.getState();

    for (const row of data) {
      const local = state.progress[row.lecture_id];

      const serverScore = row.quiz_score ?? null;
      const localScore = local?.quizScore ?? null;
      const mergedScore =
        serverScore === null
          ? localScore
          : localScore === null
            ? serverScore
            : Math.max(serverScore, localScore);

      state.updateProgress(row.lecture_id, {
        // Server is authoritative for completion and never revokes it.
        completed: row.completed === true || local?.completed === true,
        quizScore: mergedScore,
        timeSpent: Math.max(row.time_spent_seconds || 0, local?.timeSpent || 0),
        scrolledToBottom: row.scrolled_to_bottom === true || local?.scrolledToBottom === true,
        completedAt: row.completed_at || local?.completedAt || null,
      });
    }
  } catch (err) {
    console.warn('[progress-sync] Unexpected error loading:', err);
  }
}
